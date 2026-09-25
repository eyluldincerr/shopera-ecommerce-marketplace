namespace Shopera.Features.Seller.Stores.DTOs
{
    public sealed class SellerStoreResponse
    {
        public int StoreId { get; set; }

        public int SellerUserId { get; set; }

        public string StoreName { get; set; } = string.Empty;

        public string? StoreSlug { get; set; }

        public string? StoreDescription { get; set; }

        public string? StoreLogoUrl { get; set; }

        public string? StoreBannerUrl { get; set; }

        public string? SupportEmail { get; set; }

        public string? SupportPhone { get; set; }

        public string? ReturnPolicy { get; set; }

        public string? SupportPolicy { get; set; }

        public string ApprovalStatus { get; set; } =
            string.Empty;

        public string StoreStatus { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public DateTime? UpdatedDate { get; set; }

        public string? LatestDecisionNote { get; set; }

        public int VisibleProductCount { get; set; }
    }
}
