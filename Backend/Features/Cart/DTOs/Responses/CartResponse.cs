namespace Shopera.Features.Cart.DTOs.Responses;

public sealed class CartResponse
{
    public int CartId { get; init; }
    public int BuyerUserId { get; init; }
    public DateTime CreatedDate { get; init; }
    public string Status { get; init; } = string.Empty;
    public string CurrencyCode { get; init; } = "EUR";
    public int TotalQuantity { get; init; }
    public decimal TotalAmount { get; init; }
    public IReadOnlyList<CartItemResponse> Items { get; init; } = [];
}
