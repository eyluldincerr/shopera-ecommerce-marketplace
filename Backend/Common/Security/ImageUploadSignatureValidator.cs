namespace Shopera.Common.Security;

public static class ImageUploadSignatureValidator
{
    private static readonly byte[] JpegSignature =
        { 0xFF, 0xD8, 0xFF };

    private static readonly byte[] PngSignature =
    {
        0x89, 0x50, 0x4E, 0x47,
        0x0D, 0x0A, 0x1A, 0x0A
    };

    public static string? DetectSupportedContentType(
        ReadOnlySpan<byte> header)
    {
        if (header.StartsWith(JpegSignature))
        {
            return "image/jpeg";
        }

        if (header.StartsWith(PngSignature))
        {
            return "image/png";
        }

        if (header.Length >= 12 &&
            header[0] == (byte)'R' &&
            header[1] == (byte)'I' &&
            header[2] == (byte)'F' &&
            header[3] == (byte)'F' &&
            header[8] == (byte)'W' &&
            header[9] == (byte)'E' &&
            header[10] == (byte)'B' &&
            header[11] == (byte)'P')
        {
            return "image/webp";
        }

        return null;
    }

    public static bool ExtensionMatches(
        string? fileName,
        string contentType)
    {
        string extension = Path.GetExtension(fileName ?? string.Empty)
            .ToLowerInvariant();

        return contentType switch
        {
            "image/jpeg" => extension is ".jpg" or ".jpeg",
            "image/png" => extension == ".png",
            "image/webp" => extension == ".webp",
            _ => false
        };
    }
}
