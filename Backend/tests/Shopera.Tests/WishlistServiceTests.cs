using Microsoft.EntityFrameworkCore;
using Shopera.Domain.Constants;
using Shopera.Features.Buyer.Wishlist.DTOs;
using Shopera.Features.Buyer.Wishlist.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests;

public sealed class WishlistServiceTests
{
    [Fact]
    public async Task AddAndRead_PersistRealWishlistAndProjectImageMetadata()
    {
        await using var database = new TestDatabase();
        await SeedAsync(database, stock: 5);
        var service = new WishlistService(database.Context);

        var added = await service.AddAsync(
            20,
            new AddWishlistItemRequest { VariantId = 1000 });

        Assert.True(added.Succeeded);
        var item = Assert.Single(added.Value!.Items);
        Assert.Equal(100, item.ProductId);
        Assert.Equal(1000, item.VariantId);
        Assert.Equal("Test Store", item.StoreName);
        Assert.Equal(49.99m, item.Price);
        Assert.Equal("EUR", item.CurrencyCode);
        Assert.Equal("/api/product-images/500/content", item.ImageUrl);
        Assert.True(item.IsProductVisible);
        Assert.True(item.IsAvailable);

        Assert.Single(await database.Context.Wishlists.ToListAsync());
        Assert.Single(await database.Context.WishlistItems.ToListAsync());

        database.Context.ChangeTracker.Clear();
        var read = await service.GetAsync(20);

        Assert.True(read.Succeeded);
        Assert.Single(read.Value!.Items);
        Assert.Empty(database.Context.ChangeTracker.Entries<Shopera.Domain.Entities.ProductImage>());
    }

    [Fact]
    public async Task Add_IsIdempotentAndRemoveAndClearAreSafe()
    {
        await using var database = new TestDatabase();
        await SeedAsync(database, stock: 5);
        var service = new WishlistService(database.Context);

        await service.AddAsync(20, new AddWishlistItemRequest { VariantId = 1000 });
        var secondAdd = await service.AddAsync(20, new AddWishlistItemRequest { VariantId = 1000 });

        Assert.True(secondAdd.Succeeded);
        Assert.Single(secondAdd.Value!.Items);
        Assert.Single(await database.Context.WishlistItems.ToListAsync());

        var removed = await service.RemoveAsync(20, 1000);
        Assert.True(removed.Succeeded);
        Assert.Empty(removed.Value!.Items);

        var removedAgain = await service.RemoveAsync(20, 1000);
        Assert.True(removedAgain.Succeeded);
        Assert.Empty(removedAgain.Value!.Items);

        var cleared = await service.ClearAsync(20);
        Assert.True(cleared.Succeeded);
        Assert.Empty(cleared.Value!.Items);
    }

    [Fact]
    public async Task OutOfStockVariant_CanRemainFavouriteButIsNotPurchasable()
    {
        await using var database = new TestDatabase();
        await SeedAsync(database, stock: 0);
        var service = new WishlistService(database.Context);

        var result = await service.AddAsync(
            20,
            new AddWishlistItemRequest { VariantId = 1000 });

        Assert.True(result.Succeeded);
        var item = Assert.Single(result.Value!.Items);
        Assert.True(item.IsProductVisible);
        Assert.False(item.IsAvailable);
        Assert.Equal(ProductVariantStatuses.OutOfStock, item.VariantStatus);
    }

    private static async Task SeedAsync(TestDatabase database, int stock)
    {
        var buyer = TestData.ActiveBuyer(20);
        var seller = TestData.ActiveSeller(10);
        var store = TestData.ApprovedStore(30, seller.UserId, "Test Store");
        var product = TestData.Product(
            100,
            store.StoreId,
            40,
            stock > 0 ? ProductStatuses.Active : ProductStatuses.OutOfStock,
            "Laptop");
        var variant = TestData.Variant(
            1000,
            product.ProductId,
            "SKU-1000",
            stock: stock);
        var image = TestData.PrimaryImage(500, product.ProductId);

        database.Context.AddRange(buyer, seller, store, product, variant, image);
        await database.Context.SaveChangesAsync();
    }
}
