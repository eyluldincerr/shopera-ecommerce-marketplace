namespace Shopera.Domain.Constants;

public static class CouponStatuses
{
    public const string Active = "ACTIVE";
    public const string Expired = "EXPIRED";
    public const string Disabled = "DISABLED";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(
        new[] { Active, Expired, Disabled },
        StringComparer.Ordinal);
}

public static class DiscountTypes
{
    public const string Percentage = "PERCENTAGE";
    public const string FixedAmount = "FIXED_AMOUNT";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(
        new[] { Percentage, FixedAmount },
        StringComparer.Ordinal);
}
