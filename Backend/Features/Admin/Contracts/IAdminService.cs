using Shopera.Common.DTOs;
using Shopera.Features.Admin.DTOs;
using Shopera.Features.Admin.Models;

namespace Shopera.Features.Admin.Contracts
{
    public interface IAdminService
    {
        Task<AdminServiceResult<PagedResponse<AdminStoreResponse>>>
            GetStoresAsync(
                int adminUserId,
                string? approvalStatus,
                string? search,
                int page,
                int pageSize);

        Task<AdminServiceResult<AdminStoreDecisionResponse>>
            ApproveStoreAsync(
                int adminUserId,
                int storeId,
                AdminStoreDecisionRequest request);

        Task<AdminServiceResult<AdminStoreDecisionResponse>>
            RejectStoreAsync(
                int adminUserId,
                int storeId,
                AdminStoreDecisionRequest request);

        Task<AdminServiceResult<PagedResponse<
            AdminNotificationRecipientResponse>>>
            GetNotificationRecipientsAsync(
                int adminUserId,
                string? search,
                string? role,
                int page,
                int pageSize);

        Task<AdminServiceResult<AdminSentNotificationResponse>>
            SendNotificationAsync(
                int adminUserId,
                AdminSendNotificationRequest request);
    }
}
