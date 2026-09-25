using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Shopera.Features.Catalogue.DTOs
{
    public sealed class ProductCatalogueQuery
    {
        public string? Search { get; set; }

        public int? CategoryId { get; set; }

        public int? StoreId { get; set; }

        public string? Brand { get; set; }

        public string? Condition { get; set; }

        public decimal? MinimumPrice { get; set; }

        public decimal? MaximumPrice { get; set; }

        public bool InStockOnly { get; set; }

        public double? MinimumRating { get; set; }

        public bool NewArrivalsOnly { get; set; }

        public string Sort { get; set; } = "newest";

        public int Page { get; set; } = 1;

        public int PageSize { get; set; } = 20;

        [BindNever]
        public int? ExcludeProductId { get; set; }
    }
}
