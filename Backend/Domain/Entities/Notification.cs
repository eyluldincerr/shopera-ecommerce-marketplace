namespace Shopera.Domain.Entities
{
    public class Notification
    {
        public int NotificationId { get; set; }

        public int RecipientUserId { get; set; }

        public int? ActorUserId { get; set; }

        public string NotificationType { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string? RelatedEntityType { get; set; }

        public int? RelatedEntityId { get; set; }

        public bool IsRead { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime? ReadDate { get; set; }
    }
}