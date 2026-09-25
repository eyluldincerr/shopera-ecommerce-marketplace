namespace Shopera.Domain.Entities
{
    public sealed class StoreApprovalHistory
    {
        public int StoreApprovalHistoryId { get; set; }

        public int StoreId { get; set; }

        public string? OldStatus { get; set; }

        public string NewStatus { get; set; } = string.Empty;

        public int ChangedByAdminUserId { get; set; }

        public DateTime ChangedDate { get; set; }

        public string? DecisionNote { get; set; }
    }
}
