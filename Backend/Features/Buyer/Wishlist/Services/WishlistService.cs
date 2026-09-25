using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Buyer.Wishlist.Contracts;
using Shopera.Features.Buyer.Wishlist.DTOs;
using Shopera.Features.Buyer.Wishlist.Models;
using WishlistEntity = Shopera.Domain.Entities.Wishlist;
using WishlistItemEntity = Shopera.Domain.Entities.WishlistItem;

namespace Shopera.Features.Buyer.Wishlist.Services;

public sealed class WishlistService : IWishlistService
{
    private const string CurrencyCode = "EUR";
    private readonly ApplicationDbContext _context;

    public WishlistService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ServiceResult<WishlistResponse>> GetAsync(
        int buyerUserId)
    {
        if (!await IsActiveBuyerAsync(buyerUserId))
        {
            return Forbidden();
        }

        return ServiceResult<WishlistResponse>.Success(
            await BuildResponseAsync(buyerUserId));
    }

    public async Task<ServiceResult<WishlistResponse>> AddAsync(
        int buyerUserId,
        AddWishlistItemRequest request)
    {
        if (!await IsActiveBuyerAsync(buyerUserId))
        {
            return Forbidden();
        }

        if (request.VariantId < 1)
        {
            return ServiceResult<WishlistResponse>.Failure(
                WishlistErrorCodes.InvalidVariant,
                "Variant ID must be greater than zero.");
        }

        var variantState = await (
                from variant in _context.ProductVariants.AsNoTracking()
                join product in _context.Products.AsNoTracking()
                    on variant.ProductId equals product.ProductId
                join store in _context.Stores.AsNoTracking()
                    on product.StoreId equals store.StoreId
                where variant.VariantId == request.VariantId
                select new
                {
                    variant.VariantId,
                    VariantStatus = variant.Status,
                    ProductStatus = product.Status,
                    StoreApprovalStatus = store.ApprovalStatus,
                    StoreStatus = store.StoreStatus
                })
            .SingleOrDefaultAsync();

        if (variantState is null)
        {
            return ServiceResult<WishlistResponse>.Failure(
                WishlistErrorCodes.VariantNotFound,
                "The selected product variant was not found.");
        }

        bool canBeSaved =
            variantState.StoreApprovalStatus == StoreApprovalStatuses.Approved &&
            variantState.StoreStatus == StoreStatuses.Active &&
            variantState.ProductStatus is ProductStatuses.Active or ProductStatuses.OutOfStock &&
            variantState.VariantStatus is ProductVariantStatuses.Active or ProductVariantStatuses.OutOfStock;

        if (!canBeSaved)
        {
            return ServiceResult<WishlistResponse>.Failure(
                WishlistErrorCodes.ItemUnavailable,
                "This item is no longer available to save to favourites.");
        }

        WishlistEntity? wishlist = await _context.Wishlists
            .SingleOrDefaultAsync(item => item.BuyerUserId == buyerUserId);

        if (wishlist is null)
        {
            wishlist = new WishlistEntity
            {
                BuyerUserId = buyerUserId,
                CreatedDate = DateTime.UtcNow
            };

            _context.Wishlists.Add(wishlist);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                // Concurrent first-use requests may both try to create the one
                // authoritative wishlist. Reload the winner instead of failing.
                _context.ChangeTracker.Clear();
                wishlist = await _context.Wishlists
                    .SingleAsync(item => item.BuyerUserId == buyerUserId);
            }
        }

        bool alreadySaved = await _context.WishlistItems
            .AnyAsync(item =>
                item.WishlistId == wishlist.WishlistId &&
                item.VariantId == request.VariantId);

        if (!alreadySaved)
        {
            _context.WishlistItems.Add(new WishlistItemEntity
            {
                WishlistId = wishlist.WishlistId,
                VariantId = request.VariantId,
                AddedDate = DateTime.UtcNow
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                // Saving the same favourite twice is idempotent. Another request
                // already won the unique (WishlistID, VariantID) race.
                _context.ChangeTracker.Clear();
            }
        }

        return ServiceResult<WishlistResponse>.Success(
            await BuildResponseAsync(buyerUserId));
    }

    public async Task<ServiceResult<WishlistResponse>> RemoveAsync(
        int buyerUserId,
        int variantId)
    {
        if (!await IsActiveBuyerAsync(buyerUserId))
        {
            return Forbidden();
        }

        if (variantId < 1)
        {
            return ServiceResult<WishlistResponse>.Failure(
                WishlistErrorCodes.InvalidVariant,
                "Variant ID must be greater than zero.");
        }

        int? wishlistId = await _context.Wishlists
            .AsNoTracking()
            .Where(item => item.BuyerUserId == buyerUserId)
            .Select(item => (int?)item.WishlistId)
            .SingleOrDefaultAsync();

        if (wishlistId.HasValue)
        {
            WishlistItemEntity? item = await _context.WishlistItems
                .SingleOrDefaultAsync(saved =>
                    saved.WishlistId == wishlistId.Value &&
                    saved.VariantId == variantId);

            if (item is not null)
            {
                _context.WishlistItems.Remove(item);
                await _context.SaveChangesAsync();
            }
        }

        return ServiceResult<WishlistResponse>.Success(
            await BuildResponseAsync(buyerUserId));
    }

    public async Task<ServiceResult<WishlistResponse>> ClearAsync(
        int buyerUserId)
    {
        if (!await IsActiveBuyerAsync(buyerUserId))
        {
            return Forbidden();
        }

        int? wishlistId = await _context.Wishlists
            .AsNoTracking()
            .Where(item => item.BuyerUserId == buyerUserId)
            .Select(item => (int?)item.WishlistId)
            .SingleOrDefaultAsync();

        if (wishlistId.HasValue)
        {
            List<WishlistItemEntity> items = await _context.WishlistItems
                .Where(item => item.WishlistId == wishlistId.Value)
                .ToListAsync();

            if (items.Count > 0)
            {
                _context.WishlistItems.RemoveRange(items);
                await _context.SaveChangesAsync();
            }
        }

        return ServiceResult<WishlistResponse>.Success(
            await BuildResponseAsync(buyerUserId));
    }

    private async Task<WishlistResponse> BuildResponseAsync(int buyerUserId)
    {
        var header = await _context.Wishlists
            .AsNoTracking()
            .Where(wishlist => wishlist.BuyerUserId == buyerUserId)
            .Select(wishlist => new
            {
                wishlist.WishlistId,
                wishlist.BuyerUserId,
                wishlist.CreatedDate
            })
            .SingleOrDefaultAsync();

        if (header is null)
        {
            return new WishlistResponse
            {
                BuyerUserId = buyerUserId,
                ItemCount = 0,
                Items = Array.Empty<WishlistItemResponse>()
            };
        }

        List<WishlistItemProjection> projected = await (
                from item in _context.WishlistItems.AsNoTracking()
                join variant in _context.ProductVariants.AsNoTracking()
                    on item.VariantId equals variant.VariantId
                join product in _context.Products.AsNoTracking()
                    on variant.ProductId equals product.ProductId
                join store in _context.Stores.AsNoTracking()
                    on product.StoreId equals store.StoreId
                where item.WishlistId == header.WishlistId
                orderby item.AddedDate descending, item.WishlistItemId descending
                select new WishlistItemProjection
                {
                    WishlistItemId = item.WishlistItemId,
                    ProductId = product.ProductId,
                    VariantId = variant.VariantId,
                    StoreId = store.StoreId,
                    StoreName = store.StoreName,
                    ProductName = product.ProductName,
                    Sku = variant.Sku,
                    VariantName = variant.VariantName,
                    Size = variant.Size,
                    Color = variant.Color,
                    StorageCapacity = variant.StorageCapacity,
                    Price = variant.Price,
                    PrimaryImageId = _context.ProductImages
                        .Where(image => image.ProductId == product.ProductId)
                        .OrderByDescending(image => image.IsPrimary)
                        .ThenBy(image => image.DisplayOrder)
                        .ThenBy(image => image.ImageId)
                        .Select(image => (int?)image.ImageId)
                        .FirstOrDefault(),
                    ProductStatus = product.Status,
                    VariantStatus = variant.Status,
                    AvailableStock = variant.StockQuantity,
                    StoreApprovalStatus = store.ApprovalStatus,
                    StoreStatus = store.StoreStatus,
                    AddedDate = item.AddedDate
                })
            .ToListAsync();

        List<WishlistItemResponse> items = projected
            .Select(item =>
            {
                bool isProductVisible =
                    item.StoreApprovalStatus == StoreApprovalStatuses.Approved &&
                    item.StoreStatus == StoreStatuses.Active &&
                    item.ProductStatus is ProductStatuses.Active or ProductStatuses.OutOfStock;

                bool isAvailable =
                    isProductVisible &&
                    item.ProductStatus == ProductStatuses.Active &&
                    item.VariantStatus == ProductVariantStatuses.Active &&
                    item.AvailableStock > 0;

                return new WishlistItemResponse
                {
                    WishlistItemId = item.WishlistItemId,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    StoreId = item.StoreId,
                    StoreName = item.StoreName,
                    ProductName = item.ProductName,
                    Sku = item.Sku,
                    VariantName = item.VariantName,
                    Size = item.Size,
                    Color = item.Color,
                    StorageCapacity = item.StorageCapacity,
                    Price = item.Price,
                    CurrencyCode = CurrencyCode,
                    ImageUrl = item.PrimaryImageId.HasValue
                        ? $"/api/product-images/{item.PrimaryImageId.Value}/content"
                        : null,
                    ProductStatus = item.ProductStatus,
                    VariantStatus = item.VariantStatus,
                    AvailableStock = Math.Max(item.AvailableStock, 0),
                    IsProductVisible = isProductVisible,
                    IsAvailable = isAvailable,
                    AddedDate = item.AddedDate
                };
            })
            .ToList();

        return new WishlistResponse
        {
            WishlistId = header.WishlistId,
            BuyerUserId = header.BuyerUserId,
            CreatedDate = header.CreatedDate,
            ItemCount = items.Count,
            Items = items
        };
    }

    private async Task<bool> IsActiveBuyerAsync(int buyerUserId)
    {
        return buyerUserId > 0 &&
            await _context.UserAccounts
                .AsNoTracking()
                .AnyAsync(user =>
                    user.UserId == buyerUserId &&
                    user.Role == AccountRoles.Buyer &&
                    user.AccountStatus == AccountStatuses.Active);
    }

    private static ServiceResult<WishlistResponse> Forbidden()
    {
        return ServiceResult<WishlistResponse>.Failure(
            WishlistErrorCodes.BuyerForbidden,
            "An active buyer account is required.");
    }

    private sealed class WishlistItemProjection
    {
        public int WishlistItemId { get; init; }
        public int ProductId { get; init; }
        public int VariantId { get; init; }
        public int StoreId { get; init; }
        public string StoreName { get; init; } = string.Empty;
        public string ProductName { get; init; } = string.Empty;
        public string Sku { get; init; } = string.Empty;
        public string? VariantName { get; init; }
        public string? Size { get; init; }
        public string? Color { get; init; }
        public string? StorageCapacity { get; init; }
        public decimal Price { get; init; }
        public int? PrimaryImageId { get; init; }
        public string ProductStatus { get; init; } = string.Empty;
        public string VariantStatus { get; init; } = string.Empty;
        public int AvailableStock { get; init; }
        public string StoreApprovalStatus { get; init; } = string.Empty;
        public string StoreStatus { get; init; } = string.Empty;
        public DateTime AddedDate { get; init; }
    }
}
