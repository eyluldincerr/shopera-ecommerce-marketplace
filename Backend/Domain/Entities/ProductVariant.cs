namespace Shopera.Domain.Entities
{
    public sealed class ProductVariant
    {
        public int VariantId { get; set; }

        public int ProductId { get; set; }

        public string Sku { get; set; } = string.Empty;

        public string? VariantName { get; set; }

        public string? Size { get; set; }

        public string? Color { get; set; }

        public string? StorageCapacity { get; set; }

        public decimal Price { get; set; }

        public decimal CostPrice { get; set; }

        public int StockQuantity { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public byte[] RowVersion { get; set; } =
            Array.Empty<byte>();

        public Product Product { get; set; } = null!;

        public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}
