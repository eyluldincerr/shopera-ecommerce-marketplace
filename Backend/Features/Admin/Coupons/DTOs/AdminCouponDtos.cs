using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Admin.Coupons.DTOs;

public sealed class CreateAdminCouponRequest
{
    [Required]
    [StringLength(50)]
    public string CouponCode { get; init; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string DiscountType { get; init; } = string.Empty;

    [Range(typeof(decimal), "0.01", "9999999999")]
    public decimal DiscountValue { get; init; }

    public DateTime ExpiryDate { get; init; }

    [Range(typeof(decimal), "0", "9999999999")]
    public decimal MinPurchaseAmount { get; init; }

    [Range(1, int.MaxValue)]
    public int? UsageLimit { get; init; }

    [StringLength(20)]
    public string Status { get; init; } = "ACTIVE";
}

public sealed class UpdateAdminCouponRequest
{
    [StringLength(50)]
    public string? CouponCode { get; init; }

    [StringLength(20)]
    public string? DiscountType { get; init; }

    public decimal? DiscountValue { get; init; }
    public DateTime? ExpiryDate { get; init; }
    public decimal? MinPurchaseAmount { get; init; }
    public int? UsageLimit { get; init; }
    public bool UpdateUsageLimit { get; init; }

    [StringLength(20)]
    public string? Status { get; init; }
}

public sealed class AdminCouponResponse
{
    public int CouponId { get; init; }
    public string CouponCode { get; init; } = string.Empty;
    public string DiscountType { get; init; } = string.Empty;
    public decimal DiscountValue { get; init; }
    public DateTime ExpiryDate { get; init; }
    public decimal MinPurchaseAmount { get; init; }
    public int? UsageLimit { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool IsExpired { get; init; }
    public bool IsUsable { get; init; }
    public int AppliedOrderCount { get; init; }
    public bool UsageTrackingEnforced { get; init; }
}
