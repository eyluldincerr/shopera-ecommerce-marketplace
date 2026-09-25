namespace Shopera.Features.Catalogue.DTOs
{
    public sealed class PublicCategoryResponse
    {
        public int CategoryId { get; set; }

        public string CategoryName { get; set; } =
            string.Empty;

        public string? Description { get; set; }

        public int? ParentCategoryId { get; set; }

        public string? ParentCategoryName { get; set; }

        public int VisibleProductCount { get; set; }

        public bool HasImage { get; set; }

        public string? ImageUrl => HasImage
            ? $"/api/categories/{CategoryId}/image"
            : null;
    }
}
