using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Coupons.DTOs;

public sealed class ValidateCouponRequest
{
    [Required]
    [StringLength(50)]
    public string CouponCode { get; init; } = string.Empty;
}

public sealed class BuyerCouponResponse
{
    public int CouponId { get; init; }
    public string CouponCode { get; init; } = string.Empty;
    public string DiscountType { get; init; } = string.Empty;
    public decimal DiscountValue { get; init; }
    public DateTime ExpiryDate { get; init; }
    public decimal MinPurchaseAmount { get; init; }
    public string Status { get; init; } = string.Empty;
}

public sealed class CouponValidationResponse
{
    public int CouponId { get; init; }
    public string CouponCode { get; init; } = string.Empty;
    public string DiscountType { get; init; } = string.Empty;
    public decimal DiscountValue { get; init; }
    public DateTime ExpiryDate { get; init; }
    public decimal MinPurchaseAmount { get; init; }
    public decimal SubtotalAmount { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal TotalAmount { get; init; }
    public string CurrencyCode { get; init; } = "EUR";
}
