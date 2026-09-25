using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Extensions;
using Shopera.Features.Notifications.Contracts;
using Shopera.Features.Notifications.DTOs;

namespace Shopera.Features.Notifications.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/notifications")]
    public sealed class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(
            INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<ActionResult<
            IReadOnlyList<NotificationResponse>>> GetForUser()
        {
            var notifications =
                await _notificationService.GetForUserAsync(
                    User.GetRequiredUserId());

            return Ok(notifications);
        }

        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var unreadCount =
                await _notificationService.GetUnreadCountAsync(
                    User.GetRequiredUserId());

            return Ok(unreadCount);
        }

        [HttpPatch("{notificationId:int}/read")]
        public async Task<IActionResult> MarkAsRead(
            int notificationId)
        {
            if (notificationId <= 0)
            {
                return BadRequest(
                    "Notification ID must be greater than zero.");
            }

            var wasUpdated =
                await _notificationService.MarkAsReadAsync(
                    notificationId,
                    User.GetRequiredUserId());

            if (!wasUpdated)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var updatedCount =
                await _notificationService.MarkAllAsReadAsync(
                    User.GetRequiredUserId());

            return Ok(new
            {
                UpdatedCount = updatedCount
            });
        }

    }
}
