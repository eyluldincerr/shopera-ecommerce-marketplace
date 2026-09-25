namespace Shopera.Features.StoreMedia.DTOs
{
    public sealed class CreateStoreMediaRequest
    {
        public string Title { get; init; } = string.Empty;

        public string VideoUrl { get; init; } = string.Empty;

        public string Placement { get; init; } = string.Empty;
    }

    public sealed record StoreMediaResponse(
        int StoreMediaId,
        int StoreId,
        string StoreName,
        string? StoreSlug,
        string? StoreLogoUrl,
        string? StoreBannerUrl,
        string Title,
        string Placement,
        string Platform,
        string ExternalUrl,
        string? ThumbnailUrl,
        string? EmbedUrl,
        DateTime CreatedDate,
        DateTime? ExpiresAt);
}
