namespace Shopera.Domain.Entities;

public sealed class Payment
{
    public int PaymentId { get; set; }
    public int OrderId { get; set; }
    public DateTime? PaymentDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public CustomerOrder CustomerOrder { get; set; } = null!;
}
