using System.Data;
using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Cart.Contracts;
using Shopera.Features.Cart.DTOs.Requests;
using Shopera.Features.Cart.DTOs.Responses;
using Shopera.Features.Cart.Exceptions;
using Shopera.Features.Cart.Models;
using Shopera.Features.Coupons.Models;
using Shopera.Features.Notifications.Contracts;
using Shopera.Features.Notifications.DTOs;
using Shopera.Features.Orders.Contracts;
using Shopera.Features.Orders.DTOs.Requests;
using Shopera.Features.Orders.DTOs.Responses;
using Shopera.Features.Orders.Models;

namespace Shopera.Features.Orders.Services;

public sealed class OrderService : IOrderService
{
    private const string Currency = "EUR";
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notifications;
    private readonly ICartService _cartService;

    public OrderService(
        ApplicationDbContext context,
        INotificationService notifications,
        ICartService cartService)
    {
        _context = context;
        _notifications = notifications;
        _cartService = cartService;
    }

    public async Task<OrderDetailsResponse> CheckoutAsync(int buyerUserId, CheckoutRequest request)
    {
        await RequireAccountAsync(buyerUserId, AccountRoles.Buyer);
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        NotificationResponse sellerNotification;
        NotificationResponse buyerNotification;
        int sellerUserId;
        CustomerOrder order;
        Shopera.Domain.Entities.Cart? checkoutCart = null;

        try
        {
            Shopera.Domain.Entities.Cart cart = await _context.Carts
                .Include(x => x.CartItems)
                    .ThenInclude(x => x.ProductVariant)
                        .ThenInclude(x => x.Product)
                .SingleOrDefaultAsync(x =>
                    x.BuyerUserId == buyerUserId && x.Status == CartStatuses.Active)
                ?? throw new KeyNotFoundException("The buyer does not have an active cart.");
            checkoutCart = cart;

            if (cart.CartItems.Count == 0)
            {
                throw new RequestConflictException(
                    OrderErrorCodes.CartEmpty,
                    "Your cart is empty.");
            }

            int[] storeIds = cart.CartItems
                .Select(x => x.ProductVariant.Product.StoreId)
                .Distinct()
                .ToArray();

            if (storeIds.Length != 1)
            {
                throw new RequestConflictException(
                    CartErrorCodes.StoreConflict,
                    "Your cart contains items from more than one store. Clear the cart and add items from one store before checkout.");
            }

            Store store = await _context.Stores.SingleOrDefaultAsync(x => x.StoreId == storeIds[0])
                ?? throw new RequestConflictException(
                    OrderErrorCodes.StoreUnavailable,
                    "The store is no longer available for checkout.");

            if (store.ApprovalStatus != StoreApprovalStatuses.Approved || store.StoreStatus != StoreStatuses.Active)
            {
                throw new RequestConflictException(
                    OrderErrorCodes.StoreUnavailable,
                    "The store is not available for checkout.",
                    new Dictionary<string, object?> { ["storeId"] = store.StoreId });
            }

            foreach (CartItem cartItem in cart.CartItems)
            {
                ProductVariant variant = cartItem.ProductVariant;

                if (cartItem.Quantity < 1 ||
                    variant.Status == ProductVariantStatuses.OutOfStock ||
                    variant.StockQuantity < cartItem.Quantity)
                {
                    throw new InsufficientStockException(
                        variant.VariantId,
                        cartItem.Quantity,
                        Math.Max(variant.StockQuantity, 0));
                }

                if (variant.Status != ProductVariantStatuses.Active ||
                    variant.Product.Status != ProductStatuses.Active)
                {
                    throw new RequestConflictException(
                        CartErrorCodes.VariantUnavailable,
                        "An item or variant in your cart is no longer available.",
                        new Dictionary<string, object?> { ["variantId"] = variant.VariantId });
                }
            }

            decimal subtotal = cart.CartItems.Sum(x => x.ProductVariant.Price * x.Quantity);
            Coupon? coupon = await ResolveCouponAsync(request.CouponCode);
            decimal discount = coupon is null
                ? 0m
                : CouponEvaluator.ValidateAndCalculate(coupon, subtotal, DateTime.UtcNow);
            decimal shipping = 0m;
            decimal total = subtotal - discount + shipping;

            order = new CustomerOrder
            {
                OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..27].ToUpperInvariant(),
                BuyerUserId = buyerUserId,
                StoreId = store.StoreId,
                CouponId = coupon?.CouponId,
                Coupon = coupon,
                OrderDate = DateTime.UtcNow,
                OrderStatus = OrderStatuses.Pending,
                SubtotalAmount = subtotal,
                DiscountAmount = discount,
                ShippingAmount = shipping,
                TotalAmount = total,
                CurrencyCode = Currency
            };

            decimal costOfGoods = 0m;
            foreach (CartItem cartItem in cart.CartItems)
            {
                ProductVariant variant = cartItem.ProductVariant;
                variant.StockQuantity -= cartItem.Quantity;
                if (variant.StockQuantity == 0)
                {
                    variant.Status = ProductVariantStatuses.OutOfStock;
                }

                costOfGoods += variant.CostPrice * cartItem.Quantity;
                order.OrderItems.Add(new OrderItem
                {
                    VariantId = variant.VariantId,
                    ProductNameAtPurchase = variant.Product.ProductName,
                    SkuAtPurchase = variant.Sku,
                    VariantNameAtPurchase = variant.VariantName,
                    Quantity = cartItem.Quantity,
                    UnitPriceAtPurchase = variant.Price,
                    UnitCostAtPurchase = variant.CostPrice
                });
            }

            order.OrderAddresses.Add(MapAddress(request.ShippingAddress, OrderAddressTypes.Shipping));
            order.OrderAddresses.Add(MapAddress(request.BillingAddress, OrderAddressTypes.Billing));
            order.Shipments.Add(new Shipment
            {
                ShipmentStatus = ShipmentStatuses.Pending,
                ShippingCost = shipping
            });
            order.OrderSellerFinancial = new OrderSellerFinancial
            {
                GrossSalesAmount = subtotal,
                SellerDiscountAmount = discount,
                CommissionAmount = 0m,
                RefundAmount = 0m,
                CostOfGoodsAmount = costOfGoods,
                SellerNetAmount = subtotal - discount,
                EstimatedProfitAmount = subtotal - discount - costOfGoods,
                CurrencyCode = Currency,
                CalculatedDate = DateTime.UtcNow
            };
            order.OrderStatusHistories.Add(new OrderStatusHistory
            {
                OldStatus = null,
                NewStatus = OrderStatuses.Pending,
                ChangedDate = DateTime.UtcNow,
                ChangeNote = "Order placed"
            });

            cart.Status = CartStatuses.Converted;
            _context.CustomerOrders.Add(order);
            await _context.SaveChangesAsync();

            sellerUserId = store.SellerUserId;
            sellerNotification = await _notifications.CreateStoredAsync(new CreateNotificationRequest
            {
                RecipientUserId = sellerUserId,
                ActorUserId = buyerUserId,
                NotificationType = NotificationTypes.NewOrder,
                Title = "New order received",
                Message = $"You received order {order.OrderNumber}.",
                RelatedEntityType = RelatedEntityTypes.Order,
                RelatedEntityId = order.OrderId
            });
            buyerNotification = await _notifications.CreateStoredAsync(new CreateNotificationRequest
            {
                RecipientUserId = buyerUserId,
                NotificationType = NotificationTypes.OrderPlaced,
                Title = "Order placed",
                Message = $"Your order {order.OrderNumber} was placed successfully.",
                RelatedEntityType = RelatedEntityTypes.Order,
                RelatedEntityId = order.OrderId
            });

            await transaction.CommitAsync();
        }
        catch (DbUpdateConcurrencyException exception)
        {
            await transaction.RollbackAsync();
            _context.ChangeTracker.Clear();

            ProductVariant? conflictedVariant = exception.Entries
                .Select(entry => entry.Entity)
                .OfType<ProductVariant>()
                .FirstOrDefault();

            if (conflictedVariant is not null)
            {
                int requestedQuantity = checkoutCart?.CartItems
                    .FirstOrDefault(item => item.VariantId == conflictedVariant.VariantId)
                    ?.Quantity ?? 1;

                throw new InsufficientStockException(
                    conflictedVariant.VariantId,
                    requestedQuantity,
                    availableStock: null,
                    innerException: exception);
            }

            throw new RequestConflictException(
                OrderErrorCodes.CheckoutConcurrencyConflict,
                "The cart or inventory changed while the order was being placed. Refresh your cart and try again.",
                innerException: exception);
        }
        catch (DbUpdateException exception)
            when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
        {
            await transaction.RollbackAsync();
            _context.ChangeTracker.Clear();
            throw new RequestConflictException(
                OrderErrorCodes.CheckoutConcurrencyConflict,
                "The cart or order changed while checkout was being completed. Refresh your cart and try again.",
                innerException: exception);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        await Task.WhenAll(
            _notifications.DeliverAsync(sellerUserId, sellerNotification),
            _notifications.DeliverAsync(buyerUserId, buyerNotification));

        return await GetBuyerOrderAsync(buyerUserId, order.OrderId);
    }

    public async Task<IReadOnlyList<OrderSummaryResponse>> GetBuyerOrdersAsync(int buyerUserId)
    {
        await RequireAccountAsync(buyerUserId, AccountRoles.Buyer);
        return (await _context.CustomerOrders.AsNoTracking()
                .Include(x => x.OrderItems)
                .Where(x => x.BuyerUserId == buyerUserId && x.BuyerArchivedDate == null)
                .OrderByDescending(x => x.OrderDate)
                .ToListAsync())
            .Select(MapSummary)
            .ToList();
    }

    public async Task<OrderDetailsResponse> GetBuyerOrderAsync(int buyerUserId, int orderId)
    {
        await RequireAccountAsync(buyerUserId, AccountRoles.Buyer);
        CustomerOrder order = await BuyerOrderQuery().SingleOrDefaultAsync(x =>
                x.OrderId == orderId && x.BuyerUserId == buyerUserId)
            ?? throw new KeyNotFoundException("The order was not found.");
        Dictionary<int, int> primaryImageIds = await GetPrimaryImageIdsAsync(order);
        return MapDetails(order, primaryImageIds);
    }

    public async Task<OrderDetailsResponse> CancelAsync(
        int buyerUserId,
        int orderId,
        CancelOrderRequest request)
    {
        await RequireAccountAsync(buyerUserId, AccountRoles.Buyer);
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        NotificationResponse notification;
        int sellerUserId;
        CustomerOrder order;

        try
        {
            order = await _context.CustomerOrders
                .Include(x => x.OrderItems)
                .Include(x => x.OrderAddresses)
                .Include(x => x.Coupon)
                .Include(x => x.Shipments)
                .SingleOrDefaultAsync(x => x.OrderId == orderId && x.BuyerUserId == buyerUserId)
                ?? throw new KeyNotFoundException("The order was not found.");

            if (order.OrderStatus != OrderStatuses.Pending)
            {
                throw new RequestConflictException(
                    OrderErrorCodes.CancellationNotAllowed,
                    "Only a pending order can be cancelled by the buyer.");
            }

            int[] variantIds = order.OrderItems.Select(x => x.VariantId).ToArray();
            Dictionary<int, ProductVariant> variants = await _context.ProductVariants
                .Where(x => variantIds.Contains(x.VariantId))
                .ToDictionaryAsync(x => x.VariantId);

            foreach (OrderItem item in order.OrderItems)
            {
                if (!variants.TryGetValue(item.VariantId, out ProductVariant? variant))
                {
                    throw new RequestConflictException(
                        OrderErrorCodes.InventoryRestoreFailed,
                        "The order inventory could not be restored safely.");
                }

                variant.StockQuantity += item.Quantity;
                if (variant.Status == ProductVariantStatuses.OutOfStock)
                {
                    variant.Status = ProductVariantStatuses.Active;
                }
            }

            order.OrderStatus = OrderStatuses.Cancelled;
            foreach (Shipment shipment in order.Shipments)
            {
                shipment.ShipmentStatus = ShipmentStatuses.Cancelled;
            }

            order.OrderStatusHistories.Add(new OrderStatusHistory
            {
                OldStatus = OrderStatuses.Pending,
                NewStatus = OrderStatuses.Cancelled,
                ChangedByUserId = buyerUserId,
                ChangedDate = DateTime.UtcNow,
                ChangeNote = string.IsNullOrWhiteSpace(request.Reason)
                    ? "Cancelled by buyer"
                    : $"Cancelled by buyer: {request.Reason.Trim()}"
            });

            sellerUserId = await _context.Stores
                .Where(x => x.StoreId == order.StoreId)
                .Select(x => x.SellerUserId)
                .SingleAsync();
            await _context.SaveChangesAsync();
            notification = await _notifications.CreateStoredAsync(new CreateNotificationRequest
            {
                RecipientUserId = sellerUserId,
                ActorUserId = buyerUserId,
                NotificationType = NotificationTypes.OrderCancelled,
                Title = "Order cancelled",
                Message = $"Order {order.OrderNumber} was cancelled by the buyer.",
                RelatedEntityType = RelatedEntityTypes.Order,
                RelatedEntityId = order.OrderId
            });
            await transaction.CommitAsync();
        }
        catch (DbUpdateConcurrencyException exception)
        {
            await transaction.RollbackAsync();
            _context.ChangeTracker.Clear();
            throw new RequestConflictException(
                OrderErrorCodes.InventoryRestoreFailed,
                "The order inventory changed while cancellation was being processed. Refresh the order and try again.",
                innerException: exception);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        await _notifications.DeliverAsync(sellerUserId, notification);
        return await GetBuyerOrderAsync(buyerUserId, order.OrderId);
    }

    public async Task ArchiveAsync(int buyerUserId, int orderId)
    {
        await RequireAccountAsync(buyerUserId, AccountRoles.Buyer);

        CustomerOrder order = await _context.CustomerOrders
            .SingleOrDefaultAsync(order =>
                order.OrderId == orderId &&
                order.BuyerUserId == buyerUserId)
            ?? throw new KeyNotFoundException("The order was not found.");

        if (order.OrderStatus != OrderStatuses.Delivered)
        {
            throw new RequestConflictException(
                OrderErrorCodes.ArchiveNotAllowed,
                "Only a delivered order can be removed from My Orders.",
                new Dictionary<string, object?>
                {
                    ["orderId"] = order.OrderId,
                    ["status"] = order.OrderStatus
                });
        }

        if (order.BuyerArchivedDate is null)
        {
            order.BuyerArchivedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<CartResponse> ReorderAsync(int buyerUserId, int orderId)
    {
        await RequireAccountAsync(buyerUserId, AccountRoles.Buyer);

        CustomerOrder sourceOrder = await _context.CustomerOrders
            .AsNoTracking()
            .AsSplitQuery()
            .Include(order => order.OrderItems)
            .SingleOrDefaultAsync(order =>
                order.OrderId == orderId && order.BuyerUserId == buyerUserId)
            ?? throw new KeyNotFoundException("The order was not found.");

        if (sourceOrder.OrderStatus is not (OrderStatuses.Delivered or OrderStatuses.Cancelled))
        {
            throw new RequestConflictException(
                OrderErrorCodes.ReorderNotAllowed,
                "Only a delivered or cancelled order can be reordered.",
                new Dictionary<string, object?>
                {
                    ["orderId"] = sourceOrder.OrderId,
                    ["status"] = sourceOrder.OrderStatus
                });
        }

        if (sourceOrder.OrderItems.Count == 0)
        {
            throw new RequestConflictException(
                OrderErrorCodes.ReorderNotAllowed,
                "This order has no items available to reorder.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            CartResponse? cart = null;
            foreach (OrderItem item in sourceOrder.OrderItems.OrderBy(item => item.OrderItemId))
            {
                cart = await _cartService.AddItemAsync(
                    buyerUserId,
                    new AddCartItemRequest
                    {
                        VariantId = item.VariantId,
                        Quantity = item.Quantity
                    });
            }

            await transaction.CommitAsync();
            return cart!;
        }
        catch
        {
            await transaction.RollbackAsync();
            _context.ChangeTracker.Clear();
            throw;
        }
    }

    public async Task<IReadOnlyList<SellerOrderResponse>> GetSellerOrdersAsync(int sellerUserId)
    {
        await RequireAccountAsync(sellerUserId, AccountRoles.Seller);
        return (await SellerOrderQuery()
                .Where(order => _context.Stores.Any(store =>
                    store.StoreId == order.StoreId && store.SellerUserId == sellerUserId))
                .OrderByDescending(order => order.OrderDate)
                .ToListAsync())
            .Select(MapSeller)
            .ToList();
    }

    public async Task<SellerOrderResponse> GetSellerOrderAsync(int sellerUserId, int orderId)
    {
        await RequireAccountAsync(sellerUserId, AccountRoles.Seller);
        CustomerOrder order = await SellerOrderQuery().SingleOrDefaultAsync(order =>
                order.OrderId == orderId && _context.Stores.Any(store =>
                    store.StoreId == order.StoreId && store.SellerUserId == sellerUserId))
            ?? throw new KeyNotFoundException("The order was not found.");
        return MapSeller(order);
    }

    public async Task<bool> ChangeStatusAsync(
        int sellerUserId,
        int orderId,
        string newStatus,
        string? courierName = null,
        string? trackingNumber = null)
    {
        await RequireAccountAsync(sellerUserId, AccountRoles.Seller);
        string normalized = newStatus.Trim().ToUpperInvariant();
        string? normalizedCourier = NormalizeShipmentText(courierName);
        string? normalizedTracking = NormalizeShipmentText(trackingNumber);
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        NotificationResponse? notification = null;
        int buyerUserId = 0;

        try
        {
            CustomerOrder? order = await _context.CustomerOrders
                .Include(order => order.Shipments)
                .Include(order => order.OrderStatusHistories)
                .SingleOrDefaultAsync(order =>
                    order.OrderId == orderId && _context.Stores.Any(store =>
                        store.StoreId == order.StoreId && store.SellerUserId == sellerUserId));

            if (order is null)
            {
                await transaction.RollbackAsync();
                return false;
            }

            if (!IsValidSellerTransition(order.OrderStatus, normalized))
            {
                throw new RequestConflictException(
                    OrderErrorCodes.StatusTransitionNotAllowed,
                    "The requested order status change is not allowed.",
                    new Dictionary<string, object?>
                    {
                        ["currentStatus"] = order.OrderStatus,
                        ["requestedStatus"] = normalized
                    });
            }

            if (normalized == OrderStatuses.Shipped)
            {
                await EnsureTrackingNumberAvailableAsync(order.OrderId, normalizedTracking);
            }

            string previous = order.OrderStatus;
            DateTime changedAt = DateTime.UtcNow;
            order.OrderStatus = normalized;

            if (normalized is OrderStatuses.Shipped or OrderStatuses.Delivered)
            {
                ApplyShipmentStatus(
                    order,
                    normalized,
                    normalizedCourier,
                    normalizedTracking,
                    changedAt);
            }

            order.OrderStatusHistories.Add(new OrderStatusHistory
            {
                OldStatus = previous,
                NewStatus = normalized,
                ChangedByUserId = sellerUserId,
                ChangedDate = changedAt,
                ChangeNote = normalized == OrderStatuses.Shipped
                    ? "Order shipped by seller"
                    : normalized == OrderStatuses.Delivered
                        ? "Order delivered"
                        : "Updated by seller"
            });

            buyerUserId = order.BuyerUserId;
            await _context.SaveChangesAsync();
            notification = await _notifications.CreateStoredAsync(new CreateNotificationRequest
            {
                RecipientUserId = buyerUserId,
                ActorUserId = sellerUserId,
                NotificationType = NotificationTypes.OrderStatusChanged,
                Title = "Order status updated",
                Message = $"Order {order.OrderNumber} is now {normalized}.",
                RelatedEntityType = RelatedEntityTypes.Order,
                RelatedEntityId = order.OrderId
            });
            await transaction.CommitAsync();
        }
        catch (DbUpdateException exception)
            when (normalizedTracking is not null &&
                  DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
        {
            await transaction.RollbackAsync();
            _context.ChangeTracker.Clear();
            throw new RequestConflictException(
                OrderErrorCodes.TrackingNumberInUse,
                "That tracking number is already assigned to another order.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        await _notifications.DeliverAsync(buyerUserId, notification!);
        return true;
    }

    public async Task<SellerOrderResponse> UpdateShipmentAsync(
        int sellerUserId,
        int orderId,
        UpdateShipmentRequest request)
    {
        await RequireAccountAsync(sellerUserId, AccountRoles.Seller);
        string? courierName = NormalizeShipmentText(request.CourierName);
        string? trackingNumber = NormalizeShipmentText(request.TrackingNumber);
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            CustomerOrder order = await _context.CustomerOrders
                .Include(order => order.Shipments)
                .Include(order => order.OrderStatusHistories)
                .SingleOrDefaultAsync(order =>
                    order.OrderId == orderId && _context.Stores.Any(store =>
                        store.StoreId == order.StoreId && store.SellerUserId == sellerUserId))
                ?? throw new KeyNotFoundException("The order was not found.");

            if (order.OrderStatus is not (OrderStatuses.Shipped or OrderStatuses.Delivered))
            {
                throw new RequestConflictException(
                    OrderErrorCodes.ShipmentNotAvailable,
                    "Shipment details can be changed only after the order has been shipped.",
                    new Dictionary<string, object?>
                    {
                        ["orderId"] = order.OrderId,
                        ["status"] = order.OrderStatus
                    });
            }

            await EnsureTrackingNumberAvailableAsync(order.OrderId, trackingNumber);

            DateTime now = DateTime.UtcNow;
            Shipment shipment = GetLatestShipment(order) ?? CreateShipmentForExistingStatus(order, now);
            shipment.CourierName = courierName;
            shipment.TrackingNumber = trackingNumber;
            shipment.ShippingCost = order.ShippingAmount;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException exception)
            when (trackingNumber is not null &&
                  DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
        {
            await transaction.RollbackAsync();
            _context.ChangeTracker.Clear();
            throw new RequestConflictException(
                OrderErrorCodes.TrackingNumberInUse,
                "That tracking number is already assigned to another order.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return await GetSellerOrderAsync(sellerUserId, orderId);
    }

    private static string? NormalizeShipmentText(string? value)
    {
        string? normalized = value?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }

    private async Task EnsureTrackingNumberAvailableAsync(int orderId, string? trackingNumber)
    {
        if (trackingNumber is null)
        {
            return;
        }

        bool inUse = await _context.Shipments.AsNoTracking().AnyAsync(shipment =>
            shipment.OrderId != orderId && shipment.TrackingNumber == trackingNumber);

        if (inUse)
        {
            throw new RequestConflictException(
                OrderErrorCodes.TrackingNumberInUse,
                "That tracking number is already assigned to another order.");
        }
    }

    private static void ApplyShipmentStatus(
        CustomerOrder order,
        string orderStatus,
        string? courierName,
        string? trackingNumber,
        DateTime changedAt)
    {
        Shipment shipment = GetLatestShipment(order) ?? new Shipment
        {
            ShippingCost = order.ShippingAmount
        };

        if (shipment.ShipmentId == 0 && !order.Shipments.Contains(shipment))
        {
            order.Shipments.Add(shipment);
        }

        if (courierName is not null)
        {
            shipment.CourierName = courierName;
        }

        if (trackingNumber is not null)
        {
            shipment.TrackingNumber = trackingNumber;
        }

        shipment.ShippingCost = order.ShippingAmount;

        if (orderStatus == OrderStatuses.Shipped)
        {
            shipment.ShipmentStatus = ShipmentStatuses.Shipped;
            shipment.ShippedDate ??= changedAt;
            shipment.DeliveredDate = null;
            return;
        }

        shipment.ShipmentStatus = ShipmentStatuses.Delivered;
        shipment.ShippedDate ??= order.OrderStatusHistories
            .Where(history => history.NewStatus == OrderStatuses.Shipped)
            .OrderByDescending(history => history.ChangedDate)
            .Select(history => (DateTime?)history.ChangedDate)
            .FirstOrDefault() ?? changedAt;
        shipment.DeliveredDate = changedAt;
    }

    private static Shipment CreateShipmentForExistingStatus(CustomerOrder order, DateTime now)
    {
        var shipment = new Shipment
        {
            ShipmentStatus = order.OrderStatus == OrderStatuses.Delivered
                ? ShipmentStatuses.Delivered
                : ShipmentStatuses.Shipped,
            ShippedDate = order.OrderStatusHistories
                .Where(history => history.NewStatus == OrderStatuses.Shipped)
                .OrderByDescending(history => history.ChangedDate)
                .Select(history => (DateTime?)history.ChangedDate)
                .FirstOrDefault() ?? now,
            DeliveredDate = order.OrderStatus == OrderStatuses.Delivered
                ? order.OrderStatusHistories
                    .Where(history => history.NewStatus == OrderStatuses.Delivered)
                    .OrderByDescending(history => history.ChangedDate)
                    .Select(history => (DateTime?)history.ChangedDate)
                    .FirstOrDefault() ?? now
                : null,
            ShippingCost = order.ShippingAmount
        };

        order.Shipments.Add(shipment);
        return shipment;
    }

    private static Shipment? GetLatestShipment(CustomerOrder order) =>
        order.Shipments
            .OrderByDescending(shipment => shipment.ShipmentId)
            .FirstOrDefault();

    private async Task RequireAccountAsync(int userId, string role)
    {
        bool active = userId > 0 && await _context.UserAccounts.AsNoTracking().AnyAsync(user =>
            user.UserId == userId && user.Role == role && user.AccountStatus == AccountStatuses.Active);
        if (!active)
        {
            throw new UnauthorizedAccessException($"An active {role.ToLowerInvariant()} account is required.");
        }
    }

    private async Task<Coupon?> ResolveCouponAsync(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        string normalized = code.Trim().ToUpperInvariant();
        Coupon coupon = await _context.Coupons
            .SingleOrDefaultAsync(item => item.CouponCode.ToUpper() == normalized)
            ?? throw new RequestConflictException(
                CouponErrorCodes.NotFound,
                "The coupon code was not found.");

        // Status, expiry, minimum subtotal and discount calculation are
        // evaluated by the same CouponEvaluator used by the Buyer preview.
        // UsageLimit is intentionally not enforced yet because the
        // authoritative schema has no COUPON_USAGE table.
        return coupon;
    }

    private static OrderAddress MapAddress(CheckoutAddressRequest source, string type) => new()
    {
        AddressType = type,
        RecipientName = source.RecipientName.Trim(),
        RecipientPhone = source.RecipientPhone?.Trim(),
        StreetAddress = source.StreetAddress.Trim(),
        City = source.City.Trim(),
        StateProvince = source.StateProvince?.Trim(),
        PostalCode = source.PostalCode?.Trim(),
        Country = source.Country.Trim()
    };

    private IQueryable<CustomerOrder> BuyerOrderQuery() =>
        _context.CustomerOrders.AsNoTracking().AsSplitQuery()
            .Include(x => x.Coupon)
            .Include(x => x.OrderItems)
                .ThenInclude(item => item.ProductVariant)
                    .ThenInclude(variant => variant.Product)
            .Include(x => x.OrderAddresses)
            .Include(x => x.OrderStatusHistories)
            .Include(x => x.Shipments);

    private IQueryable<CustomerOrder> SellerOrderQuery() =>
        _context.CustomerOrders.AsNoTracking().AsSplitQuery()
            .Include(x => x.OrderItems)
                .ThenInclude(item => item.ProductVariant)
                    .ThenInclude(variant => variant.Product)
            .Include(x => x.OrderAddresses)
            .Include(x => x.Shipments);

    private static bool IsValidSellerTransition(string current, string next) =>
        (current, next) switch
        {
            (OrderStatuses.Pending, OrderStatuses.Confirmed) => true,
            (OrderStatuses.Confirmed, OrderStatuses.Processing) => true,
            (OrderStatuses.Processing, OrderStatuses.Shipped) => true,
            (OrderStatuses.Shipped, OrderStatuses.Delivered) => true,
            _ => false
        };

    private static OrderSummaryResponse MapSummary(CustomerOrder order) => new()
    {
        OrderId = order.OrderId,
        OrderNumber = order.OrderNumber,
        StoreId = order.StoreId,
        OrderDate = order.OrderDate,
        Status = order.OrderStatus,
        TotalQuantity = order.OrderItems.Sum(x => x.Quantity),
        Subtotal = order.SubtotalAmount,
        DiscountAmount = order.DiscountAmount,
        ShippingAmount = order.ShippingAmount,
        TotalAmount = order.TotalAmount,
        CurrencyCode = order.CurrencyCode
    };

    private static OrderDetailsResponse MapDetails(
        CustomerOrder order,
        IReadOnlyDictionary<int, int> primaryImageIds) => new()
    {
        OrderId = order.OrderId,
        OrderNumber = order.OrderNumber,
        StoreId = order.StoreId,
        OrderDate = order.OrderDate,
        Status = order.OrderStatus,
        TotalQuantity = order.OrderItems.Sum(x => x.Quantity),
        Subtotal = order.SubtotalAmount,
        DiscountAmount = order.DiscountAmount,
        ShippingAmount = order.ShippingAmount,
        TotalAmount = order.TotalAmount,
        CurrencyCode = order.CurrencyCode,
        CouponCode = order.Coupon?.CouponCode,
        Items = order.OrderItems.Select(item => MapItem(item, primaryImageIds)).ToList(),
        Addresses = order.OrderAddresses.Select(MapAddressResponse).ToList(),
        StatusHistory = order.OrderStatusHistories
            .OrderBy(history => history.ChangedDate)
            .ThenBy(history => history.OrderStatusHistoryId)
            .Select(MapStatusHistory)
            .ToList(),
        Shipment = MapShipment(GetLatestShipment(order))
    };

    private static SellerOrderResponse MapSeller(CustomerOrder order)
    {
        OrderAddress? shipping = order.OrderAddresses.FirstOrDefault(x => x.AddressType == OrderAddressTypes.Shipping);
        return new SellerOrderResponse
        {
            OrderId = order.OrderId,
            OrderNumber = order.OrderNumber,
            StoreId = order.StoreId,
            OrderDate = order.OrderDate,
            Status = order.OrderStatus,
            TotalQuantity = order.OrderItems.Sum(x => x.Quantity),
            Subtotal = order.SubtotalAmount,
            DiscountAmount = order.DiscountAmount,
            ShippingAmount = order.ShippingAmount,
            TotalAmount = order.TotalAmount,
            CurrencyCode = order.CurrencyCode,
            CustomerName = shipping?.RecipientName ?? string.Empty,
            CustomerPhone = shipping?.RecipientPhone,
            ShippingAddress = shipping is null ? null : MapAddressResponse(shipping),
            Items = order.OrderItems.Select(item => MapItem(item)).ToList(),
            Shipment = MapShipment(GetLatestShipment(order))
        };
    }

    private static OrderItemResponse MapItem(
        OrderItem item,
        IReadOnlyDictionary<int, int>? primaryImageIds = null)
    {
        int productId = item.ProductVariant?.ProductId ?? 0;
        string? imageUrl = productId > 0 &&
            primaryImageIds is not null &&
            primaryImageIds.TryGetValue(productId, out int imageId)
                ? $"/api/product-images/{imageId}/content"
                : null;

        return new OrderItemResponse
        {
            OrderItemId = item.OrderItemId,
            ProductId = productId,
            VariantId = item.VariantId,
            ProductName = item.ProductNameAtPurchase,
            Sku = item.SkuAtPurchase,
            VariantName = item.VariantNameAtPurchase,
            ImageUrl = imageUrl,
            Quantity = item.Quantity,
            UnitPriceAtPurchase = item.UnitPriceAtPurchase,
            Subtotal = item.UnitPriceAtPurchase * item.Quantity
        };
    }

    private static ShipmentResponse? MapShipment(Shipment? shipment) => shipment is null
        ? null
        : new ShipmentResponse
        {
            ShipmentId = shipment.ShipmentId,
            CourierName = shipment.CourierName,
            TrackingNumber = shipment.TrackingNumber,
            ShipmentStatus = shipment.ShipmentStatus,
            ShippedDate = shipment.ShippedDate,
            DeliveredDate = shipment.DeliveredDate,
            ShippingCost = shipment.ShippingCost
        };

    private static OrderStatusHistoryResponse MapStatusHistory(OrderStatusHistory history) => new()
    {
        OrderStatusHistoryId = history.OrderStatusHistoryId,
        OldStatus = history.OldStatus,
        NewStatus = history.NewStatus,
        ChangedDate = history.ChangedDate,
        ChangedByUserId = history.ChangedByUserId,
        ChangeNote = history.ChangeNote
    };

    private async Task<Dictionary<int, int>> GetPrimaryImageIdsAsync(CustomerOrder order)
    {
        int[] productIds = order.OrderItems
            .Select(item => item.ProductVariant?.ProductId ?? 0)
            .Where(productId => productId > 0)
            .Distinct()
            .ToArray();

        if (productIds.Length == 0)
        {
            return [];
        }

        var imageMetadata = await _context.ProductImages
            .AsNoTracking()
            .Where(image => productIds.Contains(image.ProductId))
            .Select(image => new
            {
                image.ProductId,
                image.ImageId,
                image.IsPrimary,
                image.DisplayOrder
            })
            .ToListAsync();

        return imageMetadata
            .GroupBy(image => image.ProductId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .OrderByDescending(image => image.IsPrimary)
                    .ThenBy(image => image.DisplayOrder)
                    .ThenBy(image => image.ImageId)
                    .First()
                    .ImageId);
    }

    private static OrderAddressResponse MapAddressResponse(OrderAddress address) => new()
    {
        AddressType = address.AddressType,
        RecipientName = address.RecipientName,
        RecipientPhone = address.RecipientPhone,
        StreetAddress = address.StreetAddress,
        City = address.City,
        StateProvince = address.StateProvince,
        PostalCode = address.PostalCode,
        Country = address.Country
    };
}
