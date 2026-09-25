namespace Shopera.Domain.Entities;

public sealed class Wishlist
{
    public int WishlistId { get; set; }

    public int BuyerUserId { get; set; }

    public DateTime CreatedDate { get; set; }

    public UserAccount BuyerUser { get; set; } = null!;

    public ICollection<WishlistItem> WishlistItems { get; set; } =
        new List<WishlistItem>();
}
