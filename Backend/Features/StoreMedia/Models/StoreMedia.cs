namespace Shopera.Features.StoreMedia.Models
{
    public sealed class StoreMedia
    {
        public int StoreMediaId { get; set; }

        public int StoreId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Placement { get; set; } = string.Empty;

        public string Platform { get; set; } = string.Empty;

        public string ExternalUrl { get; set; } = string.Empty;

        public string? ExternalVideoId { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime? ExpiresAt { get; set; }

        public bool IsActive { get; set; }

        public DateTime? RemovedDate { get; set; }
    }
}
