using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Shopera.Features.Seller.Products.DTOs;
using Shopera.Features.Seller.Products.Models;
using Shopera.Features.Seller.Products.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests
{
    public sealed class ProductImageServiceTests
    {
        [Theory]
        [InlineData("image.jpg", "image/jpeg")]
        [InlineData("image.jpeg", "image/jpeg")]
        public async Task Validator_AcceptsJpegExtensions(
            string fileName,
            string expectedContentType)
        {
            var validator = new ProductImageValidator();
            var file = File(
                fileName,
                new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 });

            var result =
                await validator.ValidateAndGetContentTypeAsync(
                    file);

            Assert.True(result.IsValid);
            Assert.Equal(expectedContentType, result.ContentType);
            Assert.Null(result.Error);
        }

        [Fact]
        public async Task Validator_AcceptsPngAndWebP()
        {
            var validator = new ProductImageValidator();
            var png = File(
                "image.png",
                new byte[]
                {
                    0x89, 0x50, 0x4E, 0x47,
                    0x0D, 0x0A, 0x1A, 0x0A
                });
            var webp = File(
                "image.webp",
                new byte[]
                {
                    0x52, 0x49, 0x46, 0x46,
                    0x04, 0x00, 0x00, 0x00,
                    0x57, 0x45, 0x42, 0x50
                });

            var pngResult =
                await validator.ValidateAndGetContentTypeAsync(
                    png);
            var webpResult =
                await validator.ValidateAndGetContentTypeAsync(
                    webp);

            Assert.True(pngResult.IsValid);
            Assert.Equal("image/png", pngResult.ContentType);
            Assert.True(webpResult.IsValid);
            Assert.Equal("image/webp", webpResult.ContentType);
        }

        [Fact]
        public async Task Validator_RejectsInvalidSignature()
        {
            var validator = new ProductImageValidator();
            var file = File(
                "fake.jpg",
                new byte[] { 0x00, 0x01, 0x02, 0x03 });

            var result =
                await validator.ValidateAndGetContentTypeAsync(
                    file);

            Assert.False(result.IsValid);
            Assert.Null(result.ContentType);
        }

        [Fact]
        public async Task CreateImage_StoresBinaryMetadata()
        {
            await using var database = new TestDatabase();
            var service = new ProductImageService();
            var validator = new ProductImageValidator();
            var bytes = new byte[]
            {
                0xFF, 0xD8, 0xFF, 0xE0
            };

            var result = await service.CreateImageAsync(
                10,
                new CreateProductImageRequest
                {
                    File = File("front.jpg", bytes),
                    AltText = "Front view",
                    DisplayOrder = 1,
                    IsPrimary = true
                },
                validator,
                database.Context);

            Assert.True(result.Succeeded);
            var saved = await database.Context.ProductImages
                .SingleAsync();
            Assert.Equal(bytes, saved.ImageData);
            Assert.Equal("image/jpeg", saved.ContentType);
            Assert.Equal("front.jpg", saved.OriginalFileName);
            Assert.True(saved.IsPrimary);
        }

        [Fact]
        public async Task CreateImage_RejectsDuplicateDisplayOrder()
        {
            await using var database = new TestDatabase();
            var service = new ProductImageService();
            var validator = new ProductImageValidator();

            await service.CreateImageAsync(
                10,
                Request("first.jpg", 1, true),
                validator,
                database.Context);

            var result = await service.CreateImageAsync(
                10,
                Request("second.jpg", 1, false),
                validator,
                database.Context);

            Assert.False(result.Succeeded);
            Assert.Equal(
                SellerProductErrorCodes.DuplicateDisplayOrder,
                result.ErrorCode);
        }

        [Fact]
        public async Task UpdateImage_ReplacesBytesAndPrimary()
        {
            await using var database = new TestDatabase();
            var service = new ProductImageService();
            var validator = new ProductImageValidator();

            var first = await service.CreateImageAsync(
                10,
                Request("first.jpg", 1, true),
                validator,
                database.Context);
            var second = await service.CreateImageAsync(
                10,
                Request("second.jpg", 2, false),
                validator,
                database.Context);

            var replacementBytes = new byte[]
            {
                0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A
            };
            var result = await service.UpdateImageAsync(
                second.Value!.ImageId,
                new UpdateProductImageRequest
                {
                    File = File("second.png", replacementBytes),
                    AltText = "Updated",
                    IsPrimary = true
                },
                validator,
                database.Context);

            Assert.True(result.Succeeded);
            Assert.Equal("image/png", result.Value!.ContentType);
            Assert.Equal(replacementBytes, result.Value.ImageData);

            var images = await database.Context.ProductImages
                .OrderBy(image => image.DisplayOrder)
                .ToListAsync();
            Assert.False(images[0].IsPrimary);
            Assert.True(images[1].IsPrimary);
        }

        [Fact]
        public async Task GetImageContent_ReturnsExactBytes()
        {
            await using var database = new TestDatabase();
            var service = new ProductImageService();
            var validator = new ProductImageValidator();
            var created = await service.CreateImageAsync(
                10,
                Request("content.jpg", 1, true),
                validator,
                database.Context);

            var result = await service.GetImageContentAsync(
                created.Value!.ImageId,
                database.Context);

            Assert.True(result.Succeeded);
            Assert.Equal("image/jpeg", result.Value.ContentType);
            Assert.Equal(
                new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 },
                result.Value.ImageData);
        }

        private static CreateProductImageRequest Request(
            string fileName,
            int displayOrder,
            bool isPrimary)
        {
            return new CreateProductImageRequest
            {
                File = File(
                    fileName,
                    new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }),
                DisplayOrder = displayOrder,
                IsPrimary = isPrimary
            };
        }

        private static IFormFile File(
            string fileName,
            byte[] bytes)
        {
            var stream = new MemoryStream(bytes);
            return new FormFile(
                stream,
                0,
                bytes.Length,
                "File",
                fileName);
        }
    }
}
