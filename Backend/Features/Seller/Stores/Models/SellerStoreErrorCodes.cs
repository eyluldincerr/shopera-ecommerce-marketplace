namespace Shopera.Features.Seller.Stores.Models
{
    public static class SellerStoreErrorCodes
    {
        public const string SellerForbidden =
            "SELLER_FORBIDDEN";
        public const string StoreNotFound =
            "SELLER_STORE_NOT_FOUND";
        public const string StoreAlreadyExists =
            "SELLER_STORE_ALREADY_EXISTS";
        public const string DuplicateStoreName =
            "STORE_NAME_DUPLICATE";
        public const string DuplicateStoreSlug =
            "STORE_SLUG_DUPLICATE";
        public const string InvalidStoreTransition =
            "STORE_STATUS_CONFLICT";
        public const string InvalidStore = "STORE_INVALID";
    }
}
