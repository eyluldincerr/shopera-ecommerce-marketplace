namespace Shopera.Domain.Constants
{
    public static class ProductStatuses
    {
        public const string Draft = "DRAFT";
        public const string Active = "ACTIVE";
        public const string Inactive = "INACTIVE";
        public const string OutOfStock = "OUT_OF_STOCK";
        public const string Deleted = "DELETED";

        public static readonly IReadOnlySet<string> All =
            new HashSet<string>(
                new[]
                {
                    Draft,
                    Active,
                    Inactive,
                    OutOfStock,
                    Deleted
                },
                StringComparer.OrdinalIgnoreCase);

        public static readonly IReadOnlySet<string>
            SellerSelectable =
                new HashSet<string>(
                    new[]
                    {
                        Draft,
                        Active,
                        Inactive,
                        Deleted
                    },
                    StringComparer.OrdinalIgnoreCase);
    }
}
