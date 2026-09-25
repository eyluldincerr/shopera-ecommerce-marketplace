using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Cart.DTOs.Requests;

public sealed class UpdateCartItemQuantityRequest
{
    [Range(1, 999)]
    public int Quantity { get; init; }
}
