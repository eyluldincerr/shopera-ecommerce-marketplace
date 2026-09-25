namespace Shopera.Domain.Entities;

public sealed class OrderAddress
{
    public int OrderAddressId { get; set; }
    public int OrderId { get; set; }
    public string AddressType { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string? RecipientPhone { get; set; }
    public string StreetAddress { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? StateProvince { get; set; }
    public string? PostalCode { get; set; }
    public string Country { get; set; } = string.Empty;
    public CustomerOrder CustomerOrder { get; set; } = null!;
}
