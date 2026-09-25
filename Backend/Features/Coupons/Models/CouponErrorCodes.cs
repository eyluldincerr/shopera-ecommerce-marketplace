namespace Shopera.Features.Coupons.Models;

public static class CouponErrorCodes
{
    public const string NotFound = "COUPON_NOT_FOUND";
    public const string Inactive = "COUPON_INACTIVE";
    public const string Expired = "COUPON_EXPIRED";
    public const string MinimumNotMet = "COUPON_MINIMUM_NOT_MET";
    public const string CartEmpty = "COUPON_CART_EMPTY";
    public const string UnsupportedDiscountType = "COUPON_DISCOUNT_TYPE_UNSUPPORTED";
}
