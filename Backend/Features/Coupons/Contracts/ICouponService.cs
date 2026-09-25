using Shopera.Features.Coupons.DTOs;

namespace Shopera.Features.Coupons.Contracts;

public interface ICouponService
{
    Task<IReadOnlyList<BuyerCouponResponse>> GetAvailableAsync(int buyerUserId);
    Task<CouponValidationResponse> ValidateForCartAsync(
        int buyerUserId,
        string couponCode);
}
