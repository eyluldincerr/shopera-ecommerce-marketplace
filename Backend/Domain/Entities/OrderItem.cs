namespace Shopera.Domain.Entities
{
    public sealed class OrderItem
    {
        public int OrderItemId { get; set; }

        public int OrderId { get; set; }

        public int VariantId { get; set; }

        public string ProductNameAtPurchase { get; set; } = string.Empty;

        public string SkuAtPurchase { get; set; } = string.Empty;

        public string? VariantNameAtPurchase { get; set; }

        public int Quantity { get; set; }

        public decimal UnitPriceAtPurchase { get; set; }

        public decimal UnitCostAtPurchase { get; set; }

        public CustomerOrder CustomerOrder { get; set; } = null!;

        public ProductVariant ProductVariant { get; set; } = null!;
    }
}
