namespace Shopera.Domain.Constants
{
    public static class OrderStatuses
    {
        public const string Pending = "PENDING";
        public const string Confirmed = "CONFIRMED";
        public const string Processing = "PROCESSING";
        public const string Shipped = "SHIPPED";
        public const string Delivered = "DELIVERED";
        public const string Cancelled = "CANCELLED";
        public const string Returned = "RETURNED";

        public static readonly IReadOnlySet<string> All =
            new HashSet<string>(
                new[] { Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Returned },
                StringComparer.OrdinalIgnoreCase);
    }
}
