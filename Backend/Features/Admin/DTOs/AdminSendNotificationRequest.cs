using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Admin.DTOs
{
    public sealed class AdminSendNotificationRequest
        : IValidatableObject
    {
        [Range(1, int.MaxValue)]
        public int? RecipientUserId { get; set; }

        [Range(1, int.MaxValue)]
        public int? StoreId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(1000)]
        public string Message { get; set; } = string.Empty;

        [StringLength(50)]
        public string? RelatedEntityType { get; set; }

        [Range(1, int.MaxValue)]
        public int? RelatedEntityId { get; set; }

        public IEnumerable<ValidationResult> Validate(
            ValidationContext validationContext)
        {
            if (RecipientUserId.HasValue == StoreId.HasValue)
            {
                yield return new ValidationResult(
                    "Provide exactly one target: RecipientUserId or StoreId.",
                    new[]
                    {
                        nameof(RecipientUserId),
                        nameof(StoreId)
                    });
            }

            var hasRelatedEntityType =
                !string.IsNullOrWhiteSpace(RelatedEntityType);

            if (hasRelatedEntityType !=
                RelatedEntityId.HasValue)
            {
                yield return new ValidationResult(
                    "RelatedEntityType and RelatedEntityId must either " +
                    "both be provided or both be omitted.",
                    new[]
                    {
                        nameof(RelatedEntityType),
                        nameof(RelatedEntityId)
                    });
            }
        }
    }
}
