namespace Shopera.Features.Buyer.Reviews.Models
{
    public static class ReviewErrorCodes
    {
        public const string BuyerForbidden = "BUYER_FORBIDDEN";
        public const string ProductNotFound =
            "PRODUCT_NOT_FOUND";
        public const string ProductNotReviewable =
            "PRODUCT_NOT_REVIEWABLE";
        public const string DeliveredOrderRequired =
            "REVIEW_DELIVERED_ORDER_REQUIRED";
        public const string ReviewAlreadyExists =
            "REVIEW_ALREADY_EXISTS";
        public const string ReviewNotFound =
            "REVIEW_NOT_FOUND";
        public const string InvalidReview = "REVIEW_INVALID";
    }
}
