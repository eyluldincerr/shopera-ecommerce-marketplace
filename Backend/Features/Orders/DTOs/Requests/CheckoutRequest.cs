using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Orders.DTOs.Requests;

public sealed class CheckoutRequest
{
    [StringLength(50)] public string? CouponCode { get; init; }
    [Required] public CheckoutAddressRequest ShippingAddress { get; init; } = null!;
    [Required] public CheckoutAddressRequest BillingAddress { get; init; } = null!;
}
