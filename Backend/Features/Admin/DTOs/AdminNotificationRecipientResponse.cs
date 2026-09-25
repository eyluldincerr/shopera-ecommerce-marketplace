namespace Shopera.Features.Admin.DTOs
{
    public sealed class AdminNotificationRecipientResponse
    {
        public int UserId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public string AccountStatus { get; set; } = string.Empty;

        public int? StoreId { get; set; }

        public string? StoreName { get; set; }
    }
}
