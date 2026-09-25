namespace Shopera.Domain.Entities
{
    public sealed class BuyerAddress
    {
        public int AddressId { get; set; }

        public int BuyerUserId { get; set; }

        public string? AddressLabel { get; set; }

        public string StreetAddress { get; set; } = string.Empty;

        public string City { get; set; } = string.Empty;

        public string? StateProvince { get; set; }

        public string? PostalCode { get; set; }

        public string Country { get; set; } = string.Empty;

        public bool IsDefaultShipping { get; set; }

        public bool IsDefaultBilling { get; set; }
    }
}
