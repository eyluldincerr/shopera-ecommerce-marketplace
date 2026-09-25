namespace Shopera.Features.Seller.Stores.DTOs
{
    public sealed class StoreSubmissionResponse
    {
        public SellerStoreResponse Store { get; set; } = new();

        public int AdminNotificationCount { get; set; }
    }
}
