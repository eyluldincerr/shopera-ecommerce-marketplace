using System.Text.Json;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Catalogue.DTOs;
using Shopera.Features.Catalogue.Models;
using Shopera.Features.Catalogue.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests
{
    public sealed class ProductCatalogueServiceTests
    {
        [Fact]
        public async Task GetProducts_PagesOneThousandProducts()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            var createdDate =
                new DateTime(
                    2026,
                    7,
                    30,
                    10,
                    0,
                    0,
                    DateTimeKind.Utc);

            for (var id = 1; id <= 1000; id++)
            {
                var product = TestData.Product(
                        id,
                        20,
                        10,
                        ProductStatuses.Active,
                        $"Product {id:D4}");
                product.CreatedDate = createdDate;
                database.Context.Products.Add(product);
            }

            await database.Context.SaveChangesAsync();
            var service =
                new ProductCatalogueService(database.Context);

            var firstPage = await service.GetProductsAsync(
                new ProductCatalogueQuery
                {
                    Page = 1,
                    PageSize = 50
                });
            var secondPage = await service.GetProductsAsync(
                new ProductCatalogueQuery
                {
                    Page = 2,
                    PageSize = 50
                });

            Assert.True(firstPage.Succeeded);
            Assert.True(secondPage.Succeeded);
            Assert.Equal(1000, firstPage.Value!.TotalCount);
            Assert.Equal(20, firstPage.Value.TotalPages);
            Assert.Equal(50, firstPage.Value.Items.Count);
            Assert.Equal(1, firstPage.Value.Page);
            Assert.Empty(
                firstPage.Value.Items
                    .Select(item => item.ProductId)
                    .Intersect(
                        secondPage.Value!.Items.Select(
                            item => item.ProductId)));
            Assert.Equal(
                1000,
                firstPage.Value.Items[0].ProductId);
            Assert.Equal(
                951,
                firstPage.Value.Items[^1].ProductId);
            Assert.Equal(
                950,
                secondPage.Value!.Items[0].ProductId);
        }

        [Fact]
        public async Task GetProducts_HidesUnapprovedStore()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            var pendingSeller = TestData.ActiveSeller(3);
            var pendingStore =
                TestData.ApprovedStore(21, 3, "Pending Store");
            pendingStore.ApprovalStatus =
                StoreApprovalStatuses.Pending;
            database.Context.UserAccounts.Add(pendingSeller);
            database.Context.Stores.Add(pendingStore);
            database.Context.Products.AddRange(
                TestData.Product(
                    30,
                    20,
                    10,
                    ProductStatuses.Active,
                    "Visible Product"),
                TestData.Product(
                    31,
                    21,
                    10,
                    ProductStatuses.Active,
                    "Hidden Product"));
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result = await service.GetProductsAsync(
                new ProductCatalogueQuery());

            Assert.True(result.Succeeded);
            Assert.Single(result.Value!.Items);
            Assert.Equal(
                "Visible Product",
                result.Value.Items[0].ProductName);
        }

        [Fact]
        public async Task GetProduct_ReturnsAllBuyerSafeFields()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            database.Context.Products.Add(
                TestData.Product(30, 20, 10));
            database.Context.ProductImages.Add(
                TestData.PrimaryImage(40, 30));
            database.Context.ProductVariants.Add(
                TestData.Variant(
                    50,
                    30,
                    "PUBLIC-SKU",
                    costPrice: 12m));
            database.Context.ProductInfos.Add(
                new ProductInfo
                {
                    ProductInfoId = 60,
                    ProductId = 30,
                    ProductDetails =
                        "{\"items\":[{\"label\":\"Material\"," +
                        "\"value\":\"Steel\"}]}",
                    Specifications = "{\"groups\":[]}",
                    WhatsInTheBox = "{\"items\":[]}",
                    WarrantyInformation = "Two years",
                    CreatedDate = DateTime.UtcNow
                });
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result = await service.GetProductAsync(30);
            var json = JsonSerializer.Serialize(result.Value);

            Assert.True(result.Succeeded);
            Assert.Equal(
                "PUBLIC-SKU",
                result.Value!.Variants.Single().Sku);
            Assert.NotNull(result.Value.Information);
            Assert.False(
                json.Contains(
                    "CostPrice",
                    StringComparison.OrdinalIgnoreCase));
            Assert.False(
                json.Contains(
                    "RowVersion",
                    StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public async Task GetProducts_ReturnsDefaultVariantIdForProductCards()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            database.Context.Products.Add(
                TestData.Product(30, 20, 10));
            database.Context.ProductVariants.AddRange(
                TestData.Variant(50, 30, "OUT", stock: 0, price: 5m),
                TestData.Variant(51, 30, "IN-HIGH", stock: 4, price: 20m),
                TestData.Variant(52, 30, "IN-LOW", stock: 3, price: 12m));
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result = await service.GetProductsAsync(
                new ProductCatalogueQuery());

            Assert.True(result.Succeeded);
            var product = Assert.Single(result.Value!.Items);
            Assert.Equal(52, product.DefaultVariantId);
        }

        [Fact]
        public async Task GetProducts_RejectsInvalidPriceRange()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            var service =
                new ProductCatalogueService(database.Context);

            var result = await service.GetProductsAsync(
                new ProductCatalogueQuery
                {
                    MinimumPrice = 100m,
                    MaximumPrice = 10m
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                CatalogueErrorCodes.InvalidQuery,
                result.ErrorCode);
        }

        [Fact]
        public async Task GetRelatedProducts_UsesCategoryAndExcludesSource()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            database.Context.Products.AddRange(
                TestData.Product(
                    30,
                    20,
                    10,
                    ProductStatuses.Active,
                    "Source Product"),
                TestData.Product(
                    31,
                    20,
                    10,
                    ProductStatuses.Active,
                    "Related Product"));
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result =
                await service.GetRelatedProductsAsync(
                    30,
                    1,
                    4);

            Assert.True(result.Succeeded);
            Assert.Single(result.Value!.Items);
            Assert.Equal(
                31,
                result.Value.Items[0].ProductId);
        }

        [Fact]
        public async Task GetBrands_ReturnsOnlyVisibleBrandCounts()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            database.Context.Products.AddRange(
                TestData.Product(
                    30,
                    20,
                    10,
                    ProductStatuses.Active,
                    "Visible One"),
                TestData.Product(
                    31,
                    20,
                    10,
                    ProductStatuses.Active,
                    "Visible Two"),
                TestData.Product(
                    32,
                    20,
                    10,
                    ProductStatuses.Deleted,
                    "Hidden"));
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var brands = await service.GetBrandsAsync(20);

            Assert.Single(brands);
            Assert.Equal("Shopera Test", brands[0].Brand);
            Assert.Equal(2, brands[0].VisibleProductCount);
        }

        [Fact]
        public async Task GetProducts_FiltersBrandAndSortsName()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            var alpha = TestData.Product(
                30,
                20,
                10,
                ProductStatuses.Active,
                "Alpha Laptop");
            alpha.Brand = "Contoso";
            var zulu = TestData.Product(
                31,
                20,
                10,
                ProductStatuses.Active,
                "Zulu Laptop");
            zulu.Brand = "Contoso";
            var other = TestData.Product(
                32,
                20,
                10,
                ProductStatuses.Active,
                "Other Product");
            other.Brand = "Fabrikam";
            database.Context.Products.AddRange(
                zulu,
                other,
                alpha);
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result = await service.GetProductsAsync(
                new ProductCatalogueQuery
                {
                    Brand = "Contoso",
                    Sort = CatalogueSorts.NameAscending
                });

            Assert.True(result.Succeeded);
            Assert.Collection(
                result.Value!.Items,
                item => Assert.Equal(
                    "Alpha Laptop",
                    item.ProductName),
                item => Assert.Equal(
                    "Zulu Laptop",
                    item.ProductName));
        }


        [Fact]
        public async Task GetProducts_MinimumRatingExcludesLowAndUnratedProducts()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            var buyerOne = TestData.ActiveBuyer(3);
            var buyerTwo = TestData.ActiveBuyer(4);
            var topRated = TestData.Product(
                30,
                20,
                10,
                ProductStatuses.Active,
                "Top Rated Product");
            var lowRated = TestData.Product(
                31,
                20,
                10,
                ProductStatuses.Active,
                "Low Rated Product");
            var unrated = TestData.Product(
                32,
                20,
                10,
                ProductStatuses.Active,
                "Unrated Product");

            database.Context.UserAccounts.AddRange(
                buyerOne,
                buyerTwo);
            database.Context.Products.AddRange(
                topRated,
                lowRated,
                unrated);
            database.Context.Reviews.AddRange(
                new Review
                {
                    ReviewId = 70,
                    BuyerUserId = buyerOne.UserId,
                    ProductId = topRated.ProductId,
                    Rating = 5,
                    ReviewDate = DateTime.UtcNow
                },
                new Review
                {
                    ReviewId = 71,
                    BuyerUserId = buyerTwo.UserId,
                    ProductId = lowRated.ProductId,
                    Rating = 3,
                    ReviewDate = DateTime.UtcNow
                });
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result = await service.GetProductsAsync(
                new ProductCatalogueQuery
                {
                    MinimumRating = 4,
                    Sort = CatalogueSorts.RatingDescending
                });

            Assert.True(result.Succeeded);
            var product = Assert.Single(result.Value!.Items);
            Assert.Equal(30, product.ProductId);
            Assert.Equal(5, product.AverageRating);
            Assert.Equal(1, product.ReviewCount);
        }

        [Fact]
        public async Task GetProducts_NewArrivalsOnlyUsesRecentCreatedDate()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            var recent = TestData.Product(
                30,
                20,
                10,
                ProductStatuses.Active,
                "Recent Product");
            recent.CreatedDate = DateTime.UtcNow.AddDays(-5);
            var old = TestData.Product(
                31,
                20,
                10,
                ProductStatuses.Active,
                "Old Product");
            old.CreatedDate = DateTime.UtcNow.AddDays(-60);
            database.Context.Products.AddRange(recent, old);
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result = await service.GetProductsAsync(
                new ProductCatalogueQuery
                {
                    NewArrivalsOnly = true,
                    Sort = CatalogueSorts.Newest
                });

            Assert.True(result.Succeeded);
            var product = Assert.Single(result.Value!.Items);
            Assert.Equal(30, product.ProductId);
        }

        [Fact]
        public async Task GetProducts_BestSellingUsesDeliveredUnitsOnly()
        {
            await using var database =
                await PublicStoreDatabaseAsync();
            var buyer = TestData.ActiveBuyer(3);
            var first = TestData.Product(
                30,
                20,
                10,
                ProductStatuses.Active,
                "First Product");
            var second = TestData.Product(
                31,
                20,
                10,
                ProductStatuses.Active,
                "Second Product");
            var third = TestData.Product(
                32,
                20,
                10,
                ProductStatuses.Active,
                "No Sales Product");
            var firstVariant =
                TestData.Variant(50, 30, "FIRST");
            var secondVariant =
                TestData.Variant(51, 31, "SECOND");
            var thirdVariant =
                TestData.Variant(52, 32, "NO-SALES");

            database.Context.UserAccounts.Add(buyer);
            database.Context.Products.AddRange(first, second, third);
            database.Context.ProductVariants.AddRange(
                firstVariant,
                secondVariant,
                thirdVariant);
            database.Context.CustomerOrders.AddRange(
                new CustomerOrder
                {
                    OrderId = 60,
                    OrderNumber = "ORD-BEST-1",
                    BuyerUserId = buyer.UserId,
                    StoreId = 20,
                    OrderDate = DateTime.UtcNow,
                    OrderStatus = OrderStatuses.Delivered,
                    SubtotalAmount = 100m,
                    DiscountAmount = 0m,
                    ShippingAmount = 0m,
                    TotalAmount = 100m,
                    CurrencyCode = "EUR"
                },
                new CustomerOrder
                {
                    OrderId = 61,
                    OrderNumber = "ORD-BEST-2",
                    BuyerUserId = buyer.UserId,
                    StoreId = 20,
                    OrderDate = DateTime.UtcNow,
                    OrderStatus = OrderStatuses.Cancelled,
                    SubtotalAmount = 500m,
                    DiscountAmount = 0m,
                    ShippingAmount = 0m,
                    TotalAmount = 500m,
                    CurrencyCode = "EUR"
                });
            database.Context.OrderItems.AddRange(
                new OrderItem
                {
                    OrderItemId = 70,
                    OrderId = 60,
                    VariantId = 50,
                    ProductNameAtPurchase = "First Product",
                    SkuAtPurchase = "FIRST",
                    Quantity = 2,
                    UnitPriceAtPurchase = 50m,
                    UnitCostAtPurchase = 25m
                },
                new OrderItem
                {
                    OrderItemId = 71,
                    OrderId = 60,
                    VariantId = 51,
                    ProductNameAtPurchase = "Second Product",
                    SkuAtPurchase = "SECOND",
                    Quantity = 5,
                    UnitPriceAtPurchase = 20m,
                    UnitCostAtPurchase = 10m
                },
                new OrderItem
                {
                    OrderItemId = 72,
                    OrderId = 61,
                    VariantId = 50,
                    ProductNameAtPurchase = "First Product",
                    SkuAtPurchase = "FIRST",
                    Quantity = 100,
                    UnitPriceAtPurchase = 5m,
                    UnitCostAtPurchase = 2m
                });
            await database.Context.SaveChangesAsync();

            var service =
                new ProductCatalogueService(database.Context);
            var result = await service.GetProductsAsync(
                new ProductCatalogueQuery
                {
                    Sort = CatalogueSorts.BestSelling
                });

            Assert.True(result.Succeeded);
            Assert.Collection(
                result.Value!.Items,
                item => Assert.Equal(31, item.ProductId),
                item => Assert.Equal(30, item.ProductId));
        }

        private static async Task<TestDatabase>
            PublicStoreDatabaseAsync()
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
    }
}
