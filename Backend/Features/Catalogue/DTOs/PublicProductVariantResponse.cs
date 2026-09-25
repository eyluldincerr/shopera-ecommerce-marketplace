namespace Shopera.Features.Catalogue.DTOs
{
    public sealed class PublicProductVariantResponse
    {
        public int VariantId { get; set; }

        public string Sku { get; set; } = string.Empty;

        public string? VariantName { get; set; }

        public string? Size { get; set; }

        public string? Color { get; set; }

        public string? StorageCapacity { get; set; }

        public decimal Price { get; set; }

        public int StockQuantity { get; set; }

        public string Status { get; set; } = string.Empty;

        public bool IsAvailable { get; set; }
    }
}
