namespace Shopera.Features.Catalogue.DTOs
{
    public sealed class PublicProductImageResponse
    {
        public int ImageId { get; set; }

        public string? ImageUrl { get; set; }

        public string? AltText { get; set; }

        public int DisplayOrder { get; set; }

        public bool IsPrimary { get; set; }
    }
}
