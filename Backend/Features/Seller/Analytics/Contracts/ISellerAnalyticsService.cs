using Shopera.Features.Seller.Analytics.DTOs;

namespace Shopera.Features.Seller.Analytics.Contracts;

public interface ISellerAnalyticsService
{
    Task<SellerAnalyticsResponse> GetAsync(
        int sellerUserId,
        string? salesPeriod,
        string? categoryPeriod,
        int yearOffset);
}
