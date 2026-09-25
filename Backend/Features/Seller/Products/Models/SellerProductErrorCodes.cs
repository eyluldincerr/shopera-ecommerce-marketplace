namespace Shopera.Features.Seller.Products.Models
{
    public static class SellerProductErrorCodes
    {
        public const string SellerForbidden = "SELLER_FORBIDDEN";
        public const string StoreNotReady = "STORE_NOT_READY";
        public const string ProductNotFound = "PRODUCT_NOT_FOUND";
        public const string CategoryNotFound = "CATEGORY_NOT_FOUND";
        public const string ImageNotFound = "PRODUCT_IMAGE_NOT_FOUND";
        public const string VariantNotFound =
            "PRODUCT_VARIANT_NOT_FOUND";
        public const string DuplicateSku = "DUPLICATE_SKU";
        public const string DuplicateVariantOptions =
            "DUPLICATE_VARIANT_OPTIONS";
        public const string DuplicateDisplayOrder =
            "DUPLICATE_IMAGE_DISPLAY_ORDER";
        public const string ImageConcurrencyConflict =
            "PRODUCT_IMAGE_CONCURRENCY_CONFLICT";
        public const string ProductConcurrencyConflict =
            "PRODUCT_CONCURRENCY_CONFLICT";
        public const string InvalidProduct = "INVALID_PRODUCT";
        public const string ImageFileRequired = "IMAGE_FILE_REQUIRED";
        public const string ImageFileEmpty = "IMAGE_FILE_EMPTY";
        public const string ImageFileTooLarge = "IMAGE_FILE_TOO_LARGE";
        public const string ImageTypeNotSupported = "IMAGE_TYPE_NOT_SUPPORTED";
        public const string ImageFileInvalid = "IMAGE_FILE_INVALID";
        public const string InvalidInformation =
            "INVALID_PRODUCT_INFORMATION";
        public const string InvalidTransition =
            "INVALID_PRODUCT_TRANSITION";
        public const string ConcurrencyConflict =
            "VARIANT_CONCURRENCY_CONFLICT";
    }
}
