namespace Shopera.Features.Orders.DTOs.Responses;

public class OrderSummaryResponse
{
    public int OrderId { get; init; }
    public string OrderNumber { get; init; } = string.Empty;
    public int StoreId { get; init; }
    public DateTime OrderDate { get; init; }
    public string Status { get; init; } = string.Empty;
    public int TotalQuantity { get; init; }
    public decimal Subtotal { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal ShippingAmount { get; init; }
    public decimal TotalAmount { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
}

public sealed class OrderItemResponse
{
    public int OrderItemId { get; init; }
    public int ProductId { get; init; }
    public int VariantId { get; init; }
    public string ProductName { get; init; } = string.Empty;
    public string Sku { get; init; } = string.Empty;
    public string? VariantName { get; init; }
    public string? ImageUrl { get; init; }
    public int Quantity { get; init; }
    public decimal UnitPriceAtPurchase { get; init; }
    public decimal Subtotal { get; init; }
}

public sealed class OrderAddressResponse
{
    public string AddressType { get; init; } = string.Empty;
    public string RecipientName { get; init; } = string.Empty;
    public string? RecipientPhone { get; init; }
    public string StreetAddress { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public string? StateProvince { get; init; }
    public string? PostalCode { get; init; }
    public string Country { get; init; } = string.Empty;
}


public sealed class ShipmentResponse
{
    public int ShipmentId { get; init; }
    public string? CourierName { get; init; }
    public string? TrackingNumber { get; init; }
    public string ShipmentStatus { get; init; } = string.Empty;
    public DateTime? ShippedDate { get; init; }
    public DateTime? DeliveredDate { get; init; }
    public decimal ShippingCost { get; init; }
}

public sealed class OrderStatusHistoryResponse
{
    public int OrderStatusHistoryId { get; init; }
    public string? OldStatus { get; init; }
    public string NewStatus { get; init; } = string.Empty;
    public DateTime ChangedDate { get; init; }
    public int? ChangedByUserId { get; init; }
    public string? ChangeNote { get; init; }
}

public sealed class OrderDetailsResponse : OrderSummaryResponse
{
    public string? CouponCode { get; init; }
    public IReadOnlyList<OrderItemResponse> Items { get; init; } = [];
    public IReadOnlyList<OrderAddressResponse> Addresses { get; init; } = [];
    public IReadOnlyList<OrderStatusHistoryResponse> StatusHistory { get; init; } = [];
    public ShipmentResponse? Shipment { get; init; }
}

public sealed class SellerOrderResponse : OrderSummaryResponse
{
    public string CustomerName { get; init; } = string.Empty;
    public string? CustomerPhone { get; init; }
    public IReadOnlyList<OrderItemResponse> Items { get; init; } = [];
    public OrderAddressResponse? ShippingAddress { get; init; }
    public ShipmentResponse? Shipment { get; init; }
}
