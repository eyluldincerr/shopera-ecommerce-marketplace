namespace Shopera.Domain.Entities;

public sealed class WishlistItem
{
    public int WishlistItemId { get; set; }

    public int WishlistId { get; set; }

    public int VariantId { get; set; }

    public DateTime AddedDate { get; set; }

    public Wishlist Wishlist { get; set; } = null!;

    public ProductVariant ProductVariant { get; set; } = null!;
}
