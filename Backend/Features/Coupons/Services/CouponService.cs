using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Coupons.Contracts;
using Shopera.Features.Coupons.DTOs;
using Shopera.Features.Coupons.Models;

namespace Shopera.Features.Coupons.Services;

public sealed class CouponService : ICouponService
{
    private const string CurrencyCode = "EUR";
    private readonly ApplicationDbContext _context;

    public CouponService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<BuyerCouponResponse>> GetAvailableAsync(
        int buyerUserId)
    {
        await RequireActiveBuyerAsync(buyerUserId);
        DateTime now = DateTime.UtcNow;

        return await _context.Coupons
            .AsNoTracking()
            .Where(coupon =>
                coupon.Status == CouponStatuses.Active &&
                coupon.ExpiryDate > now)
            .OrderBy(coupon => coupon.ExpiryDate)
            .ThenBy(coupon => coupon.CouponCode)
            .Select(coupon => new BuyerCouponResponse
            {
                CouponId = coupon.CouponId,
                CouponCode = coupon.CouponCode,
                DiscountType = coupon.DiscountType,
                DiscountValue = coupon.DiscountValue,
                ExpiryDate = coupon.ExpiryDate,
                MinPurchaseAmount = coupon.MinPurchaseAmount,
                Status = coupon.Status
            })
            .ToListAsync();
    }

    public async Task<CouponValidationResponse> ValidateForCartAsync(
        int buyerUserId,
        string couponCode)
    {
        await RequireActiveBuyerAsync(buyerUserId);

        string normalized = NormalizeCode(couponCode);
        Coupon coupon = await _context.Coupons
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.CouponCode.ToUpper() == normalized)
            ?? throw new RequestConflictException(
                CouponErrorCodes.NotFound,
                "The coupon code was not found.");

        var cart = await _context.Carts
            .AsNoTracking()
            .Where(item =>
                item.BuyerUserId == buyerUserId &&
                item.Status == CartStatuses.Active)
            .Select(item => new
            {
                ItemCount = item.CartItems.Count,
                Subtotal = item.CartItems
                    .Sum(cartItem =>
                        (decimal?)(cartItem.ProductVariant.Price * cartItem.Quantity))
                    ?? 0m
            })
            .SingleOrDefaultAsync();

        if (cart is null || cart.ItemCount == 0)
        {
            throw new RequestConflictException(
                CouponErrorCodes.CartEmpty,
                "Add an item to your cart before applying a coupon.");
        }

        decimal discount = CouponEvaluator.ValidateAndCalculate(
            coupon,
            cart.Subtotal,
            DateTime.UtcNow);

        return new CouponValidationResponse
        {
            CouponId = coupon.CouponId,
            CouponCode = coupon.CouponCode,
            DiscountType = coupon.DiscountType,
            DiscountValue = coupon.DiscountValue,
            ExpiryDate = coupon.ExpiryDate,
            MinPurchaseAmount = coupon.MinPurchaseAmount,
            SubtotalAmount = cart.Subtotal,
            DiscountAmount = discount,
            TotalAmount = cart.Subtotal - discount,
            CurrencyCode = CurrencyCode
        };
    }

    private async Task RequireActiveBuyerAsync(int buyerUserId)
    {
        bool allowed = buyerUserId > 0 &&
            await _context.UserAccounts.AsNoTracking().AnyAsync(user =>
                user.UserId == buyerUserId &&
                user.Role == AccountRoles.Buyer &&
                user.AccountStatus == AccountStatuses.Active);

        if (!allowed)
        {
            throw new UnauthorizedAccessException(
                "An active buyer account is required.");
        }
    }

    private static string NormalizeCode(string value)
    {
        string normalized = (value ?? string.Empty)
            .Trim()
            .ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("CouponCode is required.");
        }

        return normalized;
    }
}
