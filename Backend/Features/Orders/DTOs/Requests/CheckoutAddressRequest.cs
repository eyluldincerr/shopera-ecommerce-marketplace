using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Orders.DTOs.Requests;

public sealed class CheckoutAddressRequest
{
    [Required, StringLength(150)] public string RecipientName { get; init; } = string.Empty;
    [StringLength(30)] public string? RecipientPhone { get; init; }
    [Required, StringLength(255)] public string StreetAddress { get; init; } = string.Empty;
    [Required, StringLength(100)] public string City { get; init; } = string.Empty;
    [StringLength(100)] public string? StateProvince { get; init; }
    [StringLength(30)] public string? PostalCode { get; init; }
    [Required, StringLength(100)] public string Country { get; init; } = string.Empty;
}
