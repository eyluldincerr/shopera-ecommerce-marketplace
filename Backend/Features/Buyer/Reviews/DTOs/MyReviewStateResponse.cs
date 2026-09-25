namespace Shopera.Features.Buyer.Reviews.DTOs
{
    public sealed class MyReviewStateResponse
    {
        public int ProductId { get; set; }

        public bool CanCreate { get; set; }

        public string? ReasonCode { get; set; }

        public ReviewResponse? Review { get; set; }
    }
}
