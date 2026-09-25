namespace Shopera.Features.Cart.Models;

public static class CartErrorCodes
{
    public const string InsufficientStock = "INSUFFICIENT_STOCK";
    public const string StoreConflict = "CART_STORE_CONFLICT";
    public const string VariantUnavailable = "VARIANT_UNAVAILABLE";
    public const string ConcurrencyConflict = "CART_CONCURRENCY_CONFLICT";
}
