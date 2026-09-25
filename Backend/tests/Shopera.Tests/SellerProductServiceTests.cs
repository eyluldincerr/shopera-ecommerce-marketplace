using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Shopera.Domain.Constants;
using Shopera.Features.Seller.Products.DTOs;
using Shopera.Features.Seller.Products.Models;
using Shopera.Features.Seller.Products.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests
{
    public sealed class SellerProductServiceTests
    {
        [Fact]
        public async Task Create_SavesCompleteDraftAggregate()
        {
            await using var database = await ReadyDatabaseAsync();
            var service =
                new SellerProductService(database.Context);

            var result = await service.CreateAsync(
                2,
                new CreateSellerProductRequest
                {
                    ProductName = "Latitude Laptop",
                    ProductCondition = ProductConditions.New,
                    CategoryId = 10,
                    Information = new UpsertProductInfoRequest
                    {
                        Specifications =
                            Json("{\"groups\":[]}")
                    },
                    Variants =
                    {
                        new CreateProductVariantRequest
                        {
                            Sku = "LAPTOP-16-512",
                            VariantName = "16GB / 512GB",
                            Price = 999m,
                            CostPrice = 700m,
                            StockQuantity = 8
                        }
                    }
                });

            Assert.True(result.Succeeded);
            Assert.Equal(
                ProductStatuses.Draft,
                result.Value!.Status);
            Assert.Empty(result.Value.Images);

            var imageBytes = new byte[]
            {
                0xFF, 0xD8, 0xFF, 0xE0
            };
            await using var imageStream =
                new MemoryStream(imageBytes);
            var imageFile = new FormFile(
                imageStream,
                0,
                imageBytes.Length,
                "File",
                "laptop.jpg");

            var imageResult = await service.AddImageAsync(
                2,
                result.Value.ProductId,
                new CreateProductImageRequest
                {
                    File = imageFile,
                    AltText = "Laptop",
                    DisplayOrder = 1,
                    IsPrimary = true
                });

            Assert.True(imageResult.Succeeded);
            Assert.True(
                imageResult.Value!.Images.Single().IsPrimary);
            Assert.Equal(
                700m,
                result.Value.Variants.Single().CostPrice);
            Assert.NotNull(result.Value.Information);
        }

        [Fact]
        public async Task Create_RejectsPendingStore()
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(2);
            var admin = TestData.ActiveAdmin(1);
            var store = TestData.ApprovedStore(20, 2);
            store.ApprovalStatus =
                StoreApprovalStatuses.Pending;
            database.Context.UserAccounts.AddRange(
                seller,
                admin);
            database.Context.Stores.Add(store);
            database.Context.Categories.Add(
                TestData.Category(10, 1));
            await database.Context.SaveChangesAsync();

            var service =
                new SellerProductService(database.Context);
            var result = await service.CreateAsync(
                seller.UserId,
                new CreateSellerProductRequest
                {
                    ProductName = "Hidden Product",
                    ProductCondition = ProductConditions.New,
                    CategoryId = 10
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                SellerProductErrorCodes.StoreNotReady,
                result.ErrorCode);
        }

        [Fact]
        public async Task Activate_RequiresPrimaryImageAndVariant()
        {
            await using var database = await ReadyDatabaseAsync();
            database.Context.Products.Add(
                TestData.Product(
                    30,
                    20,
                    10,
                    ProductStatuses.Draft));
            await database.Context.SaveChangesAsync();
            var service =
                new SellerProductService(database.Context);

            var result = await service.UpdateStatusAsync(
                2,
                30,
                new UpdateProductStatusRequest
                {
                    Status = ProductStatuses.Active
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                SellerProductErrorCodes.InvalidTransition,
                result.ErrorCode);
        }

        [Fact]
        public async Task Activate_PublishesCompleteProduct()
        {
            await using var database = await ReadyDatabaseAsync();
            database.Context.Products.Add(
                TestData.Product(
                    30,
                    20,
                    10,
                    ProductStatuses.Draft));
            database.Context.ProductImages.Add(
                TestData.PrimaryImage(40, 30));
            database.Context.ProductVariants.Add(
                TestData.Variant(50, 30, "PUBLISH-1"));
            await database.Context.SaveChangesAsync();
            var service =
                new SellerProductService(database.Context);

            var result = await service.UpdateStatusAsync(
                2,
                30,
                new UpdateProductStatusRequest
                {
                    Status = ProductStatuses.Active
                });

            Assert.True(result.Succeeded);
            Assert.Equal(
                ProductStatuses.Active,
                result.Value!.Status);
        }

        [Fact]
        public async Task UpdateVariant_TracksStockAndCost()
        {
            await using var database = await ReadyDatabaseAsync();
            database.Context.Products.Add(
                TestData.Product(30, 20, 10));
            database.Context.ProductImages.Add(
                TestData.PrimaryImage(40, 30));
            database.Context.ProductVariants.Add(
                TestData.Variant(50, 30, "STOCK-1"));
            await database.Context.SaveChangesAsync();
            var service =
                new SellerProductService(database.Context);

            var result = await service.UpdateVariantAsync(
                2,
                30,
                50,
                new UpdateProductVariantRequest
                {
                    StockQuantity = 0,
                    CostPrice = 24m,
                    RowVersion =
                        Convert.ToBase64String(
                            new byte[] { 1 })
                });

            Assert.True(result.Succeeded);
            Assert.Equal(
                ProductStatuses.OutOfStock,
                result.Value!.Status);
            Assert.Equal(
                ProductVariantStatuses.OutOfStock,
                result.Value.Variants.Single().Status);
            Assert.Equal(
                24m,
                result.Value.Variants.Single().CostPrice);
        }

        [Fact]
        public async Task GetInventory_PreservesProductAndVariantIds()
        {
            await using var database = await ReadyDatabaseAsync();
            database.Context.Products.Add(
                TestData.Product(30, 20, 10));
            database.Context.ProductImages.Add(
                TestData.PrimaryImage(40, 30));
            database.Context.ProductVariants.AddRange(
                TestData.Variant(
                    50,
                    30,
                    "STOCK-ONE",
                    stock: 4),
                TestData.Variant(
                    51,
                    30,
                    "STOCK-TWO",
                    stock: 20));
            await database.Context.SaveChangesAsync();
            var service =
                new SellerProductService(database.Context);

            var result = await service.GetInventoryAsync(
                2,
                "STOCK",
                10,
                null,
                1,
                20);

            Assert.True(result.Succeeded);
            Assert.All(
                result.Value!.Items,
                item => Assert.Equal(30, item.ProductId));
            Assert.Equal(
                new[] { 50, 51 },
                result.Value.Items
                    .Select(item => item.VariantId)
                    .ToArray());
            Assert.All(
                result.Value.Items,
                item => Assert.False(
                    string.IsNullOrWhiteSpace(
                        item.RowVersion)));
        }

        [Fact]
        public async Task GetMine_ReturnsRealReviewAggregate()
        {
            await using var database = await ReadyDatabaseAsync();
            database.Context.UserAccounts.AddRange(
                TestData.ActiveBuyer(3, "Buyer One"),
                TestData.ActiveBuyer(4, "Buyer Two"));
            database.Context.Products.Add(
                TestData.Product(30, 20, 10));
            database.Context.Reviews.AddRange(
                new Shopera.Domain.Entities.Review
                {
                    ReviewId = 60,
                    BuyerUserId = 3,
                    ProductId = 30,
                    Rating = 5,
                    Comment = "Excellent",
                    ReviewDate = DateTime.UtcNow
                },
                new Shopera.Domain.Entities.Review
                {
                    ReviewId = 61,
                    BuyerUserId = 4,
                    ProductId = 30,
                    Rating = 3,
                    Comment = "Good",
                    ReviewDate = DateTime.UtcNow
                });
            await database.Context.SaveChangesAsync();

            var service =
                new SellerProductService(database.Context);

            var result = await service.GetMineAsync(
                2,
                null,
                null,
                1,
                20);

            Assert.True(result.Succeeded);
            var product = Assert.Single(result.Value!.Items);
            Assert.Equal(2, product.ReviewCount);
            Assert.Equal(4m, product.AverageRating);
        }

        [Fact]
        public async Task Delete_SoftDeletesProductAndVariants()
        {
            await using var database = await ReadyDatabaseAsync();
            database.Context.Products.Add(
                TestData.Product(30, 20, 10));
            database.Context.ProductVariants.Add(
                TestData.Variant(50, 30, "DELETE-1"));
            await database.Context.SaveChangesAsync();
            var service =
                new SellerProductService(database.Context);

            var result = await service.DeleteAsync(2, 30);

            Assert.True(result.Succeeded);
            Assert.Equal(
                ProductStatuses.Deleted,
                (await database.Context.Products
                    .SingleAsync()).Status);
            Assert.Equal(
                ProductVariantStatuses.Deleted,
                (await database.Context.ProductVariants
                    .SingleAsync()).Status);
        }

        [Fact]
        public async Task DeleteVariant_HidesSoftDeletedVariant()
        {
            await using var database = await ReadyDatabaseAsync();
            database.Context.Products.Add(
                TestData.Product(30, 20, 10));
            database.Context.ProductVariants.Add(
                TestData.Variant(50, 30, "DELETE-VARIANT-1"));
            await database.Context.SaveChangesAsync();
            var service =
                new SellerProductService(database.Context);

            var result = await service.DeleteVariantAsync(
                2,
                30,
                50,
                new DeleteProductVariantRequest
                {
                    RowVersion = Convert.ToBase64String(
                        new byte[] { 1 })
                });

            Assert.True(result.Succeeded);
            Assert.Empty(result.Value!.Variants);
            Assert.Equal(
                ProductVariantStatuses.Deleted,
                (await database.Context.ProductVariants
                    .SingleAsync()).Status);
        }

        private static async Task<TestDatabase>
            ReadyDatabaseAsync()
        {
            var database = new TestDatabase();
            database.Context.UserAccounts.AddRange(
                TestData.ActiveAdmin(1),
                TestData.ActiveSeller(2));
            database.Context.Stores.Add(
                TestData.ApprovedStore(20, 2));
            database.Context.Categories.Add(
                TestData.Category(10, 1));
            await database.Context.SaveChangesAsync();
            return database;
        }

        private static JsonElement Json(string value)
        {
            using var document = JsonDocument.Parse(value);
            return document.RootElement.Clone();
        }
    }
}
