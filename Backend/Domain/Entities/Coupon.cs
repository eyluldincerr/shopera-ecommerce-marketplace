namespace Shopera.Domain.Entities;

public sealed class Coupon
{
    public int CouponId { get; set; }

    public string CouponCode { get; set; } = string.Empty;

    public string DiscountType { get; set; } = string.Empty;

    public decimal DiscountValue { get; set; }

    public DateTime ExpiryDate { get; set; }

    public decimal MinPurchaseAmount { get; set; }

    public int? UsageLimit { get; set; }

    public string Status { get; set; } = string.Empty;

    public ICollection<CustomerOrder> CustomerOrders { get; set; } = new List<CustomerOrder>();
}
