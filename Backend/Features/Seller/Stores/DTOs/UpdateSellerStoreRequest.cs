using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Seller.Stores.DTOs
{
    public sealed class UpdateSellerStoreRequest
    {
        [StringLength(150)]
        public string? StoreName { get; set; }

        [StringLength(150)]
        [RegularExpression(
            "^$|^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$",
            ErrorMessage =
                "StoreSlug may be empty or contain letters, " +
                "numbers, and single hyphens.")]
        public string? StoreSlug { get; set; }

        [StringLength(1000)]
        public string? StoreDescription { get; set; }

        [StringLength(1000)]
        public string? StoreLogoUrl { get; set; }

        [StringLength(1000)]
        public string? StoreBannerUrl { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string SupportEmail { get; set; } = string.Empty;

        [StringLength(30)]
        public string? SupportPhone { get; set; }

        public string? ReturnPolicy { get; set; }

        public string? SupportPolicy { get; set; }
    }
}
