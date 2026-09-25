namespace Shopera.Features.Buyer.Wishlist.DTOs;

public sealed class WishlistItemResponse
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
    public string CurrencyCode { get; init; } = "EUR";
    public string? ImageUrl { get; init; }
    public string ProductStatus { get; init; } = string.Empty;
    public string VariantStatus { get; init; } = string.Empty;
    public int AvailableStock { get; init; }
    public bool IsProductVisible { get; init; }
    public bool IsAvailable { get; init; }
    public DateTime AddedDate { get; init; }
}
