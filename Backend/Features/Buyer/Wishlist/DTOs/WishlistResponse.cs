namespace Shopera.Features.Buyer.Wishlist.DTOs;

public sealed class WishlistResponse
{
    public int? WishlistId { get; init; }
    public int BuyerUserId { get; init; }
    public DateTime? CreatedDate { get; init; }
    public int ItemCount { get; init; }
    public IReadOnlyList<WishlistItemResponse> Items { get; init; } =
        Array.Empty<WishlistItemResponse>();
}
