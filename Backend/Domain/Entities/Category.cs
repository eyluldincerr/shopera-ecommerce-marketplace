namespace Shopera.Domain.Entities
{
    public sealed class Category
    {
        public int CategoryId { get; set; }

        public string CategoryName { get; set; } =
            string.Empty;

        public string? Description { get; set; }

        public int? ParentCategoryId { get; set; }

        public int ManagedByAdminUserId { get; set; }

        public byte[]? CategoryImageData { get; set; }

        public string? CategoryImageContentType { get; set; }
    }
}
