namespace Shopera.Domain.Entities
{
    public sealed class Product
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public string? ShortDescription { get; set; }

        public string? Description { get; set; }

        public string? Brand { get; set; }

        public string? ModelNumber { get; set; }

        public string ProductCondition { get; set; } =
            string.Empty;

        public string? ConditionDescription { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public int StoreId { get; set; }

        public int CategoryId { get; set; }

        // Navigation property for images
        public ICollection<ProductImage> Images { get; set; } =
            new List<ProductImage>();
    }
}
