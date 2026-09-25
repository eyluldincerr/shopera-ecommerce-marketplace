using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.DTOs;
using Shopera.Common.Extensions;
using Shopera.Domain.Constants;
using Shopera.Features.Admin.Contracts;
using Shopera.Features.Admin.DTOs;
using Shopera.Features.Admin.Management.Contracts;
using Shopera.Features.Admin.Management.DTOs;
using Shopera.Features.Admin.Models;
using Shopera.Features.Notifications.Contracts;
using Shopera.Features.Notifications.DTOs;

namespace Shopera.Features.Admin.Management.Controllers;

[ApiController]
[Authorize(Roles = AccountRoles.Admin)]
[Route("api/admin")]
public sealed class AdminManagementController : ControllerBase
{
    private readonly IAdminManagementService _management;
    private readonly IAdminService _existingAdminService;
    private readonly INotificationService _notifications;

    public AdminManagementController(
        IAdminManagementService management,
        IAdminService existingAdminService,
        INotificationService notifications)
    {
        _management = management;
        _existingAdminService = existingAdminService;
        _notifications = notifications;
    }

    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<AdminUserResponse>>> GetUsers() =>
        Ok(await _management.GetUsersAsync(User.GetRequiredUserId()));

    [HttpGet("users/{userId:int}")]
    public async Task<ActionResult<AdminUserResponse>> GetUser(int userId) =>
        Ok(await _management.GetUserAsync(User.GetRequiredUserId(), userId));

    [HttpPut("users/{userId:int}/status")]
    public async Task<IActionResult> UpdateUserStatus(
        int userId,
        [FromBody] UpdateAdminUserStatusRequest request)
    {
        await _management.UpdateUserStatusAsync(
            User.GetRequiredUserId(),
            userId,
            request.Status);
        return NoContent();
    }

    [HttpGet("stores/{storeId:int}")]
    public async Task<ActionResult<AdminStoreDetailsResponse>> GetStore(int storeId) =>
        Ok(await _management.GetStoreAsync(User.GetRequiredUserId(), storeId));

    [HttpGet("stores/seller/{sellerUserId:int}")]
    public async Task<ActionResult<AdminStoreDetailsResponse>> GetStoreBySeller(int sellerUserId) =>
        Ok(await _management.GetStoreBySellerAsync(
            User.GetRequiredUserId(),
            sellerUserId));

    [HttpPut("stores/{storeId:int}/status")]
    public async Task<ActionResult<AdminStoreDetailsResponse>> UpdateStoreStatus(
        int storeId,
        [FromBody] UpdateAdminStoreStatusRequest request) =>
        Ok(await _management.UpdateStoreStatusAsync(
            User.GetRequiredUserId(),
            storeId,
            request.Status,
            request.DecisionNote));

    [HttpGet("pending-sellers")]
    public async Task<ActionResult<IReadOnlyList<PendingSellerResponse>>> GetPendingSellers() =>
        Ok(await _management.GetPendingSellersAsync(User.GetRequiredUserId()));

    // Compatibility endpoint from the friend Admin backend. The existing
    // Shopera approval service remains authoritative so notifications,
    // history, and current transition checks are not duplicated.
    [HttpPut("stores/{storeId:int}/approval")]
    public async Task<ActionResult<AdminStoreApprovalResponse>> DecideStoreApproval(
        int storeId,
        [FromBody] AdminStoreApprovalRequest request)
    {
        string decision = (request.Decision ?? string.Empty).Trim().ToUpperInvariant();
        if (decision is not (StoreApprovalStatuses.Approved or StoreApprovalStatuses.Rejected))
        {
            return BadRequest(new
            {
                Code = "INVALID_APPROVAL_DECISION",
                Message = "Decision must be APPROVED or REJECTED."
            });
        }

        var existingRequest = new AdminStoreDecisionRequest
        {
            DecisionNote = request.DecisionNote
        };

        var result = decision == StoreApprovalStatuses.Approved
            ? await _existingAdminService.ApproveStoreAsync(
                User.GetRequiredUserId(),
                storeId,
                existingRequest)
            : await _existingAdminService.RejectStoreAsync(
                User.GetRequiredUserId(),
                storeId,
                existingRequest);

        if (!result.Succeeded)
        {
            return ExistingAdminFailure(result);
        }

        AdminStoreDetailsResponse store = await _management.GetStoreAsync(
            User.GetRequiredUserId(),
            storeId);

        return Ok(new AdminStoreApprovalResponse(
            store.StoreId,
            store.SellerUserId,
            store.ApprovalStatus,
            store.StoreStatus,
            $"Store application {decision.ToLowerInvariant()}."));
    }

    [HttpGet("stores/{storeId:int}/history")]
    public async Task<ActionResult<IReadOnlyList<AdminStoreApprovalHistoryResponse>>>
        GetStoreApprovalHistory(int storeId) =>
        Ok(await _management.GetStoreApprovalHistoryAsync(
            User.GetRequiredUserId(),
            storeId));

    [HttpGet("products")]
    public async Task<ActionResult<PagedResponse<AdminProductSummaryResponse>>> GetProducts(
        [FromQuery] string? search,
        [FromQuery] int? storeId,
        [FromQuery] int? sellerUserId,
        [FromQuery] int? categoryId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25) =>
        Ok(await _management.GetProductsAsync(
            User.GetRequiredUserId(),
            search,
            storeId,
            sellerUserId,
            categoryId,
            status,
            page,
            pageSize));

    [HttpGet("products/{productId:int}")]
    public async Task<ActionResult<AdminProductDetailsResponse>> GetProduct(int productId) =>
        Ok(await _management.GetProductAsync(User.GetRequiredUserId(), productId));

    [HttpPut("products/{productId:int}/status")]
    public async Task<ActionResult<AdminProductDetailsResponse>> UpdateProductStatus(
        int productId,
        [FromBody] UpdateAdminProductStatusRequest request) =>
        Ok(await _management.UpdateProductStatusAsync(
            User.GetRequiredUserId(),
            productId,
            request.Status));

    [HttpGet("orders")]
    public async Task<ActionResult<PagedResponse<AdminOrderSummaryResponse>>> GetOrders(
        [FromQuery] string? search,
        [FromQuery] int? buyerUserId,
        [FromQuery] int? storeId,
        [FromQuery] int? sellerUserId,
        [FromQuery] string? orderStatus,
        [FromQuery] string? paymentStatus,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25) =>
        Ok(await _management.GetOrdersAsync(
            User.GetRequiredUserId(),
            search,
            buyerUserId,
            storeId,
            sellerUserId,
            orderStatus,
            paymentStatus,
            from,
            to,
            page,
            pageSize));

    [HttpGet("orders/{orderId:int}")]
    public async Task<ActionResult<AdminOrderDetailsResponse>> GetOrder(int orderId) =>
        Ok(await _management.GetOrderAsync(User.GetRequiredUserId(), orderId));

    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminDashboardResponse>> GetDashboard() =>
        Ok(await _management.GetDashboardAsync(User.GetRequiredUserId()));

    [HttpGet("analytics/sales")]
    public async Task<ActionResult<AdminSalesAnalyticsResponse>> GetSalesAnalytics(
        [FromQuery] string currencyCode,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to) =>
        Ok(await _management.GetSalesAnalyticsAsync(
            User.GetRequiredUserId(),
            currencyCode,
            from,
            to));

    [HttpGet("orders/attention")]
    public async Task<ActionResult<IReadOnlyList<AdminOrderAttentionResponse>>>
        GetOrdersNeedingAttention() =>
        Ok(await _management.GetOrdersNeedingAttentionAsync(User.GetRequiredUserId()));

    // Admin-specific aliases retained from the friend backend. SQL/REST
    // notifications remain the same shared authoritative notification service.
    [HttpGet("notifications")]
    public async Task<ActionResult<IReadOnlyList<NotificationResponse>>> GetNotifications() =>
        Ok(await _notifications.GetForUserAsync(User.GetRequiredUserId()));

    [HttpGet("notifications/unread-count")]
    public async Task<IActionResult> GetUnreadNotificationCount() =>
        Ok(new
        {
            UnreadCount = await _notifications.GetUnreadCountAsync(User.GetRequiredUserId())
        });

    [HttpPut("notifications/{notificationId:int}/read")]
    public async Task<IActionResult> MarkNotificationRead(int notificationId)
    {
        bool found = await _notifications.MarkAsReadAsync(
            notificationId,
            User.GetRequiredUserId());
        return found ? NoContent() : NotFound();
    }

    [HttpPut("notifications/read-all")]
    public async Task<IActionResult> MarkAllNotificationsRead() =>
        Ok(new
        {
            UpdatedCount = await _notifications.MarkAllAsReadAsync(User.GetRequiredUserId())
        });

    private ActionResult ExistingAdminFailure<T>(AdminServiceResult<T> result)
    {
        var error = new
        {
            Code = result.ErrorCode,
            Message = result.ErrorMessage
        };

        return result.ErrorCode switch
        {
            AdminErrorCodes.AdminForbidden =>
                StatusCode(StatusCodes.Status403Forbidden, error),
            AdminErrorCodes.StoreNotFound or AdminErrorCodes.RecipientNotFound =>
                NotFound(error),
            AdminErrorCodes.InvalidStoreTransition =>
                Conflict(error),
            _ => BadRequest(error)
        };
    }
}
