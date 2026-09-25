namespace Shopera.Domain.Constants;

public static class ShipmentStatuses
{
    public const string Pending = "PENDING";
    public const string Packed = "PACKED";
    public const string Shipped = "SHIPPED";
    public const string InTransit = "IN_TRANSIT";
    public const string Delivered = "DELIVERED";
    public const string Returned = "RETURNED";
    public const string Cancelled = "CANCELLED";

    public static readonly IReadOnlySet<string> All =
        new HashSet<string>(
            new[] { Pending, Packed, Shipped, InTransit, Delivered, Returned, Cancelled },
            StringComparer.OrdinalIgnoreCase);
}
