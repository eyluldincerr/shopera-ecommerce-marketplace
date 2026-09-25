namespace Shopera.Domain.Constants
{
    public static class StoreApprovalStatuses
    {
        public const string Pending = "PENDING";
        public const string Approved = "APPROVED";
        public const string Rejected = "REJECTED";
        public const string Suspended = "SUSPENDED";

        public static readonly IReadOnlySet<string> All =
            new HashSet<string>(
                new[] { Pending, Approved, Rejected, Suspended },
                StringComparer.OrdinalIgnoreCase);
    }
}
