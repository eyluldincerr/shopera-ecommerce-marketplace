namespace Shopera.Domain.Entities;

public sealed class Shipment
{
    public int ShipmentId { get; set; }
    public int OrderId { get; set; }
    public string? CourierName { get; set; }
    public string? TrackingNumber { get; set; }
    public string ShipmentStatus { get; set; } = string.Empty;
    public DateTime? ShippedDate { get; set; }
    public DateTime? DeliveredDate { get; set; }
    public decimal ShippingCost { get; set; }
    public CustomerOrder CustomerOrder { get; set; } = null!;
}
