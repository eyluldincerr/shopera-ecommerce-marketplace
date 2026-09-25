namespace Shopera.Domain.Entities;

public sealed class OrderStatusHistory
{
    public int OrderStatusHistoryId { get; set; }
    public int OrderId { get; set; }
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = string.Empty;
    public DateTime ChangedDate { get; set; }
    public int? ChangedByUserId { get; set; }
    public string? ChangeNote { get; set; }
    public CustomerOrder CustomerOrder { get; set; } = null!;
    public UserAccount? ChangedByUser { get; set; }
}
