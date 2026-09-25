using Shopera.Features.Notifications.DTOs;

namespace Shopera.Features.Admin.DTOs
{
    public sealed class AdminStoreDecisionResponse
    {
        public int StoreId { get; set; }

        public string StoreName { get; set; } = string.Empty;

        public int SellerUserId { get; set; }

        public string OldStatus { get; set; } = string.Empty;

        public string NewStatus { get; set; } = string.Empty;

        public int ChangedByAdminUserId { get; set; }

        public DateTime ChangedDate { get; set; }

        public string? DecisionNote { get; set; }

        public NotificationResponse Notification { get; set; } =
            new();
    }
}
