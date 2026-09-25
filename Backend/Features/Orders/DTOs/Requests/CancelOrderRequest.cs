using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Orders.DTOs.Requests;

public sealed class CancelOrderRequest
{
    [StringLength(450)] public string? Reason { get; init; }
}
