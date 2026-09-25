using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Seller.Analytics.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests;

public sealed class SellerAnalyticsServiceTests
{
    [Fact]
    public async Task GetAsync_UsesDeliveredSellerFinancialsProductsCategoriesAndReviews()
    {
        await using var database = new TestDatabase();
        DateTime now = DateTime.UtcNow;

        var admin = TestData.ActiveAdmin(1);
        var seller = TestData.ActiveSeller(10, "Primary Seller");
        var otherSeller = TestData.ActiveSeller(11, "Other Seller");
        var buyer = TestData.ActiveBuyer(20, "Review Buyer");
        var store = TestData.ApprovedStore(30, seller.UserId, "Primary Store");
        var otherStore = TestData.ApprovedStore(31, otherSeller.UserId, "Other Store");
        var electronics = TestData.Category(40, admin.UserId, "Electronics");
        var home = TestData.Category(41, admin.UserId, "Home");
        var laptop = TestData.Product(100, store.StoreId, electronics.CategoryId, name: "Laptop");
        var chair = TestData.Product(101, store.StoreId, home.CategoryId, name: "Chair");
        var otherProduct = TestData.Product(102, otherStore.StoreId, electronics.CategoryId, name: "Other Product");
        var laptopVariant = TestData.Variant(1000, laptop.ProductId, "LAPTOP", price: 100m, costPrice: 60m);
        var chairVariant = TestData.Variant(1001, chair.ProductId, "CHAIR", price: 50m, costPrice: 20m);
        var otherVariant = TestData.Variant(1002, otherProduct.ProductId, "OTHER", price: 999m, costPrice: 1m);
        var image = TestData.PrimaryImage(500, laptop.ProductId);

        database.Context.AddRange(
            admin,
            seller,
            otherSeller,
            buyer,
            store,
            otherStore,
            electronics,
            home,
            laptop,
            chair,
            otherProduct,
            laptopVariant,
            chairVariant,
            otherVariant,
            image);

        var deliveredOne = Order(700, store.StoreId, buyer.UserId, now.AddDays(-2), OrderStatuses.Delivered, 250m);
        var deliveredTwo = Order(701, store.StoreId, buyer.UserId, now.AddDays(-1), OrderStatuses.Delivered, 50m);
        var pending = Order(702, store.StoreId, buyer.UserId, now, OrderStatuses.Pending, 999m);
        var otherSellerOrder = Order(703, otherStore.StoreId, buyer.UserId, now, OrderStatuses.Delivered, 999m);

        database.Context.CustomerOrders.AddRange(deliveredOne, deliveredTwo, pending, otherSellerOrder);
        database.Context.OrderItems.AddRange(
            Item(800, deliveredOne.OrderId, laptopVariant.VariantId, "Laptop", 2, 100m, 60m),
            Item(801, deliveredOne.OrderId, chairVariant.VariantId, "Chair", 1, 50m, 20m),
            Item(802, deliveredTwo.OrderId, chairVariant.VariantId, "Chair", 1, 50m, 20m),
            Item(803, pending.OrderId, laptopVariant.VariantId, "Laptop", 9, 111m, 60m),
            Item(804, otherSellerOrder.OrderId, otherVariant.VariantId, "Other Product", 1, 999m, 1m));
        database.Context.OrderSellerFinancials.AddRange(
            Financial(deliveredOne.OrderId, 250m, 25m, 5m, 0m, 140m, 220m, 80m),
            Financial(deliveredTwo.OrderId, 50m, 0m, 0m, 0m, 20m, 50m, 30m),
            Financial(pending.OrderId, 999m, 0m, 0m, 0m, 0m, 999m, 999m),
            Financial(otherSellerOrder.OrderId, 999m, 0m, 0m, 0m, 1m, 999m, 998m));
        database.Context.Reviews.Add(new Review
        {
            ReviewId = 900,
            BuyerUserId = buyer.UserId,
            ProductId = laptop.ProductId,
            Rating = 5,
            Comment = "Excellent",
            ReviewDate = now.AddHours(-1)
        });

        await database.Context.SaveChangesAsync();
        database.Context.ChangeTracker.Clear();

        var service = new SellerAnalyticsService(database.Context);
        var result = await service.GetAsync(seller.UserId, "WEEK", "ALL_TIME", 0);

        Assert.True(result.HasStore);
        Assert.Equal(store.StoreId, result.StoreId);
        Assert.Equal("EUR", result.CurrencyCode);
        Assert.Equal(270m, result.Statistics.Single(x => x.MetricId == "NET_REVENUE").Value);
        Assert.Equal(2m, result.Statistics.Single(x => x.MetricId == "TOTAL_ORDERS").Value);
        Assert.Equal(4m, result.Statistics.Single(x => x.MetricId == "UNITS_SOLD").Value);
        Assert.Equal(135m, result.Statistics.Single(x => x.MetricId == "AVERAGE_ORDER_VALUE").Value);

        Assert.Equal(300m, result.FinancialSummary.GrossSalesAmount);
        Assert.Equal(25m, result.FinancialSummary.SellerDiscountAmount);
        Assert.Equal(5m, result.FinancialSummary.CommissionAmount);
        Assert.Equal(160m, result.FinancialSummary.CostOfGoodsAmount);
        Assert.Equal(270m, result.FinancialSummary.SellerNetAmount);
        Assert.Equal(110m, result.FinancialSummary.EstimatedProfitAmount);

        Assert.Equal(7, result.SalesOverview.Count);
        Assert.Equal(300m, result.SalesByCategory.Sum(x => x.Revenue));
        Assert.Equal("Electronics", result.SalesByCategory[0].Name);
        Assert.Equal(200m, result.SalesByCategory[0].Revenue);

        var topProduct = result.TopSellingProducts[0];
        Assert.Equal(laptop.ProductId, topProduct.ProductId);
        Assert.Equal(2, topProduct.UnitsSold);
        Assert.Equal(200m, topProduct.Revenue);
        Assert.Equal(5d, topProduct.Rating);
        Assert.Equal(1, topProduct.ReviewCount);
        Assert.Equal(
            $"/api/seller/products/{laptop.ProductId}/images/{image.ImageId}/content",
            topProduct.ImageUrl);

        var recentReview = Assert.Single(result.RecentReviews);
        Assert.Equal("Review Buyer", recentReview.BuyerName);
        Assert.Equal("Laptop", recentReview.ProductName);
        Assert.Equal(5, recentReview.Rating);

        Assert.Empty(database.Context.ChangeTracker.Entries<ProductImage>());
    }

    [Fact]
    public async Task GetAsync_NoStore_ReturnsSafeEmptyResponse()
    {
        await using var database = new TestDatabase();
        var service = new SellerAnalyticsService(database.Context);

        var result = await service.GetAsync(999, "ALL_TIME", "ALL_TIME", 0);

        Assert.False(result.HasStore);
        Assert.Null(result.StoreId);
        Assert.Empty(result.Statistics);
        Assert.Empty(result.TopSellingProducts);
    }

    private static CustomerOrder Order(
        int orderId,
        int storeId,
        int buyerId,
        DateTime orderDate,
        string status,
        decimal subtotal)
    {
        return new CustomerOrder
        {
            OrderId = orderId,
            OrderNumber = $"ORD-{orderId}",
            BuyerUserId = buyerId,
            StoreId = storeId,
            OrderDate = orderDate,
            OrderStatus = status,
            SubtotalAmount = subtotal,
            DiscountAmount = 0,
            ShippingAmount = 0,
            TotalAmount = subtotal,
            CurrencyCode = "EUR"
        };
    }

    private static OrderItem Item(
        int itemId,
        int orderId,
        int variantId,
        string productName,
        int quantity,
        decimal price,
        decimal cost)
    {
        return new OrderItem
        {
            OrderItemId = itemId,
            OrderId = orderId,
            VariantId = variantId,
            ProductNameAtPurchase = productName,
            SkuAtPurchase = $"SKU-{variantId}",
            Quantity = quantity,
            UnitPriceAtPurchase = price,
            UnitCostAtPurchase = cost
        };
    }

    private static OrderSellerFinancial Financial(
        int orderId,
        decimal gross,
        decimal discount,
        decimal commission,
        decimal refund,
        decimal cost,
        decimal net,
        decimal profit)
    {
        return new OrderSellerFinancial
        {
            OrderSellerFinancialId = orderId,
            OrderId = orderId,
            GrossSalesAmount = gross,
            SellerDiscountAmount = discount,
            CommissionAmount = commission,
            RefundAmount = refund,
            CostOfGoodsAmount = cost,
            SellerNetAmount = net,
            EstimatedProfitAmount = profit,
            CurrencyCode = "EUR",
            CalculatedDate = DateTime.UtcNow
        };
    }
}
