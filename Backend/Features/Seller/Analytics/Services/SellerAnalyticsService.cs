using Microsoft.EntityFrameworkCore;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Features.Seller.Analytics.Contracts;
using Shopera.Features.Seller.Analytics.DTOs;

namespace Shopera.Features.Seller.Analytics.Services;

public sealed class SellerAnalyticsService : ISellerAnalyticsService
{
    private const string PeriodAllTime = "ALL_TIME";
    private const string PeriodWeek = "WEEK";
    private const string PeriodMonth = "MONTH";

    private readonly ApplicationDbContext _dbContext;

    public SellerAnalyticsService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SellerAnalyticsResponse> GetAsync(
        int sellerUserId,
        string? salesPeriod,
        string? categoryPeriod,
        int yearOffset)
    {
        string normalizedSalesPeriod = NormalizePeriod(salesPeriod);
        string normalizedCategoryPeriod = NormalizePeriod(categoryPeriod);
        int normalizedYearOffset = Math.Clamp(yearOffset, -5, 0);
        DateTime now = DateTime.UtcNow;

        var store = await _dbContext.Stores
            .AsNoTracking()
            .Where(item => item.SellerUserId == sellerUserId)
            .Select(item => new
            {
                item.StoreId
            })
            .SingleOrDefaultAsync();

        if (store is null)
        {
            return new SellerAnalyticsResponse
            {
                HasStore = false
            };
        }

        var deliveredOrders = await _dbContext.CustomerOrders
            .AsNoTracking()
            .Where(order =>
                order.StoreId == store.StoreId &&
                order.OrderStatus == OrderStatuses.Delivered)
            .Select(order => new OrderRow
            {
                OrderId = order.OrderId,
                OrderDate = order.OrderDate,
                CurrencyCode = order.CurrencyCode,
                SubtotalAmount = order.SubtotalAmount,
                DiscountAmount = order.DiscountAmount
            })
            .ToListAsync();

        string currencyCode = deliveredOrders
            .Select(order => NormalizeCurrency(order.CurrencyCode))
            .FirstOrDefault(code => !string.IsNullOrWhiteSpace(code)) ?? "EUR";

        if (deliveredOrders.Count == 0)
        {
            return new SellerAnalyticsResponse
            {
                HasStore = true,
                StoreId = store.StoreId,
                CurrencyCode = currencyCode,
                Statistics = EmptyStatistics(),
                MonthlyRevenue = BuildEmptyMonths(now.Year + normalizedYearOffset)
            };
        }

        int[] orderIds = deliveredOrders
            .Select(order => order.OrderId)
            .ToArray();

        var financialRows = await _dbContext.OrderSellerFinancials
            .AsNoTracking()
            .Where(item => orderIds.Contains(item.OrderId))
            .Select(item => new FinancialRow
            {
                OrderId = item.OrderId,
                GrossSalesAmount = item.GrossSalesAmount,
                SellerDiscountAmount = item.SellerDiscountAmount,
                CommissionAmount = item.CommissionAmount,
                RefundAmount = item.RefundAmount,
                CostOfGoodsAmount = item.CostOfGoodsAmount,
                SellerNetAmount = item.SellerNetAmount,
                EstimatedProfitAmount = item.EstimatedProfitAmount
            })
            .ToListAsync();

        var itemRows = await (
            from item in _dbContext.OrderItems.AsNoTracking()
            join variant in _dbContext.ProductVariants.AsNoTracking()
                on item.VariantId equals variant.VariantId
            join product in _dbContext.Products.AsNoTracking()
                on variant.ProductId equals product.ProductId
            join category in _dbContext.Categories.AsNoTracking()
                on product.CategoryId equals category.CategoryId
            where orderIds.Contains(item.OrderId)
            select new ItemRow
            {
                OrderId = item.OrderId,
                ProductId = product.ProductId,
                ProductName = product.ProductName,
                CategoryId = category.CategoryId,
                CategoryName = category.CategoryName,
                Quantity = item.Quantity,
                UnitPriceAtPurchase = item.UnitPriceAtPurchase,
                UnitCostAtPurchase = item.UnitCostAtPurchase,
                CurrentVariantPrice = variant.Price
            })
            .ToListAsync();

        var financialByOrderId = financialRows.ToDictionary(item => item.OrderId);
        var itemsByOrderId = itemRows
            .GroupBy(item => item.OrderId)
            .ToDictionary(group => group.Key, group => group.ToList());

        var analyticsOrders = deliveredOrders
            .Select(order => BuildAnalyticsOrder(
                order,
                financialByOrderId.GetValueOrDefault(order.OrderId),
                itemsByOrderId.GetValueOrDefault(order.OrderId) ?? new List<ItemRow>()))
            .OrderBy(order => order.OrderDate)
            .ToList();

        var productIds = itemRows
            .Select(item => item.ProductId)
            .Distinct()
            .ToArray();

        var reviewRows = productIds.Length == 0
            ? new List<ProductReviewRow>()
            : await _dbContext.Reviews
                .AsNoTracking()
                .Where(review => productIds.Contains(review.ProductId))
                .Select(review => new ProductReviewRow
                {
                    ProductId = review.ProductId,
                    Rating = review.Rating
                })
                .ToListAsync();

        Dictionary<int, int> imageByProductId = await GetPrimaryImageIdsAsync(productIds);

        var recentReviews = await GetRecentReviewsAsync(store.StoreId);
        int[] recentReviewProductIds = recentReviews
            .Select(review => review.ProductId)
            .Distinct()
            .ToArray();
        Dictionary<int, int> recentReviewImageIds =
            await GetPrimaryImageIdsAsync(recentReviewProductIds);

        var statistics = BuildStatistics(analyticsOrders, itemRows, now);
        var financialSummary = BuildFinancialSummary(analyticsOrders);
        var salesOverview = BuildSalesOverview(
            analyticsOrders,
            normalizedSalesPeriod,
            now);
        var salesByCategory = BuildCategorySales(
            itemRows,
            deliveredOrders,
            normalizedCategoryPeriod,
            now);
        var topCategories = BuildCategorySales(
                itemRows,
                deliveredOrders,
                PeriodAllTime,
                now)
            .Take(5)
            .ToArray();
        var monthlyRevenue = BuildMonthlyRevenue(
            analyticsOrders,
            now.Year + normalizedYearOffset);
        var topSellingProducts = BuildTopProducts(
            itemRows,
            reviewRows,
            imageByProductId);

        return new SellerAnalyticsResponse
        {
            HasStore = true,
            StoreId = store.StoreId,
            CurrencyCode = currencyCode,
            Statistics = statistics,
            FinancialSummary = financialSummary,
            SalesOverview = salesOverview,
            SalesByCategory = salesByCategory,
            MonthlyRevenue = monthlyRevenue,
            TopSellingProducts = topSellingProducts,
            TopCategories = topCategories,
            RecentReviews = recentReviews
                .Select(review => new SellerRecentReviewResponse
                {
                    ReviewId = review.ReviewId,
                    ProductId = review.ProductId,
                    BuyerName = review.BuyerName,
                    ProductName = review.ProductName,
                    Rating = review.Rating,
                    Comment = review.Comment,
                    ReviewDate = review.ReviewDate,
                    ImageUrl = BuildSellerImageUrl(
                        review.ProductId,
                        recentReviewImageIds.GetValueOrDefault(review.ProductId))
                })
                .ToArray()
        };
    }

    private async Task<Dictionary<int, int>> GetPrimaryImageIdsAsync(
        IReadOnlyCollection<int> productIds)
    {
        if (productIds.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        var imageRows = await _dbContext.ProductImages
            .AsNoTracking()
            .Where(image => productIds.Contains(image.ProductId))
            .Select(image => new
            {
                image.ImageId,
                image.ProductId,
                image.IsPrimary,
                image.DisplayOrder
            })
            .ToListAsync();

        return imageRows
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

    private async Task<List<RecentReviewRow>> GetRecentReviewsAsync(int storeId)
    {
        return await (
            from review in _dbContext.Reviews.AsNoTracking()
            join product in _dbContext.Products.AsNoTracking()
                on review.ProductId equals product.ProductId
            join buyer in _dbContext.UserAccounts.AsNoTracking()
                on review.BuyerUserId equals buyer.UserId
            where product.StoreId == storeId
            orderby review.ReviewDate descending, review.ReviewId descending
            select new RecentReviewRow
            {
                ReviewId = review.ReviewId,
                ProductId = review.ProductId,
                BuyerName = buyer.FullName,
                ProductName = product.ProductName,
                Rating = review.Rating,
                Comment = review.Comment,
                ReviewDate = review.ReviewDate
            })
            .Take(5)
            .ToListAsync();
    }

    private static IReadOnlyList<SellerAnalyticsStatisticResponse> BuildStatistics(
        IReadOnlyList<AnalyticsOrderRow> orders,
        IReadOnlyList<ItemRow> items,
        DateTime now)
    {
        decimal netRevenue = orders.Sum(order => order.SellerNetAmount);
        int orderCount = orders.Count;
        int unitsSold = items.Sum(item => item.Quantity);
        decimal averageOrderValue = orderCount == 0
            ? 0
            : netRevenue / orderCount;

        DateTime currentStart = now.Date.AddDays(-6);
        DateTime currentEnd = now.Date.AddDays(1);
        DateTime previousStart = currentStart.AddDays(-7);

        var currentOrders = orders
            .Where(order => order.OrderDate >= currentStart && order.OrderDate < currentEnd)
            .ToArray();
        var previousOrders = orders
            .Where(order => order.OrderDate >= previousStart && order.OrderDate < currentStart)
            .ToArray();

        var currentOrderIds = currentOrders.Select(order => order.OrderId).ToHashSet();
        var previousOrderIds = previousOrders.Select(order => order.OrderId).ToHashSet();

        decimal currentRevenue = currentOrders.Sum(order => order.SellerNetAmount);
        decimal previousRevenue = previousOrders.Sum(order => order.SellerNetAmount);
        int currentUnits = items
            .Where(item => currentOrderIds.Contains(item.OrderId))
            .Sum(item => item.Quantity);
        int previousUnits = items
            .Where(item => previousOrderIds.Contains(item.OrderId))
            .Sum(item => item.Quantity);
        decimal currentAverage = currentOrders.Length == 0
            ? 0
            : currentRevenue / currentOrders.Length;
        decimal previousAverage = previousOrders.Length == 0
            ? 0
            : previousRevenue / previousOrders.Length;

        return new[]
        {
            Statistic("NET_REVENUE", netRevenue, PercentChange(currentRevenue, previousRevenue)),
            Statistic("TOTAL_ORDERS", orderCount, PercentChange(currentOrders.Length, previousOrders.Length)),
            Statistic("UNITS_SOLD", unitsSold, PercentChange(currentUnits, previousUnits)),
            Statistic("AVERAGE_ORDER_VALUE", averageOrderValue, PercentChange(currentAverage, previousAverage))
        };
    }

    private static IReadOnlyList<SellerAnalyticsStatisticResponse> EmptyStatistics()
    {
        return new[]
        {
            Statistic("NET_REVENUE", 0, null),
            Statistic("TOTAL_ORDERS", 0, null),
            Statistic("UNITS_SOLD", 0, null),
            Statistic("AVERAGE_ORDER_VALUE", 0, null)
        };
    }

    private static SellerAnalyticsStatisticResponse Statistic(
        string metricId,
        decimal value,
        decimal? changePercent)
    {
        return new SellerAnalyticsStatisticResponse
        {
            MetricId = metricId,
            Value = decimal.Round(value, 2),
            ChangePercent = changePercent.HasValue
                ? decimal.Round(changePercent.Value, 1)
                : null
        };
    }

    private static decimal? PercentChange(decimal current, decimal previous)
    {
        if (previous == 0)
        {
            return null;
        }

        return ((current - previous) / Math.Abs(previous)) * 100m;
    }

    private static SellerFinancialSummaryResponse BuildFinancialSummary(
        IReadOnlyList<AnalyticsOrderRow> orders)
    {
        return new SellerFinancialSummaryResponse
        {
            GrossSalesAmount = SumRounded(orders.Select(order => order.GrossSalesAmount)),
            SellerDiscountAmount = SumRounded(orders.Select(order => order.SellerDiscountAmount)),
            CommissionAmount = SumRounded(orders.Select(order => order.CommissionAmount)),
            RefundAmount = SumRounded(orders.Select(order => order.RefundAmount)),
            CostOfGoodsAmount = SumRounded(orders.Select(order => order.CostOfGoodsAmount)),
            SellerNetAmount = SumRounded(orders.Select(order => order.SellerNetAmount)),
            EstimatedProfitAmount = SumRounded(orders.Select(order => order.EstimatedProfitAmount))
        };
    }

    private static IReadOnlyList<SellerSalesPointResponse> BuildSalesOverview(
        IReadOnlyList<AnalyticsOrderRow> orders,
        string period,
        DateTime now)
    {
        var filtered = FilterByPeriod(orders, period, now).ToArray();

        if (period == PeriodAllTime)
        {
            return filtered
                .GroupBy(order => new { order.OrderDate.Year, order.OrderDate.Month })
                .OrderBy(group => group.Key.Year)
                .ThenBy(group => group.Key.Month)
                .Select(group => new SellerSalesPointResponse
                {
                    Date = new DateTime(group.Key.Year, group.Key.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                    Bucket = "MONTH",
                    Value = decimal.Round(group.Sum(order => order.SellerNetAmount), 2)
                })
                .ToArray();
        }

        DateTime start = GetPeriodStart(period, now);
        DateTime end = now.Date;
        var revenueByDay = filtered
            .GroupBy(order => order.OrderDate.Date)
            .ToDictionary(
                group => group.Key,
                group => decimal.Round(group.Sum(order => order.SellerNetAmount), 2));

        var points = new List<SellerSalesPointResponse>();
        for (DateTime date = start.Date; date <= end; date = date.AddDays(1))
        {
            points.Add(new SellerSalesPointResponse
            {
                Date = DateTime.SpecifyKind(date, DateTimeKind.Utc),
                Bucket = "DAY",
                Value = revenueByDay.GetValueOrDefault(date.Date)
            });
        }

        return points;
    }

    private static IReadOnlyList<SellerCategorySalesResponse> BuildCategorySales(
        IReadOnlyList<ItemRow> items,
        IReadOnlyList<OrderRow> orders,
        string period,
        DateTime now)
    {
        var eligibleOrderIds = orders
            .Where(order => IsInPeriod(order.OrderDate, period, now))
            .Select(order => order.OrderId)
            .ToHashSet();

        var grouped = items
            .Where(item => eligibleOrderIds.Contains(item.OrderId))
            .GroupBy(item => new { item.CategoryId, item.CategoryName })
            .Select(group => new
            {
                group.Key.CategoryId,
                group.Key.CategoryName,
                Revenue = group.Sum(item => item.Quantity * item.UnitPriceAtPurchase)
            })
            .OrderByDescending(item => item.Revenue)
            .ThenBy(item => item.CategoryName)
            .ToArray();

        decimal totalRevenue = grouped.Sum(item => item.Revenue);

        return grouped
            .Select(item => new SellerCategorySalesResponse
            {
                CategoryId = item.CategoryId,
                Name = item.CategoryName,
                Revenue = decimal.Round(item.Revenue, 2),
                Percentage = totalRevenue == 0
                    ? 0
                    : decimal.Round((item.Revenue / totalRevenue) * 100m, 1)
            })
            .ToArray();
    }

    private static IReadOnlyList<SellerMonthlyRevenueResponse> BuildMonthlyRevenue(
        IReadOnlyList<AnalyticsOrderRow> orders,
        int year)
    {
        var byMonth = orders
            .Where(order => order.OrderDate.Year == year)
            .GroupBy(order => order.OrderDate.Month)
            .ToDictionary(
                group => group.Key,
                group => decimal.Round(group.Sum(order => order.SellerNetAmount), 2));

        return Enumerable.Range(1, 12)
            .Select(month => new SellerMonthlyRevenueResponse
            {
                Year = year,
                Month = month,
                Value = byMonth.GetValueOrDefault(month)
            })
            .ToArray();
    }

    private static IReadOnlyList<SellerTopProductResponse> BuildTopProducts(
        IReadOnlyList<ItemRow> items,
        IReadOnlyList<ProductReviewRow> reviews,
        IReadOnlyDictionary<int, int> imageByProductId)
    {
        var reviewsByProductId = reviews
            .GroupBy(review => review.ProductId)
            .ToDictionary(
                group => group.Key,
                group => new
                {
                    Count = group.Count(),
                    Average = group.Average(review => (double)review.Rating)
                });

        return items
            .GroupBy(item => new { item.ProductId, item.ProductName })
            .Select(group =>
            {
                reviewsByProductId.TryGetValue(group.Key.ProductId, out var reviewSummary);
                int imageId = imageByProductId.GetValueOrDefault(group.Key.ProductId);

                return new SellerTopProductResponse
                {
                    ProductId = group.Key.ProductId,
                    Name = group.Key.ProductName,
                    CurrentPrice = group.Min(item => (decimal?)item.CurrentVariantPrice),
                    UnitsSold = group.Sum(item => item.Quantity),
                    Revenue = decimal.Round(
                        group.Sum(item => item.Quantity * item.UnitPriceAtPurchase),
                        2),
                    Rating = reviewSummary is null
                        ? 0
                        : Math.Round(reviewSummary.Average, 2),
                    ReviewCount = reviewSummary?.Count ?? 0,
                    ImageUrl = BuildSellerImageUrl(group.Key.ProductId, imageId)
                };
            })
            .OrderByDescending(product => product.UnitsSold)
            .ThenByDescending(product => product.Revenue)
            .ThenBy(product => product.Name)
            .Take(5)
            .ToArray();
    }

    private static AnalyticsOrderRow BuildAnalyticsOrder(
        OrderRow order,
        FinancialRow? financial,
        IReadOnlyList<ItemRow> items)
    {
        decimal grossSales = financial?.GrossSalesAmount ?? order.SubtotalAmount;
        decimal sellerDiscount = financial?.SellerDiscountAmount ?? order.DiscountAmount;
        decimal commission = financial?.CommissionAmount ?? 0;
        decimal refund = financial?.RefundAmount ?? 0;
        decimal costOfGoods = financial?.CostOfGoodsAmount ??
            items.Sum(item => item.Quantity * item.UnitCostAtPurchase);
        decimal sellerNet = financial?.SellerNetAmount ??
            grossSales - sellerDiscount - commission - refund;
        decimal estimatedProfit = financial?.EstimatedProfitAmount ??
            sellerNet - costOfGoods;

        return new AnalyticsOrderRow
        {
            OrderId = order.OrderId,
            OrderDate = order.OrderDate,
            GrossSalesAmount = grossSales,
            SellerDiscountAmount = sellerDiscount,
            CommissionAmount = commission,
            RefundAmount = refund,
            CostOfGoodsAmount = costOfGoods,
            SellerNetAmount = sellerNet,
            EstimatedProfitAmount = estimatedProfit
        };
    }

    private static IEnumerable<AnalyticsOrderRow> FilterByPeriod(
        IEnumerable<AnalyticsOrderRow> orders,
        string period,
        DateTime now)
    {
        return orders.Where(order => IsInPeriod(order.OrderDate, period, now));
    }

    private static bool IsInPeriod(DateTime date, string period, DateTime now)
    {
        if (period == PeriodAllTime)
        {
            return true;
        }

        DateTime start = GetPeriodStart(period, now);
        return date >= start && date < now.Date.AddDays(1);
    }

    private static DateTime GetPeriodStart(string period, DateTime now)
    {
        return period switch
        {
            PeriodWeek => now.Date.AddDays(-6),
            PeriodMonth => new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            _ => DateTime.MinValue
        };
    }

    private static string NormalizePeriod(string? period)
    {
        string normalized = (period ?? PeriodAllTime)
            .Trim()
            .ToUpperInvariant();

        return normalized is PeriodWeek or PeriodMonth or PeriodAllTime
            ? normalized
            : PeriodAllTime;
    }

    private static string NormalizeCurrency(string? currencyCode)
    {
        string normalized = (currencyCode ?? "EUR")
            .Trim()
            .ToUpperInvariant();

        return normalized.Length == 3 ? normalized : "EUR";
    }

    private static decimal SumRounded(IEnumerable<decimal> values) =>
        decimal.Round(values.Sum(), 2);

    private static IReadOnlyList<SellerMonthlyRevenueResponse> BuildEmptyMonths(int year) =>
        Enumerable.Range(1, 12)
            .Select(month => new SellerMonthlyRevenueResponse
            {
                Year = year,
                Month = month,
                Value = 0
            })
            .ToArray();

    private static string? BuildSellerImageUrl(int productId, int imageId)
    {
        return imageId > 0
            ? $"/api/seller/products/{productId}/images/{imageId}/content"
            : null;
    }

    private sealed class OrderRow
    {
        public int OrderId { get; init; }
        public DateTime OrderDate { get; init; }
        public string CurrencyCode { get; init; } = "EUR";
        public decimal SubtotalAmount { get; init; }
        public decimal DiscountAmount { get; init; }
    }

    private sealed class FinancialRow
    {
        public int OrderId { get; init; }
        public decimal GrossSalesAmount { get; init; }
        public decimal SellerDiscountAmount { get; init; }
        public decimal CommissionAmount { get; init; }
        public decimal RefundAmount { get; init; }
        public decimal CostOfGoodsAmount { get; init; }
        public decimal SellerNetAmount { get; init; }
        public decimal EstimatedProfitAmount { get; init; }
    }

    private sealed class ItemRow
    {
        public int OrderId { get; init; }
        public int ProductId { get; init; }
        public string ProductName { get; init; } = string.Empty;
        public int CategoryId { get; init; }
        public string CategoryName { get; init; } = string.Empty;
        public int Quantity { get; init; }
        public decimal UnitPriceAtPurchase { get; init; }
        public decimal UnitCostAtPurchase { get; init; }
        public decimal CurrentVariantPrice { get; init; }
    }

    private sealed class ProductReviewRow
    {
        public int ProductId { get; init; }
        public byte Rating { get; init; }
    }

    private sealed class RecentReviewRow
    {
        public int ReviewId { get; init; }
        public int ProductId { get; init; }
        public string BuyerName { get; init; } = string.Empty;
        public string ProductName { get; init; } = string.Empty;
        public int Rating { get; init; }
        public string? Comment { get; init; }
        public DateTime ReviewDate { get; init; }
    }

    private sealed class AnalyticsOrderRow
    {
        public int OrderId { get; init; }
        public DateTime OrderDate { get; init; }
        public decimal GrossSalesAmount { get; init; }
        public decimal SellerDiscountAmount { get; init; }
        public decimal CommissionAmount { get; init; }
        public decimal RefundAmount { get; init; }
        public decimal CostOfGoodsAmount { get; init; }
        public decimal SellerNetAmount { get; init; }
        public decimal EstimatedProfitAmount { get; init; }
    }
}
