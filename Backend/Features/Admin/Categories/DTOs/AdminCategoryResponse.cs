namespace Shopera.Features.Admin.Categories.DTOs
{
    public sealed class AdminCategoryResponse
    {
        public int CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int? ParentCategoryId { get; set; }

        public string? ParentCategoryName { get; set; }

        public int ManagedByAdminUserId { get; set; }

        public int ChildCategoryCount { get; set; }

        // Compatibility alias used by the friend Admin frontend/backend contract.
        public int ChildCount => ChildCategoryCount;

        public int ProductCount { get; set; }

        public bool HasImage { get; set; }

        public string? ImageUrl => HasImage
            ? $"/api/categories/{CategoryId}/image"
            : null;
    }
}
