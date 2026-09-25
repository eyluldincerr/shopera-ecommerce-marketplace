using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Domain.Constants;
using Shopera.Features.Cart.DTOs.Requests;
using Shopera.Features.Cart.Exceptions;
using Shopera.Features.Cart.Services;
using Shopera.Features.Orders.DTOs.Requests;
using Shopera.Features.Orders.Services;
using Shopera.Tests.Support;
using Shopera.Domain.Entities;
using Shopera.Features.Orders.Models;

namespace Shopera.Tests;

public sealed class CommerceIntegrationTests
{
    [Fact]
    public async Task CartAndCheckout_PreserveOwnershipSnapshotsAndStock()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);

        var cartService = new CartService(database.Context);
        var cart = await cartService.AddItemAsync(
            20,
            new AddCartItemRequest { VariantId = 1000, Quantity = 2 });

        Assert.Single(cart.Items);
        Assert.Equal(99.98m, cart.TotalAmount);
        Assert.Equal("EUR", cart.CurrencyCode);
        Assert.Equal(100, cart.Items[0].ProductId);
        Assert.Equal(30, cart.Items[0].StoreId);
        Assert.Equal("/api/product-images/500/content", cart.Items[0].ImageUrl);
        Assert.Equal(49.99m, cart.Items[0].UnitPriceAtAdd);
        Assert.Equal(49.99m, cart.Items[0].CurrentUnitPrice);
        Assert.False(cart.Items[0].PriceChanged);

        var notifications = new FakeNotificationService();
        var orders = new OrderService(database.Context, notifications, new CartService(database.Context));
        var order = await orders.CheckoutAsync(20, CheckoutRequest());

        Assert.Equal(OrderStatuses.Pending, order.Status);
        Assert.Equal(2, order.TotalQuantity);
        Assert.Equal(99.98m, order.TotalAmount);
        Assert.Equal(2, notifications.Created.Count);

        var storedVariant = await database.Context.ProductVariants.SingleAsync(x => x.VariantId == 1000);
        var storedCart = await database.Context.Carts.SingleAsync(x => x.BuyerUserId == 20);
        Assert.Equal(3, storedVariant.StockQuantity);
        Assert.Equal(CartStatuses.Converted, storedCart.Status);
        Assert.Empty(await database.Context.Payments.ToListAsync());
        var pendingShipment = await database.Context.Shipments.SingleAsync(x => x.OrderId == order.OrderId);
        Assert.Equal(ShipmentStatuses.Pending, pendingShipment.ShipmentStatus);
        Assert.Null(pendingShipment.CourierName);
        Assert.Null(pendingShipment.TrackingNumber);

        var sellerOrder = await orders.GetSellerOrderAsync(10, order.OrderId);
        Assert.Equal("Test Buyer", sellerOrder.CustomerName);
        Assert.DoesNotContain("@", sellerOrder.CustomerName);

        var buyerOrder = await orders.GetBuyerOrderAsync(20, order.OrderId);
        var buyerItem = Assert.Single(buyerOrder.Items);
        Assert.Equal(100, buyerItem.ProductId);
        Assert.Equal(1000, buyerItem.VariantId);
        Assert.Equal("/api/product-images/500/content", buyerItem.ImageUrl);
        Assert.Equal(OrderStatuses.Pending, Assert.Single(buyerOrder.StatusHistory).NewStatus);
        Assert.NotNull(buyerOrder.Shipment);
        Assert.Equal(ShipmentStatuses.Pending, buyerOrder.Shipment!.ShipmentStatus);
    }


    [Fact]
    public async Task CartRead_ProjectsImageMetadataWithoutTrackingBinaryImageEntity()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(
            20,
            new AddCartItemRequest { VariantId = 1000, Quantity = 1 });

        database.Context.ChangeTracker.Clear();
        var cart = await cartService.GetAsync(20);

        Assert.Equal("/api/product-images/500/content", Assert.Single(cart.Items).ImageUrl);
        Assert.Empty(database.Context.ChangeTracker.Entries<Shopera.Domain.Entities.ProductImage>());
    }

    [Fact]
    public async Task CartQuantityChange_PreservesPriceAtAddAndReportsCurrentPrice()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(
            20,
            new AddCartItemRequest { VariantId = 1000, Quantity = 1 });

        var variant = await database.Context.ProductVariants.SingleAsync(x => x.VariantId == 1000);
        variant.Price = 59.99m;
        await database.Context.SaveChangesAsync();

        var cart = await cartService.UpdateQuantityAsync(
            20,
            1000,
            new UpdateCartItemQuantityRequest { Quantity = 2 });

        var item = Assert.Single(cart.Items);
        Assert.Equal(49.99m, item.UnitPriceAtAdd);
        Assert.Equal(59.99m, item.CurrentUnitPrice);
        Assert.True(item.PriceChanged);
        Assert.Equal(119.98m, item.Subtotal);
        Assert.Equal(119.98m, cart.TotalAmount);
    }

    [Fact]
    public async Task CartAdd_AboveStock_ThrowsTypedConflictWithoutChangingStock()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);

        var exception = await Assert.ThrowsAsync<InsufficientStockException>(() =>
            cartService.AddItemAsync(
                20,
                new AddCartItemRequest { VariantId = 1000, Quantity = 6 }));

        Assert.Equal(1000, exception.VariantId);
        Assert.Equal(6, exception.RequestedQuantity);
        Assert.Equal(5, exception.AvailableStock);
        Assert.Empty(database.Context.CartItems);
        Assert.Equal(5, (await database.Context.ProductVariants.SingleAsync()).StockQuantity);
    }

    [Fact]
    public async Task CartQuantityUpdate_AboveStock_LeavesExistingQuantityUnchanged()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(
            20,
            new AddCartItemRequest { VariantId = 1000, Quantity = 2 });

        var exception = await Assert.ThrowsAsync<InsufficientStockException>(() =>
            cartService.UpdateQuantityAsync(
                20,
                1000,
                new UpdateCartItemQuantityRequest { Quantity = 6 }));

        Assert.Equal(5, exception.AvailableStock);
        Assert.Equal(2, (await database.Context.CartItems.SingleAsync()).Quantity);
        Assert.Equal(5, (await database.Context.ProductVariants.SingleAsync()).StockQuantity);
    }

    [Fact]
    public async Task CartAdd_FromAnotherStore_ThrowsTypedStoreConflict()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var secondSeller = TestData.ActiveSeller(11);
        var secondStore = TestData.ApprovedStore(31, secondSeller.UserId, "Second Store");
        var secondProduct = TestData.Product(101, secondStore.StoreId, 40, name: "Second Product");
        var secondVariant = TestData.Variant(1001, secondProduct.ProductId, "SKU-1001");
        database.Context.AddRange(secondSeller, secondStore, secondProduct, secondVariant);
        await database.Context.SaveChangesAsync();

        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(
            20,
            new AddCartItemRequest { VariantId = 1000, Quantity = 1 });

        var exception = await Assert.ThrowsAsync<CartStoreConflictException>(() =>
            cartService.AddItemAsync(
                20,
                new AddCartItemRequest { VariantId = 1001, Quantity = 1 }));

        Assert.Equal("CART_STORE_CONFLICT", exception.Code);
        Assert.Single(database.Context.CartItems);
    }

    [Fact]
    public async Task Checkout_WithStaleStock_CreatesNoOrderAndDoesNotDecrementStock()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(
            20,
            new AddCartItemRequest { VariantId = 1000, Quantity = 4 });

        var variant = await database.Context.ProductVariants.SingleAsync(x => x.VariantId == 1000);
        variant.StockQuantity = 2;
        await database.Context.SaveChangesAsync();

        var orders = new OrderService(database.Context, new FakeNotificationService(), new CartService(database.Context));
        var exception = await Assert.ThrowsAsync<InsufficientStockException>(() =>
            orders.CheckoutAsync(20, CheckoutRequest()));

        Assert.Equal(1000, exception.VariantId);
        Assert.Equal(4, exception.RequestedQuantity);
        Assert.Equal(2, exception.AvailableStock);
        Assert.Empty(database.Context.CustomerOrders);
        Assert.Equal(2, (await database.Context.ProductVariants.SingleAsync()).StockQuantity);
        Assert.Equal(CartStatuses.Active, (await database.Context.Carts.SingleAsync()).Status);
    }

    [Fact]
    public async Task BuyerCancellation_RestoresStockOnlyWhilePending()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 2
        });

        var orders = new OrderService(database.Context, new FakeNotificationService(), new CartService(database.Context));
        var placed = await orders.CheckoutAsync(20, CheckoutRequest());
        var cancelled = await orders.CancelAsync(
            20,
            placed.OrderId,
            new CancelOrderRequest { Reason = "Changed my mind" });

        Assert.Equal(OrderStatuses.Cancelled, cancelled.Status);
        Assert.Equal(5, (await database.Context.ProductVariants.SingleAsync()).StockQuantity);
        Assert.Equal(2, cancelled.StatusHistory.Count);
        Assert.Equal(OrderStatuses.Cancelled, cancelled.StatusHistory[^1].NewStatus);
        Assert.Equal(
            ShipmentStatuses.Cancelled,
            (await database.Context.Shipments.SingleAsync(x => x.OrderId == placed.OrderId)).ShipmentStatus);

        await Assert.ThrowsAsync<RequestConflictException>(() =>
            orders.CancelAsync(20, placed.OrderId, new CancelOrderRequest()));
    }

    [Fact]
    public async Task Reorder_CancelledOrder_RebuildsRealBackendCartTransactionally()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 2
        });

        var orders = new OrderService(database.Context, new FakeNotificationService(), cartService);
        var placed = await orders.CheckoutAsync(20, CheckoutRequest());
        await orders.CancelAsync(20, placed.OrderId, new CancelOrderRequest());

        var reorderedCart = await orders.ReorderAsync(20, placed.OrderId);

        var item = Assert.Single(reorderedCart.Items);
        Assert.Equal(1000, item.VariantId);
        Assert.Equal(2, item.Quantity);
        Assert.Equal(49.99m, item.CurrentUnitPrice);
        Assert.Equal(CartStatuses.Active, reorderedCart.Status);
    }

    [Fact]
    public async Task Reorder_PendingOrder_IsRejectedWithoutChangingCart()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });

        var orders = new OrderService(database.Context, new FakeNotificationService(), cartService);
        var placed = await orders.CheckoutAsync(20, CheckoutRequest());

        var exception = await Assert.ThrowsAsync<RequestConflictException>(() =>
            orders.ReorderAsync(20, placed.OrderId));

        Assert.Equal("ORDER_REORDER_NOT_ALLOWED", exception.Code);
        Assert.DoesNotContain(database.Context.Carts, cart =>
            cart.BuyerUserId == 20 && cart.Status == CartStatuses.Active);
    }

    [Fact]
    public async Task BuyerArchive_DeliveredOrder_HidesOnlyFromBuyerListAndPreservesHistory()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });

        var orders = new OrderService(
            database.Context,
            new FakeNotificationService(),
            cartService);

        var placed = await orders.CheckoutAsync(20, CheckoutRequest());
        Assert.True(await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Confirmed));
        Assert.True(await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Processing));
        Assert.True(await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Shipped));
        Assert.True(await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Delivered));

        await orders.ArchiveAsync(20, placed.OrderId);

        Assert.Empty(await orders.GetBuyerOrdersAsync(20));

        var buyerDetail = await orders.GetBuyerOrderAsync(20, placed.OrderId);
        Assert.Equal(placed.OrderId, buyerDetail.OrderId);
        Assert.Equal(OrderStatuses.Delivered, buyerDetail.Status);

        var sellerOrders = await orders.GetSellerOrdersAsync(10);
        Assert.Contains(sellerOrders, order => order.OrderId == placed.OrderId);

        var storedOrder = await database.Context.CustomerOrders
            .SingleAsync(order => order.OrderId == placed.OrderId);
        Assert.NotNull(storedOrder.BuyerArchivedDate);
        Assert.NotEmpty(database.Context.OrderItems);
        Assert.NotEmpty(database.Context.OrderStatusHistories);
    }

    [Fact]
    public async Task BuyerArchive_NonDeliveredOrder_IsRejected()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });

        var orders = new OrderService(
            database.Context,
            new FakeNotificationService(),
            cartService);

        var placed = await orders.CheckoutAsync(20, CheckoutRequest());

        var exception = await Assert.ThrowsAsync<RequestConflictException>(() =>
            orders.ArchiveAsync(20, placed.OrderId));

        Assert.Equal(OrderErrorCodes.ArchiveNotAllowed, exception.Code);
        Assert.Null((await database.Context.CustomerOrders
            .SingleAsync(order => order.OrderId == placed.OrderId))
            .BuyerArchivedDate);
    }

    [Fact]
    public async Task SellerShipment_ShippedAndDeliveredLifecyclePersistsAndBuyerCanSeeIt()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });

        var orders = new OrderService(database.Context, new FakeNotificationService(), cartService);
        var placed = await orders.CheckoutAsync(20, CheckoutRequest());
        Assert.True(await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Confirmed));
        Assert.True(await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Processing));
        Assert.True(await orders.ChangeStatusAsync(
            10,
            placed.OrderId,
            OrderStatuses.Shipped,
            "DHL",
            "TRACK-1000"));

        var shipped = await database.Context.Shipments.SingleAsync(x => x.OrderId == placed.OrderId);
        Assert.Equal(ShipmentStatuses.Shipped, shipped.ShipmentStatus);
        Assert.Equal("DHL", shipped.CourierName);
        Assert.Equal("TRACK-1000", shipped.TrackingNumber);
        Assert.NotNull(shipped.ShippedDate);
        Assert.Null(shipped.DeliveredDate);
        Assert.Equal(placed.ShippingAmount, shipped.ShippingCost);

        var buyerShipped = await orders.GetBuyerOrderAsync(20, placed.OrderId);
        Assert.NotNull(buyerShipped.Shipment);
        Assert.Equal("TRACK-1000", buyerShipped.Shipment!.TrackingNumber);
        Assert.Equal(ShipmentStatuses.Shipped, buyerShipped.Shipment.ShipmentStatus);

        Assert.True(await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Delivered));
        var delivered = await database.Context.Shipments.SingleAsync(x => x.OrderId == placed.OrderId);
        Assert.Equal(ShipmentStatuses.Delivered, delivered.ShipmentStatus);
        Assert.NotNull(delivered.ShippedDate);
        Assert.NotNull(delivered.DeliveredDate);
        Assert.True(delivered.DeliveredDate!.Value >= delivered.ShippedDate!.Value);

        var buyerDelivered = await orders.GetBuyerOrderAsync(20, placed.OrderId);
        Assert.Equal(OrderStatuses.Delivered, buyerDelivered.Status);
        Assert.Equal(ShipmentStatuses.Delivered, buyerDelivered.Shipment!.ShipmentStatus);
    }

    [Fact]
    public async Task SellerShipment_DetailsCanBeCorrectedAfterShipping()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });

        var orders = new OrderService(database.Context, new FakeNotificationService(), cartService);
        var placed = await orders.CheckoutAsync(20, CheckoutRequest());
        await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Confirmed);
        await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Processing);
        await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Shipped, "DHL", "OLD-TRACK");

        var updated = await orders.UpdateShipmentAsync(
            10,
            placed.OrderId,
            new UpdateShipmentRequest
            {
                CourierName = "UPS",
                TrackingNumber = "NEW-TRACK"
            });

        Assert.NotNull(updated.Shipment);
        Assert.Equal("UPS", updated.Shipment!.CourierName);
        Assert.Equal("NEW-TRACK", updated.Shipment.TrackingNumber);
        Assert.Equal(ShipmentStatuses.Shipped, updated.Shipment.ShipmentStatus);
        Assert.Equal("NEW-TRACK", (await database.Context.Shipments.SingleAsync()).TrackingNumber);
    }

    [Fact]
    public async Task SellerShipment_DuplicateTrackingNumberReturnsTypedConflict()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        var orders = new OrderService(database.Context, new FakeNotificationService(), cartService);

        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });
        var first = await orders.CheckoutAsync(20, CheckoutRequest());
        await orders.ChangeStatusAsync(10, first.OrderId, OrderStatuses.Confirmed);
        await orders.ChangeStatusAsync(10, first.OrderId, OrderStatuses.Processing);
        await orders.ChangeStatusAsync(10, first.OrderId, OrderStatuses.Shipped, "DHL", "DUP-TRACK");

        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });
        var second = await orders.CheckoutAsync(20, CheckoutRequest());
        await orders.ChangeStatusAsync(10, second.OrderId, OrderStatuses.Confirmed);
        await orders.ChangeStatusAsync(10, second.OrderId, OrderStatuses.Processing);

        var exception = await Assert.ThrowsAsync<RequestConflictException>(() =>
            orders.ChangeStatusAsync(
                10,
                second.OrderId,
                OrderStatuses.Shipped,
                "UPS",
                "DUP-TRACK"));

        Assert.Equal(OrderErrorCodes.TrackingNumberInUse, exception.Code);
        Assert.Equal(OrderStatuses.Processing,
            (await database.Context.CustomerOrders.SingleAsync(x => x.OrderId == second.OrderId)).OrderStatus);
        Assert.Equal(ShipmentStatuses.Pending,
            (await database.Context.Shipments.SingleAsync(x => x.OrderId == second.OrderId)).ShipmentStatus);
    }

    [Fact]
    public async Task SellerShipment_LegacyOrderWithoutShipmentCreatesShipmentWhenShipped()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        var orders = new OrderService(database.Context, new FakeNotificationService(), cartService);

        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });
        var placed = await orders.CheckoutAsync(20, CheckoutRequest());

        Shipment pending = await database.Context.Shipments.SingleAsync(x => x.OrderId == placed.OrderId);
        database.Context.Shipments.Remove(pending);
        await database.Context.SaveChangesAsync();

        await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Confirmed);
        await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Processing);
        await orders.ChangeStatusAsync(10, placed.OrderId, OrderStatuses.Shipped, "DHL", "LEGACY-TRACK");

        Shipment created = await database.Context.Shipments.SingleAsync(x => x.OrderId == placed.OrderId);
        Assert.Equal(ShipmentStatuses.Shipped, created.ShipmentStatus);
        Assert.Equal("DHL", created.CourierName);
        Assert.Equal("LEGACY-TRACK", created.TrackingNumber);
        Assert.NotNull(created.ShippedDate);
    }

    [Fact]
    public async Task SellerShipment_CannotBeEditedBeforeOrderIsShipped()
    {
        await using var database = new TestDatabase();
        await SeedCommerceAsync(database);
        var cartService = new CartService(database.Context);
        await cartService.AddItemAsync(20, new AddCartItemRequest
        {
            VariantId = 1000,
            Quantity = 1
        });

        var orders = new OrderService(database.Context, new FakeNotificationService(), cartService);
        var placed = await orders.CheckoutAsync(20, CheckoutRequest());

        var exception = await Assert.ThrowsAsync<RequestConflictException>(() =>
            orders.UpdateShipmentAsync(
                10,
                placed.OrderId,
                new UpdateShipmentRequest { CourierName = "DHL" }));

        Assert.Equal("SHIPMENT_NOT_AVAILABLE", exception.Code);
        Assert.Equal(
            ShipmentStatuses.Pending,
            (await database.Context.Shipments.SingleAsync(x => x.OrderId == placed.OrderId)).ShipmentStatus);
    }

    private static async Task SeedCommerceAsync(TestDatabase database)
    {
        var admin = TestData.ActiveAdmin(1);
        var seller = TestData.ActiveSeller(10);
        var buyer = TestData.ActiveBuyer(20, "Test Buyer");
        var store = TestData.ApprovedStore(30, seller.UserId);
        var category = TestData.Category(40, admin.UserId);
        var product = TestData.Product(100, store.StoreId, category.CategoryId);
        var variant = TestData.Variant(1000, product.ProductId, "SKU-1000", stock: 5);
        var image = TestData.PrimaryImage(500, product.ProductId);

        database.Context.AddRange(admin, seller, buyer, store, category, product, variant, image);
        await database.Context.SaveChangesAsync();
    }

    private static CheckoutRequest CheckoutRequest() => new()
    {
        ShippingAddress = Address("SHIPPING"),
        BillingAddress = Address("BILLING")
    };

    private static CheckoutAddressRequest Address(string label) => new()
    {
        RecipientName = "Test Buyer",
        RecipientPhone = "+905551112233",
        StreetAddress = $"1 {label} Street",
        City = "Nicosia",
        PostalCode = "99010",
        Country = "Cyprus"
    };
}
