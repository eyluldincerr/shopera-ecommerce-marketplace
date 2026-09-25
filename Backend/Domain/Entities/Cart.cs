namespace Shopera.Domain.Entities;

public sealed class Cart
{
    public int CartId { get; set; }

    public int BuyerUserId { get; set; }

    public DateTime CreatedDate { get; set; }

    public string Status { get; set; } = string.Empty;

    public UserAccount BuyerUser { get; set; } = null!;

    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
}
