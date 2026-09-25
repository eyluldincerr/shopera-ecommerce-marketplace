namespace Shopera.Domain.Entities
{
    public sealed class CustomerOrder
    {
        public int OrderId { get; set; }

        public string OrderNumber { get; set; } = string.Empty;

        public int BuyerUserId { get; set; }

        public int StoreId { get; set; }

        public int? CouponId { get; set; }

        public DateTime OrderDate { get; set; }

        public string OrderStatus { get; set; } = string.Empty;

        public decimal SubtotalAmount { get; set; }

        public decimal DiscountAmount { get; set; }

        public decimal ShippingAmount { get; set; }

        public decimal TotalAmount { get; set; }

        public string CurrencyCode { get; set; } = "EUR";

        public DateTime? BuyerArchivedDate { get; set; }

        public UserAccount BuyerUser { get; set; } = null!;

        public Coupon? Coupon { get; set; }

        public OrderSellerFinancial? OrderSellerFinancial { get; set; }

        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

        public ICollection<OrderAddress> OrderAddresses { get; set; } = new List<OrderAddress>();

        public ICollection<Payment> Payments { get; set; } = new List<Payment>();

        public ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();

        public ICollection<OrderStatusHistory> OrderStatusHistories { get; set; } = new List<OrderStatusHistory>();
    }
}
