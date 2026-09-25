namespace Shopera.Domain.Entities
{
    public sealed class ProductImage
    {
        public int ImageId { get; set; }

        public int ProductId { get; set; }

        public byte[] ImageData { get; set; } = Array.Empty<byte>();

        public string ContentType { get; set; } = string.Empty;

        public string? OriginalFileName { get; set; }

        public string? AltText { get; set; }

        public int DisplayOrder { get; set; }

        public bool IsPrimary { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
