namespace Shopera.Features.Catalogue.DTOs
{
    public sealed class PublicBrandResponse
    {
        public string Brand { get; set; } = string.Empty;

        public int VisibleProductCount { get; set; }
    }
}
