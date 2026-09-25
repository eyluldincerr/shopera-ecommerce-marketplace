using Shopera.Common.DTOs;
using Shopera.Features.Admin.Management.DTOs;

namespace Shopera.Features.Admin.Management.Contracts;

public interface IAdminManagementService
{
    Task<IReadOnlyList<AdminUserResponse>> GetUsersAsync(int adminUserId);
    Task<AdminUserResponse> GetUserAsync(int adminUserId, int userId);
    Task UpdateUserStatusAsync(int adminUserId, int userId, string status);

    Task<AdminStoreDetailsResponse> GetStoreAsync(int adminUserId, int storeId);
    Task<AdminStoreDetailsResponse> GetStoreBySellerAsync(int adminUserId, int sellerUserId);
    Task<AdminStoreDetailsResponse> UpdateStoreStatusAsync(
        int adminUserId,
        int storeId,
        string status,
        string? decisionNote);
    Task<IReadOnlyList<PendingSellerResponse>> GetPendingSellersAsync(int adminUserId);
    Task<IReadOnlyList<AdminStoreApprovalHistoryResponse>> GetStoreApprovalHistoryAsync(
        int adminUserId, int storeId);

    Task<PagedResponse<AdminProductSummaryResponse>> GetProductsAsync(
        int adminUserId,
        string? search,
        int? storeId,
        int? sellerUserId,
        int? categoryId,
        string? status,
        int page,
        int pageSize);
    Task<AdminProductDetailsResponse> GetProductAsync(int adminUserId, int productId);
    Task<AdminProductDetailsResponse> UpdateProductStatusAsync(
        int adminUserId,
        int productId,
        string status);

    Task<PagedResponse<AdminOrderSummaryResponse>> GetOrdersAsync(
        int adminUserId,
        string? search,
        int? buyerUserId,
        int? storeId,
        int? sellerUserId,
        string? orderStatus,
        string? paymentStatus,
        DateTime? from,
        DateTime? to,
        int page,
        int pageSize);
    Task<AdminOrderDetailsResponse> GetOrderAsync(int adminUserId, int orderId);

    Task<AdminDashboardResponse> GetDashboardAsync(int adminUserId);
    Task<AdminSalesAnalyticsResponse> GetSalesAnalyticsAsync(
        int adminUserId, string currencyCode, DateTime? from, DateTime? to);
    Task<IReadOnlyList<AdminOrderAttentionResponse>> GetOrdersNeedingAttentionAsync(
        int adminUserId);
}
