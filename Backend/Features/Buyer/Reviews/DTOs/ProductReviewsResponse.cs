namespace Shopera.Features.Buyer.Reviews.DTOs
{
    public sealed class ProductReviewsResponse
    {
        public int ProductId { get; set; }

        public double AverageRating { get; set; }

        public int TotalCount { get; set; }

        public int Page { get; set; }

        public int PageSize { get; set; }

        public int TotalPages { get; set; }

        public IReadOnlyList<ReviewResponse> Items { get; set; } =
            Array.Empty<ReviewResponse>();
    }
}
