namespace Shopera.Features.Buyer.Wishlist.Models;

public static class WishlistErrorCodes
{
    public const string BuyerForbidden = "WISHLIST_BUYER_REQUIRED";
    public const string VariantNotFound = "WISHLIST_VARIANT_NOT_FOUND";
    public const string ItemUnavailable = "WISHLIST_ITEM_UNAVAILABLE";
    public const string InvalidVariant = "WISHLIST_INVALID_VARIANT";
}
