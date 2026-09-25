namespace Shopera.Features.Catalogue.DTOs
{
    public sealed class PublicProductCardResponse
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } =
            string.Empty;

        public string? ShortDescription { get; set; }

        public string? Brand { get; set; }

        public string ProductCondition { get; set; } =
            string.Empty;

        public string Status { get; set; } = string.Empty;

        public int StoreId { get; set; }

        public string StoreName { get; set; } = string.Empty;

        public string? StoreSlug { get; set; }

        public int CategoryId { get; set; }

        public string CategoryName { get; set; } =
            string.Empty;

        public int? PrimaryImageId { get; set; }

        public string? PrimaryImageUrl { get; set; }

        public string? PrimaryImageAltText { get; set; }

        public int? DefaultVariantId { get; set; }

        public decimal MinimumPrice { get; set; }

        public decimal MaximumPrice { get; set; }

        public int TotalStock { get; set; }

        public double AverageRating { get; set; }

        public int ReviewCount { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
