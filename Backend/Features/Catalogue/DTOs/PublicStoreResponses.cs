namespace Shopera.Features.Catalogue.DTOs
{
    public class PublicStoreCardResponse
    {
        public int StoreId { get; set; }

        public string StoreName { get; set; } = string.Empty;

        public string? StoreSlug { get; set; }

        public string? StoreDescription { get; set; }

        public string? StoreLogoUrl { get; set; }

        public string? StoreBannerUrl { get; set; }

        public int VisibleProductCount { get; set; }
    }

    public sealed class PublicStoreDetailResponse
        : PublicStoreCardResponse
    {
        public string? SupportEmail { get; set; }

        public string? SupportPhone { get; set; }

        public string? ReturnPolicy { get; set; }

        public string? SupportPolicy { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
