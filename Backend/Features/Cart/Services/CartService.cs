using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Cart.Contracts;
using Shopera.Features.Cart.DTOs.Requests;
using Shopera.Features.Cart.DTOs.Responses;
using Shopera.Features.Cart.Exceptions;
using Shopera.Features.Cart.Models;

using CartEntity = Shopera.Domain.Entities.Cart;

namespace Shopera.Features.Cart.Services;

public sealed class CartService : ICartService
{
    private const string Currency = "EUR";
    private readonly ApplicationDbContext _context;

    public CartService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CartResponse> GetAsync(int buyerUserId)
    {
        await RequireActiveBuyerAsync(buyerUserId);
        await GetOrCreateAsync(buyerUserId);
        return await BuildResponseAsync(buyerUserId);
    }

    public async Task<CartResponse> AddItemAsync(int buyerUserId, AddCartItemRequest request)
    {
        await RequireActiveBuyerAsync(buyerUserId);
        ProductVariant variant = await GetAvailableVariantAsync(request.VariantId, request.Quantity);
        CartEntity cart = await GetOrCreateAsync(buyerUserId);

        int? existingStoreId = cart.CartItems
            .Select(item => (int?)item.ProductVariant.Product.StoreId)
            .FirstOrDefault();

        if (existingStoreId.HasValue && existingStoreId.Value != variant.Product.StoreId)
        {
            throw new CartStoreConflictException(existingStoreId.Value, variant.Product.StoreId);
        }

        CartItem? item = cart.CartItems.SingleOrDefault(x => x.VariantId == variant.VariantId);
        int finalQuantity = request.Quantity + (item?.Quantity ?? 0);
        ValidateStock(variant, finalQuantity);

        if (item is null)
        {
            item = new CartItem
            {
                CartId = cart.CartId,
                VariantId = variant.VariantId,
                Quantity = finalQuantity,
                UnitPriceAtAdd = variant.Price,
                AddedDate = DateTime.UtcNow,
                ProductVariant = variant
            };
            cart.CartItems.Add(item);
        }
        else
        {
            // Preserve the original price snapshot. CurrentUnitPrice is returned
            // separately so the Buyer can be told when the catalogue price changed.
            item.Quantity = finalQuantity;
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
            when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
        {
            _context.ChangeTracker.Clear();
            throw new RequestConflictException(
                CartErrorCodes.ConcurrencyConflict,
                "Your cart changed at the same time. Please try the cart action again.");
        }

        return await BuildResponseAsync(buyerUserId);
    }

    public async Task<CartResponse> UpdateQuantityAsync(
        int buyerUserId,
        int variantId,
        UpdateCartItemQuantityRequest request)
    {
        await RequireActiveBuyerAsync(buyerUserId);
        CartEntity cart = await LoadRequiredAsync(buyerUserId);
        CartItem item = cart.CartItems.SingleOrDefault(x => x.VariantId == variantId)
            ?? throw new KeyNotFoundException("The item was not found in this cart.");
        ProductVariant variant = await GetAvailableVariantAsync(variantId, request.Quantity);
        ValidateStock(variant, request.Quantity);

        // Quantity changes must not rewrite the price-at-add snapshot.
        item.Quantity = request.Quantity;
        await _context.SaveChangesAsync();
        return await BuildResponseAsync(buyerUserId);
    }

    public async Task RemoveItemAsync(int buyerUserId, int variantId)
    {
        await RequireActiveBuyerAsync(buyerUserId);
        CartEntity cart = await LoadRequiredAsync(buyerUserId);
        CartItem item = cart.CartItems.SingleOrDefault(x => x.VariantId == variantId)
            ?? throw new KeyNotFoundException("The item was not found in this cart.");
        _context.CartItems.Remove(item);
        await _context.SaveChangesAsync();
    }

    public async Task ClearAsync(int buyerUserId)
    {
        await RequireActiveBuyerAsync(buyerUserId);
        CartEntity? cart = await LoadAsync(buyerUserId);
        if (cart is null || cart.CartItems.Count == 0)
        {
            return;
        }

        _context.CartItems.RemoveRange(cart.CartItems);
        await _context.SaveChangesAsync();
    }

    private async Task<CartEntity> GetOrCreateAsync(int buyerUserId)
    {
        CartEntity? cart = await LoadAsync(buyerUserId);
        if (cart is not null)
        {
            return cart;
        }

        cart = new CartEntity
        {
            BuyerUserId = buyerUserId,
            Status = CartStatuses.Active,
            CreatedDate = DateTime.UtcNow
        };
        _context.Carts.Add(cart);

        try
        {
            await _context.SaveChangesAsync();
            return cart;
        }
        catch (DbUpdateException exception)
            when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
        {
            // Two first-cart requests can race against the filtered unique index.
            // Treat the winner as authoritative and reload it instead of surfacing
            // a raw SQL/EF exception.
            _context.ChangeTracker.Clear();
            return await LoadAsync(buyerUserId)
                ?? throw new RequestConflictException(
                    CartErrorCodes.ConcurrencyConflict,
                    "Your cart changed at the same time. Please refresh and try again.");
        }
    }

    // Mutation queries need Product/Variant metadata, but intentionally never
    // Include PRODUCT_IMAGE. Product images contain VARBINARY(MAX) bytes and
    // must only be loaded by dedicated image-content endpoints.
    private Task<CartEntity?> LoadAsync(int buyerUserId) =>
        _context.Carts
            .Include(cart => cart.CartItems)
                .ThenInclude(item => item.ProductVariant)
                    .ThenInclude(variant => variant.Product)
            .SingleOrDefaultAsync(cart =>
                cart.BuyerUserId == buyerUserId && cart.Status == CartStatuses.Active);

    private async Task<CartEntity> LoadRequiredAsync(int buyerUserId) =>
        await LoadAsync(buyerUserId)
            ?? throw new KeyNotFoundException("The buyer does not have an active cart.");

    private async Task<ProductVariant> GetAvailableVariantAsync(int variantId, int requestedQuantity)
    {
        ProductVariant? variant = await _context.ProductVariants
            .Include(x => x.Product)
            .SingleOrDefaultAsync(x => x.VariantId == variantId);

        if (variant is null)
        {
            throw new KeyNotFoundException("The product variant was not found.");
        }

        Store? store = await _context.Stores
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.StoreId == variant.Product.StoreId);

        if (store is null ||
            store.ApprovalStatus != StoreApprovalStatuses.Approved ||
            store.StoreStatus != StoreStatuses.Active ||
            variant.Product.Status != ProductStatuses.Active ||
            variant.Status is ProductVariantStatuses.Inactive or ProductVariantStatuses.Deleted)
        {
            throw new RequestConflictException(
                CartErrorCodes.VariantUnavailable,
                "This item or variant is no longer available.",
                new Dictionary<string, object?> { ["variantId"] = variant.VariantId });
        }

        if (variant.Status == ProductVariantStatuses.OutOfStock || variant.StockQuantity <= 0)
        {
            throw new InsufficientStockException(
                variant.VariantId,
                requestedQuantity,
                Math.Max(variant.StockQuantity, 0));
        }

        return variant;
    }

    private async Task RequireActiveBuyerAsync(int buyerUserId)
    {
        bool allowed = buyerUserId > 0 && await _context.UserAccounts.AsNoTracking().AnyAsync(user =>
            user.UserId == buyerUserId &&
            user.Role == AccountRoles.Buyer &&
            user.AccountStatus == AccountStatuses.Active);

        if (!allowed)
        {
            throw new UnauthorizedAccessException("An active buyer account is required.");
        }
    }

    private static void ValidateStock(ProductVariant variant, int quantity)
    {
        if (quantity < 1 || quantity > variant.StockQuantity)
        {
            throw new InsufficientStockException(
                variant.VariantId,
                quantity,
                Math.Max(variant.StockQuantity, 0));
        }
    }

    private async Task<CartResponse> BuildResponseAsync(int buyerUserId)
    {
        CartHeaderProjection header = await _context.Carts
            .AsNoTracking()
            .Where(cart => cart.BuyerUserId == buyerUserId && cart.Status == CartStatuses.Active)
            .Select(cart => new CartHeaderProjection
            {
                CartId = cart.CartId,
                BuyerUserId = cart.BuyerUserId,
                CreatedDate = cart.CreatedDate,
                Status = cart.Status
            })
            .SingleOrDefaultAsync()
            ?? throw new KeyNotFoundException("The buyer does not have an active cart.");

        List<CartItemProjection> projectedItems = await _context.CartItems
            .AsNoTracking()
            .Where(item => item.CartId == header.CartId)
            .OrderBy(item => item.AddedDate)
            .Select(item => new CartItemProjection
            {
                CartItemId = item.CartItemId,
                ProductId = item.ProductVariant.Product.ProductId,
                VariantId = item.ProductVariant.VariantId,
                StoreId = item.ProductVariant.Product.StoreId,
                ProductName = item.ProductVariant.Product.ProductName,
                Sku = item.ProductVariant.Sku,
                VariantName = item.ProductVariant.VariantName,
                Size = item.ProductVariant.Size,
                Color = item.ProductVariant.Color,
                StorageCapacity = item.ProductVariant.StorageCapacity,
                PrimaryImageId = _context.ProductImages
                    .Where(image => image.ProductId == item.ProductVariant.Product.ProductId)
                    .OrderByDescending(image => image.IsPrimary)
                    .ThenBy(image => image.DisplayOrder)
                    .ThenBy(image => image.ImageId)
                    .Select(image => (int?)image.ImageId)
                    .FirstOrDefault(),
                Quantity = item.Quantity,
                UnitPriceAtAdd = item.UnitPriceAtAdd,
                CurrentUnitPrice = item.ProductVariant.Price,
                AvailableStock = item.ProductVariant.StockQuantity
            })
            .ToListAsync();

        List<CartItemResponse> items = projectedItems
            .Select(item => new CartItemResponse
            {
                CartItemId = item.CartItemId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                StoreId = item.StoreId,
                ProductName = item.ProductName,
                Sku = item.Sku,
                VariantName = item.VariantName,
                Size = item.Size,
                Color = item.Color,
                StorageCapacity = item.StorageCapacity,
                ImageUrl = item.PrimaryImageId.HasValue
                    ? $"/api/product-images/{item.PrimaryImageId.Value}/content"
                    : null,
                Quantity = item.Quantity,
                UnitPriceAtAdd = item.UnitPriceAtAdd,
                CurrentUnitPrice = item.CurrentUnitPrice,
                PriceChanged = item.UnitPriceAtAdd != item.CurrentUnitPrice,
                Subtotal = item.CurrentUnitPrice * item.Quantity,
                AvailableStock = item.AvailableStock
            })
            .ToList();

        return new CartResponse
        {
            CartId = header.CartId,
            BuyerUserId = header.BuyerUserId,
            CreatedDate = header.CreatedDate,
            Status = header.Status,
            CurrencyCode = Currency,
            TotalQuantity = items.Sum(item => item.Quantity),
            TotalAmount = items.Sum(item => item.Subtotal),
            Items = items
        };
    }

    private sealed class CartHeaderProjection
    {
        public int CartId { get; init; }
        public int BuyerUserId { get; init; }
        public DateTime CreatedDate { get; init; }
        public string Status { get; init; } = string.Empty;
    }

    private sealed class CartItemProjection
    {
        public int CartItemId { get; init; }
        public int ProductId { get; init; }
        public int VariantId { get; init; }
        public int StoreId { get; init; }
        public string ProductName { get; init; } = string.Empty;
        public string Sku { get; init; } = string.Empty;
        public string? VariantName { get; init; }
        public string? Size { get; init; }
        public string? Color { get; init; }
        public string? StorageCapacity { get; init; }
        public int? PrimaryImageId { get; init; }
        public int Quantity { get; init; }
        public decimal UnitPriceAtAdd { get; init; }
        public decimal CurrentUnitPrice { get; init; }
        public int AvailableStock { get; init; }
    }
}
