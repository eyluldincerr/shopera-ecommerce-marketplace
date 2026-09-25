namespace Shopera.Features.Buyer.Reviews.DTOs
{
    public sealed class ReviewResponse
    {
        public int ReviewId { get; set; }

        public int ProductId { get; set; }

        public string BuyerName { get; set; } = string.Empty;

        public int Rating { get; set; }

        public string? Comment { get; set; }

        public DateTime ReviewDate { get; set; }
    }
}
