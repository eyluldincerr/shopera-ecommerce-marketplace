namespace Shopera.Features.Catalogue.Models
{
    public static class CatalogueSorts
    {
        public const string Newest = "newest";
        public const string PriceAscending = "price_asc";
        public const string PriceDescending = "price_desc";
        public const string RatingDescending = "rating_desc";
        public const string BestSelling = "best_selling";
        public const string NameAscending = "name_asc";
        public const string NameDescending = "name_desc";

        public static readonly IReadOnlySet<string> All =
            new HashSet<string>(
                new[]
                {
                    Newest,
                    PriceAscending,
                    PriceDescending,
                    RatingDescending,
                    BestSelling,
                    NameAscending,
                    NameDescending
                },
                StringComparer.OrdinalIgnoreCase);
    }
}
