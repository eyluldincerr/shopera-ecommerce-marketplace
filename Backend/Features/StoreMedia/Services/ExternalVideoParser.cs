using Microsoft.AspNetCore.WebUtilities;
using System.Text.RegularExpressions;
using Shopera.Features.StoreMedia.Models;

namespace Shopera.Features.StoreMedia.Services
{
    internal sealed record ParsedExternalVideo(
        string Platform,
        string CanonicalUrl,
        string? VideoId,
        string? ThumbnailUrl,
        string? EmbedUrl);

    internal static partial class ExternalVideoParser
    {
        [GeneratedRegex("^[A-Za-z0-9_-]{6,32}$", RegexOptions.CultureInvariant)]
        private static partial Regex YouTubeIdRegex();

        public static bool TryParse(
            string? rawUrl,
            out ParsedExternalVideo? video)
        {
            video = null;

            var candidate = (rawUrl ?? string.Empty).Trim();

            if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri) ||
                !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var host = uri.Host.Trim().TrimEnd('.').ToLowerInvariant();

            if (TryParseYouTube(uri, host, out video))
            {
                return true;
            }

            if (IsTikTokHost(host))
            {
                video = new ParsedExternalVideo(
                    StoreMediaPlatforms.TikTok,
                    uri.AbsoluteUri,
                    null,
                    null,
                    null);

                return true;
            }

            return false;
        }

        private static bool TryParseYouTube(
            Uri uri,
            string host,
            out ParsedExternalVideo? video)
        {
            video = null;
            string? videoId = null;

            if (host == "youtu.be")
            {
                videoId = uri.AbsolutePath
                    .Trim('/')
                    .Split('/', StringSplitOptions.RemoveEmptyEntries)
                    .FirstOrDefault();
            }
            else if (host == "youtube.com" || host.EndsWith(".youtube.com", StringComparison.Ordinal))
            {
                var segments = uri.AbsolutePath
                    .Trim('/')
                    .Split('/', StringSplitOptions.RemoveEmptyEntries);

                if (segments.Length == 1 &&
                    string.Equals(segments[0], "watch", StringComparison.OrdinalIgnoreCase))
                {
                    var query = QueryHelpers.ParseQuery(uri.Query);
                    videoId = query.TryGetValue("v", out var value)
                        ? value.ToString()
                        : null;
                }
                else if (segments.Length >= 2 &&
                    (string.Equals(segments[0], "shorts", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(segments[0], "embed", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(segments[0], "live", StringComparison.OrdinalIgnoreCase)))
                {
                    videoId = segments[1];
                }
            }

            if (string.IsNullOrWhiteSpace(videoId) ||
                !YouTubeIdRegex().IsMatch(videoId))
            {
                return false;
            }

            var canonicalUrl = $"https://www.youtube.com/watch?v={videoId}";

            video = new ParsedExternalVideo(
                StoreMediaPlatforms.YouTube,
                canonicalUrl,
                videoId,
                $"https://i.ytimg.com/vi/{videoId}/hqdefault.jpg",
                $"https://www.youtube-nocookie.com/embed/{videoId}");

            return true;
        }

        private static bool IsTikTokHost(string host) =>
            host == "tiktok.com" ||
            host.EndsWith(".tiktok.com", StringComparison.Ordinal);
    }
}
