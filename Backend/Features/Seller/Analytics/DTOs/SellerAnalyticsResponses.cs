namespace Shopera.Features.Seller.Analytics.DTOs;

public sealed class SellerAnalyticsResponse
{
    public bool HasStore { get; init; }
    public int? StoreId { get; init; }
    public string CurrencyCode { get; init; } = "EUR";
    public IReadOnlyList<SellerAnalyticsStatisticResponse> Statistics { get; init; } =
        Array.Empty<SellerAnalyticsStatisticResponse>();
    public SellerFinancialSummaryResponse FinancialSummary { get; init; } = new();
    public IReadOnlyList<SellerSalesPointResponse> SalesOverview { get; init; } =
        Array.Empty<SellerSalesPointResponse>();
    public IReadOnlyList<SellerCategorySalesResponse> SalesByCategory { get; init; } =
        Array.Empty<SellerCategorySalesResponse>();
    public IReadOnlyList<SellerMonthlyRevenueResponse> MonthlyRevenue { get; init; } =
        Array.Empty<SellerMonthlyRevenueResponse>();
    public IReadOnlyList<SellerTopProductResponse> TopSellingProducts { get; init; } =
        Array.Empty<SellerTopProductResponse>();
    public IReadOnlyList<SellerCategorySalesResponse> TopCategories { get; init; } =
        Array.Empty<SellerCategorySalesResponse>();
    public IReadOnlyList<SellerRecentReviewResponse> RecentReviews { get; init; } =
        Array.Empty<SellerRecentReviewResponse>();
}

public sealed class SellerAnalyticsStatisticResponse
{
    public string MetricId { get; init; } = string.Empty;
    public decimal Value { get; init; }
    public decimal? ChangePercent { get; init; }
}

public sealed class SellerFinancialSummaryResponse
{
    public decimal GrossSalesAmount { get; init; }
    public decimal SellerDiscountAmount { get; init; }
    public decimal CommissionAmount { get; init; }
    public decimal RefundAmount { get; init; }
    public decimal CostOfGoodsAmount { get; init; }
    public decimal SellerNetAmount { get; init; }
    public decimal EstimatedProfitAmount { get; init; }
}

public sealed class SellerSalesPointResponse
{
    public DateTime Date { get; init; }
    public string Bucket { get; init; } = "DAY";
    public decimal Value { get; init; }
}

public sealed class SellerMonthlyRevenueResponse
{
    public int Year { get; init; }
    public int Month { get; init; }
    public decimal Value { get; init; }
}

public sealed class SellerCategorySalesResponse
{
    public int CategoryId { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal Revenue { get; init; }
    public decimal Percentage { get; init; }
}

public sealed class SellerTopProductResponse
{
    public int ProductId { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal? CurrentPrice { get; init; }
    public int UnitsSold { get; init; }
    public decimal Revenue { get; init; }
    public double Rating { get; init; }
    public int ReviewCount { get; init; }
    public string? ImageUrl { get; init; }
}

public sealed class SellerRecentReviewResponse
{
    public int ReviewId { get; init; }
    public int ProductId { get; init; }
    public string BuyerName { get; init; } = string.Empty;
    public string ProductName { get; init; } = string.Empty;
    public int Rating { get; init; }
    public string? Comment { get; init; }
    public DateTime ReviewDate { get; init; }
    public string? ImageUrl { get; init; }
}
