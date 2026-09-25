using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Admin.Coupons.Contracts;
using Shopera.Features.Admin.Coupons.DTOs;
using Shopera.Features.Admin.Coupons.Models;

namespace Shopera.Features.Admin.Coupons.Services;

public sealed class AdminCouponService : IAdminCouponService
{
    private readonly ApplicationDbContext _context;

    public AdminCouponService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ServiceResult<IReadOnlyList<AdminCouponResponse>>> GetAllAsync(
        int adminUserId)
    {
        if (!await IsActiveAdminAsync(adminUserId))
        {
            return Forbidden<IReadOnlyList<AdminCouponResponse>>();
        }

        var coupons = await _context.Coupons
            .AsNoTracking()
            .OrderByDescending(coupon => coupon.CouponId)
            .Select(coupon => new AdminCouponProjection(
                coupon.CouponId,
                coupon.CouponCode,
                coupon.DiscountType,
                coupon.DiscountValue,
                coupon.ExpiryDate,
                coupon.MinPurchaseAmount,
                coupon.UsageLimit,
                coupon.Status,
                coupon.CustomerOrders.Count))
            .ToListAsync();

        DateTime now = DateTime.UtcNow;
        return ServiceResult<IReadOnlyList<AdminCouponResponse>>.Success(
            coupons.Select(item => Map(item, now)).ToList());
    }

    public async Task<ServiceResult<AdminCouponResponse>> CreateAsync(
        int adminUserId,
        CreateAdminCouponRequest request)
    {
        if (!await IsActiveAdminAsync(adminUserId))
        {
            return Forbidden<AdminCouponResponse>();
        }

        string code = NormalizeCode(request.CouponCode);
        string discountType = NormalizeToken(request.DiscountType);
        string status = NormalizeToken(request.Status, CouponStatuses.Active);

        string? invalid = ValidateValues(
            code,
            discountType,
            request.DiscountValue,
            request.ExpiryDate,
            request.MinPurchaseAmount,
            request.UsageLimit,
            status);
        if (invalid is not null)
        {
            return Invalid<AdminCouponResponse>(invalid);
        }

        if (await IsDuplicateAsync(null, code))
        {
            return Duplicate<AdminCouponResponse>();
        }

        var coupon = new Coupon
        {
            CouponCode = code,
            DiscountType = discountType,
            DiscountValue = request.DiscountValue,
            ExpiryDate = request.ExpiryDate,
            MinPurchaseAmount = request.MinPurchaseAmount,
            UsageLimit = request.UsageLimit,
            Status = status
        };

        _context.Coupons.Add(coupon);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
            when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
        {
            _context.ChangeTracker.Clear();
            return Duplicate<AdminCouponResponse>();
        }

        return ServiceResult<AdminCouponResponse>.Success(await MapAsync(coupon.CouponId));
    }

    public async Task<ServiceResult<AdminCouponResponse>> UpdateAsync(
        int adminUserId,
        int couponId,
        UpdateAdminCouponRequest request)
    {
        if (!await IsActiveAdminAsync(adminUserId))
        {
            return Forbidden<AdminCouponResponse>();
        }

        Coupon? coupon = await _context.Coupons
            .SingleOrDefaultAsync(item => item.CouponId == couponId);
        if (coupon is null)
        {
            return NotFound<AdminCouponResponse>();
        }

        string code = request.CouponCode is null
            ? coupon.CouponCode
            : NormalizeCode(request.CouponCode);
        string discountType = request.DiscountType is null
            ? coupon.DiscountType
            : NormalizeToken(request.DiscountType);
        decimal discountValue = request.DiscountValue ?? coupon.DiscountValue;
        DateTime expiryDate = request.ExpiryDate ?? coupon.ExpiryDate;
        decimal minPurchaseAmount = request.MinPurchaseAmount ?? coupon.MinPurchaseAmount;
        int? usageLimit = request.UpdateUsageLimit ? request.UsageLimit : coupon.UsageLimit;
        string status = request.Status is null
            ? coupon.Status
            : NormalizeToken(request.Status);

        string? invalid = ValidateValues(
            code,
            discountType,
            discountValue,
            expiryDate,
            minPurchaseAmount,
            usageLimit,
            status);
        if (invalid is not null)
        {
            return Invalid<AdminCouponResponse>(invalid);
        }

        if (await IsDuplicateAsync(couponId, code))
        {
            return Duplicate<AdminCouponResponse>();
        }

        coupon.CouponCode = code;
        coupon.DiscountType = discountType;
        coupon.DiscountValue = discountValue;
        coupon.ExpiryDate = expiryDate;
        coupon.MinPurchaseAmount = minPurchaseAmount;
        coupon.UsageLimit = usageLimit;
        coupon.Status = status;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
            when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
        {
            _context.ChangeTracker.Clear();
            return Duplicate<AdminCouponResponse>();
        }

        return ServiceResult<AdminCouponResponse>.Success(await MapAsync(couponId));
    }

    public async Task<ServiceResult<bool>> DisableAsync(
        int adminUserId,
        int couponId)
    {
        if (!await IsActiveAdminAsync(adminUserId))
        {
            return Forbidden<bool>();
        }

        Coupon? coupon = await _context.Coupons
            .SingleOrDefaultAsync(item => item.CouponId == couponId);
        if (coupon is null)
        {
            return NotFound<bool>();
        }

        coupon.Status = CouponStatuses.Disabled;
        await _context.SaveChangesAsync();
        return ServiceResult<bool>.Success(true);
    }

    private async Task<AdminCouponResponse> MapAsync(int couponId)
    {
        var item = await _context.Coupons
            .AsNoTracking()
            .Where(coupon => coupon.CouponId == couponId)
            .Select(coupon => new AdminCouponProjection(
                coupon.CouponId,
                coupon.CouponCode,
                coupon.DiscountType,
                coupon.DiscountValue,
                coupon.ExpiryDate,
                coupon.MinPurchaseAmount,
                coupon.UsageLimit,
                coupon.Status,
                coupon.CustomerOrders.Count))
            .SingleAsync();

        return Map(item, DateTime.UtcNow);
    }

    private static AdminCouponResponse Map(AdminCouponProjection item, DateTime now)
    {
        bool isExpired = item.ExpiryDate <= now;
        return new AdminCouponResponse
        {
            CouponId = item.CouponId,
            CouponCode = item.CouponCode,
            DiscountType = item.DiscountType,
            DiscountValue = item.DiscountValue,
            ExpiryDate = item.ExpiryDate,
            MinPurchaseAmount = item.MinPurchaseAmount,
            UsageLimit = item.UsageLimit,
            Status = item.Status,
            IsExpired = isExpired,
            IsUsable = item.Status == CouponStatuses.Active && !isExpired,
            AppliedOrderCount = item.AppliedOrderCount,
            UsageTrackingEnforced = false
        };
    }

    private sealed record AdminCouponProjection(
        int CouponId,
        string CouponCode,
        string DiscountType,
        decimal DiscountValue,
        DateTime ExpiryDate,
        decimal MinPurchaseAmount,
        int? UsageLimit,
        string Status,
        int AppliedOrderCount);

    private Task<bool> IsActiveAdminAsync(int adminUserId) =>
        _context.UserAccounts.AsNoTracking().AnyAsync(user =>
            user.UserId == adminUserId &&
            user.Role == AccountRoles.Admin &&
            user.AccountStatus == AccountStatuses.Active);

    private Task<bool> IsDuplicateAsync(int? couponId, string code) =>
        _context.Coupons.AnyAsync(item =>
            (!couponId.HasValue || item.CouponId != couponId.Value) &&
            item.CouponCode.ToUpper() == code);

    private static string? ValidateValues(
        string code,
        string discountType,
        decimal discountValue,
        DateTime expiryDate,
        decimal minPurchaseAmount,
        int? usageLimit,
        string status)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length > 50)
        {
            return "CouponCode is required and must be 50 characters or fewer.";
        }

        if (!DiscountTypes.All.Contains(discountType))
        {
            return "DiscountType must be PERCENTAGE or FIXED_AMOUNT.";
        }

        if (discountValue <= 0m ||
            (discountType == DiscountTypes.Percentage && discountValue > 100m))
        {
            return "DiscountValue must be positive and percentage discounts cannot exceed 100.";
        }

        if (expiryDate == default)
        {
            return "ExpiryDate is required.";
        }

        if (minPurchaseAmount < 0m)
        {
            return "MinPurchaseAmount cannot be negative.";
        }

        if (usageLimit is <= 0)
        {
            return "UsageLimit must be null or greater than zero.";
        }

        if (!CouponStatuses.All.Contains(status))
        {
            return "Status must be ACTIVE, EXPIRED, or DISABLED.";
        }

        if (status == CouponStatuses.Active && expiryDate <= DateTime.UtcNow)
        {
            return "An ACTIVE coupon must have a future ExpiryDate.";
        }

        return null;
    }

    private static string NormalizeCode(string value) =>
        (value ?? string.Empty).Trim().ToUpperInvariant();

    private static string NormalizeToken(string? value, string fallback = "") =>
        string.IsNullOrWhiteSpace(value)
            ? fallback
            : value.Trim().ToUpperInvariant();

    private static ServiceResult<T> Forbidden<T>() =>
        ServiceResult<T>.Failure(
            AdminCouponErrorCodes.AdminForbidden,
            "An active admin account is required.");

    private static ServiceResult<T> NotFound<T>() =>
        ServiceResult<T>.Failure(
            AdminCouponErrorCodes.CouponNotFound,
            "Coupon not found.");

    private static ServiceResult<T> Duplicate<T>() =>
        ServiceResult<T>.Failure(
            AdminCouponErrorCodes.DuplicateCoupon,
            "A coupon with this code already exists.");

    private static ServiceResult<T> Invalid<T>(string message) =>
        ServiceResult<T>.Failure(
            AdminCouponErrorCodes.InvalidCoupon,
            message);
}
