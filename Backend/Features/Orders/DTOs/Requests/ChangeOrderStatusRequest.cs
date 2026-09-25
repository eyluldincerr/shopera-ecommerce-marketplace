using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Orders.DTOs.Requests;

public sealed class ChangeOrderStatusRequest
{
    [Required, StringLength(20)] public string NewStatus { get; init; } = string.Empty;
    [StringLength(150)] public string? CourierName { get; init; }
    [StringLength(150)] public string? TrackingNumber { get; init; }
}
