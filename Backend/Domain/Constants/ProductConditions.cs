namespace Shopera.Domain.Constants
{
    public static class ProductConditions
    {
        public const string New = "NEW";
        public const string UsedLikeNew = "USED_LIKE_NEW";
        public const string UsedGood = "USED_GOOD";
        public const string UsedFair = "USED_FAIR";
        public const string Refurbished = "REFURBISHED";

        public static readonly IReadOnlySet<string> All =
            new HashSet<string>(
                new[]
                {
                    New,
                    UsedLikeNew,
                    UsedGood,
                    UsedFair,
                    Refurbished
                },
                StringComparer.OrdinalIgnoreCase);
    }
}
