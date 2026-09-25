using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Notifications.DTOs
{
    public sealed class CreateNotificationRequest
    {
        [Range(1, int.MaxValue)]
        public int RecipientUserId { get; set; }

        [Range(1, int.MaxValue)]
        public int? ActorUserId { get; set; }

        [Required]
        [StringLength(50)]
        public string NotificationType { get; set; } =
            string.Empty;

        [Required]
        [StringLength(200)]
        public string Title { get; set; } =
            string.Empty;

        [Required]
        [StringLength(1000)]
        public string Message { get; set; } =
            string.Empty;

        [StringLength(50)]
        public string? RelatedEntityType { get; set; }

        [Range(1, int.MaxValue)]
        public int? RelatedEntityId { get; set; }
    }
}
