namespace Shopera.Domain.Entities
{
    public sealed class Review
    {
        public int ReviewId { get; set; }

        public int BuyerUserId { get; set; }

        public int ProductId { get; set; }

        public byte Rating { get; set; }

        public string? Comment { get; set; }

        public DateTime ReviewDate { get; set; }
    }
}
