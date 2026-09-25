using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Seller.Stores.DTOs
{
    public sealed class UpdateSellerStoreStatusRequest
    {
        [Required]
        [StringLength(20)]
        public string StoreStatus { get; set; } = string.Empty;
    }
}
