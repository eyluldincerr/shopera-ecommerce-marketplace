namespace Shopera.Features.Cart.DTOs.Responses;

public sealed class CartItemResponse
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
    public string? ImageUrl { get; init; }
    public int Quantity { get; init; }
    public decimal UnitPriceAtAdd { get; init; }
    public decimal CurrentUnitPrice { get; init; }
    public bool PriceChanged { get; init; }
    public decimal Subtotal { get; init; }
    public int AvailableStock { get; init; }
}
