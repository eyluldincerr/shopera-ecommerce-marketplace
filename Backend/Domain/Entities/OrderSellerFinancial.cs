namespace Shopera.Domain.Entities;

public sealed class OrderSellerFinancial
{
    public int OrderSellerFinancialId { get; set; }
    public int OrderId { get; set; }
    public decimal GrossSalesAmount { get; set; }
    public decimal SellerDiscountAmount { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal CostOfGoodsAmount { get; set; }
    public decimal SellerNetAmount { get; set; }
    public decimal EstimatedProfitAmount { get; set; }
    public string CurrencyCode { get; set; } = "EUR";
    public DateTime CalculatedDate { get; set; }
    public CustomerOrder CustomerOrder { get; set; } = null!;
}
