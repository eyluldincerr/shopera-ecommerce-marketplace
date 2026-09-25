namespace Shopera.Domain.Constants
{
    public static class ProductVariantStatuses
    {
        public const string Active = "ACTIVE";
        public const string Inactive = "INACTIVE";
        public const string OutOfStock = "OUT_OF_STOCK";
        public const string Deleted = "DELETED";

        public static readonly IReadOnlySet<string> All =
            new HashSet<string>(
                new[]
                {
                    Active,
                    Inactive,
                    OutOfStock,
                    Deleted
                },
                StringComparer.OrdinalIgnoreCase);
    }
}
