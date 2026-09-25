using Shopera.Common.Models;
using Shopera.Features.Admin.Coupons.DTOs;

namespace Shopera.Features.Admin.Coupons.Contracts;

public interface IAdminCouponService
{
    Task<ServiceResult<IReadOnlyList<AdminCouponResponse>>> GetAllAsync(int adminUserId);
    Task<ServiceResult<AdminCouponResponse>> CreateAsync(
        int adminUserId,
        CreateAdminCouponRequest request);
    Task<ServiceResult<AdminCouponResponse>> UpdateAsync(
        int adminUserId,
        int couponId,
        UpdateAdminCouponRequest request);
    Task<ServiceResult<bool>> DisableAsync(int adminUserId, int couponId);
}
