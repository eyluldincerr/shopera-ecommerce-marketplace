using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.DTOs;
using Shopera.Common.Extensions;
using Shopera.Domain.Constants;
using Shopera.Features.Admin.Contracts;
using Shopera.Features.Admin.DTOs;
using Shopera.Features.Admin.Models;

namespace Shopera.Features.Admin.Controllers
{
    [ApiController]
    [Authorize(Roles = AccountRoles.Admin)]
    [Route("api/admin")]
    public sealed class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        // GET: api/admin/stores?approvalStatus=PENDING
        [HttpGet("stores")]
        public async Task<ActionResult<
            PagedResponse<AdminStoreResponse>>> GetStores(
            [FromQuery] string? approvalStatus = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _adminService.GetStoresAsync(
                User.GetRequiredUserId(),
                approvalStatus,
                search,
                page,
                pageSize);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return Ok(result.Value);
        }

        // PATCH: api/admin/stores/12/approve
        [HttpPatch("stores/{storeId:int}/approve")]
        public async Task<ActionResult<
            AdminStoreDecisionResponse>> ApproveStore(
            int storeId,
            [FromBody] AdminStoreDecisionRequest request)
        {
            if (storeId <= 0)
            {
                return BadRequest(new
                {
                    Code = "INVALID_STORE_ID",
                    Message =
                        "Store ID must be greater than zero."
                });
            }

            var result = await _adminService.ApproveStoreAsync(
                User.GetRequiredUserId(),
                storeId,
                request);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return Ok(result.Value);
        }

        // PATCH: api/admin/stores/12/reject
        [HttpPatch("stores/{storeId:int}/reject")]
        public async Task<ActionResult<
            AdminStoreDecisionResponse>> RejectStore(
            int storeId,
            [FromBody] AdminStoreDecisionRequest request)
        {
            if (storeId <= 0)
            {
                return BadRequest(new
                {
                    Code = "INVALID_STORE_ID",
                    Message =
                        "Store ID must be greater than zero."
                });
            }

            var result = await _adminService.RejectStoreAsync(
                User.GetRequiredUserId(),
                storeId,
                request);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return Ok(result.Value);
        }

        // GET: api/admin/notification-recipients?role=SELLER
        [HttpGet("notification-recipients")]
        public async Task<ActionResult<PagedResponse<
            AdminNotificationRecipientResponse>>>
            GetNotificationRecipients(
                [FromQuery] string? search = null,
                [FromQuery] string? role = null,
                [FromQuery] int page = 1,
                [FromQuery] int pageSize = 20)
        {
            var result =
                await _adminService
                    .GetNotificationRecipientsAsync(
                        User.GetRequiredUserId(),
                        search,
                        role,
                        page,
                        pageSize);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return Ok(result.Value);
        }

        // POST: api/admin/notifications
        [HttpPost("notifications")]
        public async Task<ActionResult<
            AdminSentNotificationResponse>> SendNotification(
            [FromBody] AdminSendNotificationRequest request)
        {
            var result =
                await _adminService.SendNotificationAsync(
                    User.GetRequiredUserId(),
                    request);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return Created(
                $"/api/notifications/user/" +
                $"{result.Value!.RecipientUserId}",
                result.Value);
        }

        private ActionResult Failure<T>(
            AdminServiceResult<T> result)
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

                AdminErrorCodes.StoreNotFound or
                AdminErrorCodes.RecipientNotFound =>
                    NotFound(error),

                AdminErrorCodes.InvalidStoreTransition =>
                    Conflict(error),

                _ => BadRequest(error)
            };
        }
    }
}
