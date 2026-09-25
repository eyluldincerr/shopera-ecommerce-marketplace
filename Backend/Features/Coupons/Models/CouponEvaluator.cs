using Shopera.Common.Exceptions;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;

namespace Shopera.Features.Coupons.Models;

public static class CouponEvaluator
{
    public static decimal ValidateAndCalculate(
        Coupon coupon,
        decimal subtotal,
        DateTime utcNow)
    {
        if (coupon.Status == CouponStatuses.Expired || coupon.ExpiryDate <= utcNow)
        {
            throw new RequestConflictException(
                CouponErrorCodes.Expired,
                "This coupon has expired.",
                new Dictionary<string, object?>
                {
                    ["couponCode"] = coupon.CouponCode,
                    ["expiryDate"] = coupon.ExpiryDate
                });
        }

        if (coupon.Status != CouponStatuses.Active)
        {
            throw new RequestConflictException(
                CouponErrorCodes.Inactive,
                "This coupon is not active.",
                new Dictionary<string, object?>
                {
                    ["couponCode"] = coupon.CouponCode,
                    ["couponStatus"] = coupon.Status
                });
        }

        if (subtotal < coupon.MinPurchaseAmount)
        {
            throw new RequestConflictException(
                CouponErrorCodes.MinimumNotMet,
                "The cart subtotal does not meet the coupon minimum purchase amount.",
                new Dictionary<string, object?>
                {
                    ["couponCode"] = coupon.CouponCode,
                    ["minimumPurchaseAmount"] = coupon.MinPurchaseAmount,
                    ["subtotalAmount"] = subtotal
                });
        }

        decimal discount = coupon.DiscountType switch
        {
            DiscountTypes.Percentage => subtotal * coupon.DiscountValue / 100m,
            DiscountTypes.FixedAmount => coupon.DiscountValue,
            _ => throw new RequestConflictException(
                CouponErrorCodes.UnsupportedDiscountType,
                "This coupon cannot be applied.")
        };

        return decimal.Round(
            Math.Min(Math.Max(discount, 0m), subtotal),
            2,
            MidpointRounding.AwayFromZero);
    }
}
