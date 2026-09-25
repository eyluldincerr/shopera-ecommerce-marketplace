using System.Text.Json;
using Shopera.Domain.Constants;
using Shopera.Features.Catalogue.DTOs;
using Shopera.Features.Catalogue.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests
{
    public sealed class ProductCatalogueImageTests
    {
        [Fact]
        public async Task Catalogue_GeneratesPrimaryImageUrlFromId()
        {
            await using var database =
                await PublicProductDatabaseAsync();
            var service =
                new ProductCatalogueService(database.Context);

            var result = await service.GetProductsAsync(
                new ProductCatalogueQuery
                {
                    Page = 1,
                    PageSize = 10
                });

            Assert.True(result.Succeeded);
            var product = Assert.Single(result.Value!.Items);
            Assert.Equal(40, product.PrimaryImageId);
            Assert.Equal(
                "/api/product-images/40/content",
                product.PrimaryImageUrl);
        }

        [Fact]
        public async Task Detail_OrdersImagesAndGeneratesUrls()
        {
            await using var database =
                await PublicProductDatabaseAsync();
            var secondary = TestData.PrimaryImage(41, 30);
            secondary.IsPrimary = false;
            secondary.DisplayOrder = 2;
            secondary.OriginalFileName = "side.jpg";
            database.Context.ProductImages.Add(secondary);
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result = await service.GetProductAsync(30);

            Assert.True(result.Succeeded);
            Assert.Equal(2, result.Value!.Images.Count);
            Assert.Equal(40, result.Value.Images[0].ImageId);
            Assert.Equal(41, result.Value.Images[1].ImageId);
            Assert.Equal(
                "/api/product-images/40/content",
                result.Value.Images[0].ImageUrl);
            Assert.Equal(
                "/api/product-images/41/content",
                result.Value.Images[1].ImageUrl);
        }

        [Fact]
        public async Task DetailJson_DoesNotExposeBinaryData()
        {
            await using var database =
                await PublicProductDatabaseAsync();
            var service =
                new ProductCatalogueService(database.Context);

            var result = await service.GetProductAsync(30);
            var json = JsonSerializer.Serialize(result.Value);

            Assert.True(result.Succeeded);
            Assert.DoesNotContain(
                "ImageData",
                json,
                StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(
                "OriginalFileName",
                json,
                StringComparison.OrdinalIgnoreCase);
        }

        private static async Task<TestDatabase>
            PublicProductDatabaseAsync()
        {
            var database = new TestDatabase();
            database.Context.UserAccounts.AddRange(
                TestData.ActiveAdmin(1),
                TestData.ActiveSeller(2));
            database.Context.Stores.Add(
                TestData.ApprovedStore(20, 2));
            database.Context.Categories.Add(
                TestData.Category(10, 1));
            database.Context.Products.Add(
                TestData.Product(
                    30,
                    20,
                    10,
                    ProductStatuses.Active));
            database.Context.ProductImages.Add(
                TestData.PrimaryImage(40, 30));
            database.Context.ProductVariants.Add(
                TestData.Variant(
                    50,
                    30,
                    "IMAGE-TEST-SKU"));
            await database.Context.SaveChangesAsync();
            return database;
        }
    }
}
