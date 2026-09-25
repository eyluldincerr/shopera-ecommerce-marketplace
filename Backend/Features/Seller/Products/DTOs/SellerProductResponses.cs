using System.Text.Json;

namespace Shopera.Features.Seller.Products.DTOs
{
    public sealed class SellerProductListResponse
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public string ProductCondition { get; set; } =
            string.Empty;

        public string Status { get; set; } = string.Empty;

        public int CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public int? PrimaryImageId { get; set; }

        public string? PrimaryImageUrl { get; set; }

        public int VariantCount { get; set; }

        public int TotalStock { get; set; }

        public decimal? MinimumPrice { get; set; }

        public decimal? AverageRating { get; set; }

        public int ReviewCount { get; set; }

        public DateTime CreatedDate { get; set; }
    }

    public sealed class SellerInventoryItemResponse
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public int CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public int? PrimaryImageId { get; set; }

        public string? PrimaryImageUrl { get; set; }

        public int VariantId { get; set; }

        public string Sku { get; set; } = string.Empty;

        public string? VariantName { get; set; }

        public int StockQuantity { get; set; }

        public string Status { get; set; } = string.Empty;

        public string RowVersion { get; set; } = string.Empty;
    }

    public sealed class SellerProductResponse
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public string? ShortDescription { get; set; }

        public string? Description { get; set; }

        public string? Brand { get; set; }

        public string? ModelNumber { get; set; }

        public string ProductCondition { get; set; } =
            string.Empty;

        public string? ConditionDescription { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public int StoreId { get; set; }

        public int CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public SellerProductInfoResponse? Information { get; set; }

        public IReadOnlyList<SellerProductImageResponse> Images
        {
            get;
            set;
        } = Array.Empty<SellerProductImageResponse>();

        public IReadOnlyList<SellerProductVariantResponse> Variants
        {
            get;
            set;
        } = Array.Empty<SellerProductVariantResponse>();
    }

    public sealed class SellerProductInfoResponse
    {
        public int ProductInfoId { get; set; }

        public JsonElement? ProductDetails { get; set; }

        public JsonElement? Specifications { get; set; }

        public JsonElement? WhatsInTheBox { get; set; }

        public string? WarrantyInformation { get; set; }

        public string? ReturnPolicy { get; set; }

        public string? CareInstructions { get; set; }

        public string? AdditionalInformation { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime? UpdatedDate { get; set; }
    }

    public sealed class SellerProductImageResponse
    {
        public int ImageId { get; set; }

        public string? ImageUrl { get; set; }

        public string? AltText { get; set; }

        public int DisplayOrder { get; set; }

        public bool IsPrimary { get; set; }

        public DateTime CreatedDate { get; set; }
    }

    public sealed class SellerProductVariantResponse
    {
        public int VariantId { get; set; }

        public string Sku { get; set; } = string.Empty;

        public string? VariantName { get; set; }

        public string? Size { get; set; }

        public string? Color { get; set; }

        public string? StorageCapacity { get; set; }

        public decimal Price { get; set; }

        public decimal CostPrice { get; set; }

        public int StockQuantity { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public string RowVersion { get; set; } = string.Empty;
    }
}
