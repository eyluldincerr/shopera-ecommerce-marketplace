namespace Shopera.Domain.Entities
{
    public sealed class ProductInfo
    {
        public int ProductInfoId { get; set; }

        public int ProductId { get; set; }

        public string? ProductDetails { get; set; }

        public string? Specifications { get; set; }

        public string? WhatsInTheBox { get; set; }

        public string? WarrantyInformation { get; set; }

        public string? ReturnPolicy { get; set; }

        public string? CareInstructions { get; set; }

        public string? AdditionalInformation { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime? UpdatedDate { get; set; }
    }
}
