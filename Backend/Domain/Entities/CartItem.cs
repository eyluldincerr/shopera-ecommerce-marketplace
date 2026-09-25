namespace Shopera.Domain.Entities;

public sealed class CartItem
{
    public int CartItemId { get; set; }

    public int CartId { get; set; }

    public int VariantId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPriceAtAdd { get; set; }

    public DateTime AddedDate { get; set; }

    public Cart Cart { get; set; } = null!;

    public ProductVariant ProductVariant { get; set; } = null!;
}
