using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Orders.DTOs.Requests;

public sealed class UpdateShipmentRequest
{
    [StringLength(150)] public string? CourierName { get; init; }
    [StringLength(150)] public string? TrackingNumber { get; init; }
}
