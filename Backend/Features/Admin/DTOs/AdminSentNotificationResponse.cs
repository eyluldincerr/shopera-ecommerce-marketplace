using Shopera.Features.Notifications.DTOs;

namespace Shopera.Features.Admin.DTOs
{
    public sealed class AdminSentNotificationResponse
    {
        public int RecipientUserId { get; set; }

        public string RecipientName { get; set; } = string.Empty;

        public string RecipientRole { get; set; } = string.Empty;

        public int? StoreId { get; set; }

        public string? StoreName { get; set; }

        public NotificationResponse Notification { get; set; } =
            new();
    }
}
