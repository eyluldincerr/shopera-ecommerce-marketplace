namespace Shopera.Features.Catalogue.DTOs
{
    public sealed class PublicProductDetailResponse
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } =
            string.Empty;

        public string? ShortDescription { get; set; }

        public string? Description { get; set; }

        public string? Brand { get; set; }

        public string? ModelNumber { get; set; }

        public string ProductCondition { get; set; } =
            string.Empty;

        public string? ConditionDescription { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public PublicStoreDetailResponse Store { get; set; } =
            new();

        public PublicCategoryResponse Category { get; set; } =
            new();

        public PublicProductInfoResponse? Information
        {
            get;
            set;
        }

        public IReadOnlyList<PublicProductImageResponse> Images
        {
            get;
            set;
        } = Array.Empty<PublicProductImageResponse>();

        public IReadOnlyList<PublicProductVariantResponse>
            Variants { get; set; } =
                Array.Empty<PublicProductVariantResponse>();

        public double AverageRating { get; set; }

        public int ReviewCount { get; set; }
    }
}
