using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Buyer.Addresses.DTOs
{
    public sealed class CreateBuyerAddressRequest
    {
        [StringLength(50)]
        public string? AddressLabel { get; set; }

        [Required]
        [StringLength(255)]
        public string StreetAddress { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string City { get; set; } = string.Empty;

        [StringLength(100)]
        public string? StateProvince { get; set; }

        [StringLength(30)]
        public string? PostalCode { get; set; }

        [Required]
        [StringLength(100)]
        public string Country { get; set; } = string.Empty;

        public bool IsDefaultShipping { get; set; }

        public bool IsDefaultBilling { get; set; }
    }
}
