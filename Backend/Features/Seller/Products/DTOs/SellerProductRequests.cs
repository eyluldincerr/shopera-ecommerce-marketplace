using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Shopera.Features.Seller.Products.DTOs
{
    public sealed class CreateSellerProductRequest
    {
        [Required]
        [StringLength(200)]
        public string ProductName { get; set; } = string.Empty;

        [StringLength(500)]
        public string? ShortDescription { get; set; }

        public string? Description { get; set; }

        [StringLength(100)]
        public string? Brand { get; set; }

        [StringLength(100)]
        public string? ModelNumber { get; set; }

        [Required]
        [StringLength(20)]
        public string ProductCondition { get; set; } =
            string.Empty;

        [StringLength(500)]
        public string? ConditionDescription { get; set; }

        [Range(1, int.MaxValue)]
        public int CategoryId { get; set; }

        public UpsertProductInfoRequest? Information { get; set; }

        public List<CreateProductVariantRequest> Variants
        {
            get;
            set;
        } = new();
    }

    public sealed class UpdateSellerProductRequest
    {
        [StringLength(200)]
        public string? ProductName { get; set; }

        [StringLength(500)]
        public string? ShortDescription { get; set; }

        public string? Description { get; set; }

        [StringLength(100)]
        public string? Brand { get; set; }

        [StringLength(100)]
        public string? ModelNumber { get; set; }

        [StringLength(20)]
        public string? ProductCondition { get; set; }

        [StringLength(500)]
        public string? ConditionDescription { get; set; }

        public int? CategoryId { get; set; }
    }

    public sealed class UpsertProductInfoRequest
    {
        public JsonElement? ProductDetails { get; set; }

        public JsonElement? Specifications { get; set; }

        public JsonElement? WhatsInTheBox { get; set; }

        public string? WarrantyInformation { get; set; }

        public string? ReturnPolicy { get; set; }

        public string? CareInstructions { get; set; }

        public string? AdditionalInformation { get; set; }
    }

    public sealed class CreateProductImageRequest
    {
        [Required]
        public IFormFile File { get; set; } = null!;

        [StringLength(255)]
        public string? AltText { get; set; }

        [Range(1, int.MaxValue)]
        public int DisplayOrder { get; set; } = 1;

        public bool IsPrimary { get; set; }
    }

    public sealed class UpdateProductImageRequest
    {
        public IFormFile? File { get; set; }

        [StringLength(255)]
        public string? AltText { get; set; }

        [Range(1, int.MaxValue)]
        public int? DisplayOrder { get; set; }

        public bool? IsPrimary { get; set; }
    }

    public sealed class CreateProductVariantRequest
    {
        [Required]
        [StringLength(100)]
        public string Sku { get; set; } = string.Empty;

        [StringLength(150)]
        public string? VariantName { get; set; }

        [StringLength(50)]
        public string? Size { get; set; }

        [StringLength(50)]
        public string? Color { get; set; }

        [StringLength(50)]
        public string? StorageCapacity { get; set; }

        [Range(typeof(decimal), "0", "9999999999.99")]
        public decimal Price { get; set; }

        [Range(typeof(decimal), "0", "9999999999.99")]
        public decimal CostPrice { get; set; }

        [Range(0, int.MaxValue)]
        public int StockQuantity { get; set; }

        [StringLength(20)]
        public string? Status { get; set; }
    }

    public sealed class UpdateProductVariantRequest
    {
        [StringLength(100)]
        public string? Sku { get; set; }

        [StringLength(150)]
        public string? VariantName { get; set; }

        [StringLength(50)]
        public string? Size { get; set; }

        [StringLength(50)]
        public string? Color { get; set; }

        [StringLength(50)]
        public string? StorageCapacity { get; set; }

        [Range(typeof(decimal), "0", "9999999999.99")]
        public decimal? Price { get; set; }

        [Range(typeof(decimal), "0", "9999999999.99")]
        public decimal? CostPrice { get; set; }

        [Range(0, int.MaxValue)]
        public int? StockQuantity { get; set; }

        [StringLength(20)]
        public string? Status { get; set; }

        [Required]
        public string RowVersion { get; set; } = string.Empty;
    }

    public sealed class DeleteProductVariantRequest
    {
        [Required]
        public string RowVersion { get; set; } = string.Empty;
    }

    public sealed class UpdateProductStatusRequest
    {
        [Required]
        [StringLength(20)]
        public string Status { get; set; } = string.Empty;
    }
}
