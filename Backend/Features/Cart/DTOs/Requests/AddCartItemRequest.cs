using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Cart.DTOs.Requests;

public sealed class AddCartItemRequest
{
    [Range(1, int.MaxValue)]
    public int VariantId { get; init; }

    [Range(1, 999)]
    public int Quantity { get; init; }
}
