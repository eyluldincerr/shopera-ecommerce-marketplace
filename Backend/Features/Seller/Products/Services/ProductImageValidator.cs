using Microsoft.AspNetCore.Http;

namespace Shopera.Features.Seller.Products.Services
{
    public interface IProductImageValidator
    {
        Task<(bool IsValid, string? ContentType, string? Error)>
            ValidateAndGetContentTypeAsync(
                IFormFile file,
                CancellationToken cancellationToken = default);
    }

    public sealed class ProductImageValidator
        : IProductImageValidator
    {
        public const long MaximumImageSizeBytes =
            5L * 1024L * 1024L;

        private static readonly byte[] JpegSignature =
            { 0xFF, 0xD8, 0xFF };

        private static readonly byte[] PngSignature =
        {
            0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A
        };

        public async Task<(bool IsValid, string? ContentType,
            string? Error)> ValidateAndGetContentTypeAsync(
                IFormFile file,
                CancellationToken cancellationToken = default)
        {
            if (file is null)
            {
                return (false, null, "Image file is required.");
            }

            if (file.Length <= 0)
            {
                return (false, null, "Image file cannot be empty.");
            }

            if (file.Length > MaximumImageSizeBytes)
            {
                return (
                    false,
                    null,
                    "Image file exceeds the maximum allowed size " +
                    "of 5 MB.");
            }

            var header = new byte[12];
            int bytesRead;

            try
            {
                await using var stream = file.OpenReadStream();
                bytesRead = await stream.ReadAsync(
                    header.AsMemory(0, header.Length),
                    cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch
            {
                return (
                    false,
                    null,
                    "The image file could not be read.");
            }

            var contentType = DetectContentType(header, bytesRead);
            if (contentType is null)
            {
                return (
                    false,
                    null,
                    "Image file format is not supported. " +
                    "Allowed formats: JPEG, PNG, WebP.");
            }

            if (!ExtensionMatches(file.FileName, contentType))
            {
                return (
                    false,
                    null,
                    "Image file extension does not match its " +
                    "actual format.");
            }

            return (true, contentType, null);
        }

        private static string? DetectContentType(
            byte[] header,
            int bytesRead)
        {
            if (StartsWith(header, bytesRead, JpegSignature))
            {
                return "image/jpeg";
            }

            if (StartsWith(header, bytesRead, PngSignature))
            {
                return "image/png";
            }

            if (bytesRead >= 12 &&
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

        private static bool StartsWith(
            byte[] header,
            int bytesRead,
            byte[] signature)
        {
            if (bytesRead < signature.Length)
            {
                return false;
            }

            for (var index = 0;
                index < signature.Length;
                index++)
            {
                if (header[index] != signature[index])
                {
                    return false;
                }
            }

            return true;
        }

        private static bool ExtensionMatches(
            string fileName,
            string contentType)
        {
            var extension = Path.GetExtension(fileName)
                .ToLowerInvariant();

            return contentType switch
            {
                "image/jpeg" =>
                    extension is ".jpg" or ".jpeg",
                "image/png" => extension == ".png",
                "image/webp" => extension == ".webp",
                _ => false
            };
        }
    }
}
