using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Admin.Management.DTOs;

public sealed record AdminUserResponse(
    int UserId,
    string FullName,
    string Email,
    string? PhoneNumber,
    string Role,
    string AccountStatus,
    string? PermissionLevel,
    DateTime RegistrationDate);

public sealed class UpdateAdminUserStatusRequest
{
    [Required, StringLength(20)]
    public string Status { get; set; } = string.Empty;
}

public sealed class UpdateAdminStoreStatusRequest
{
    [Required, StringLength(20)]
    public string Status { get; set; } = string.Empty;

    [StringLength(500)]
    public string? DecisionNote { get; set; }
}

public sealed class UpdateAdminProductStatusRequest
{
    [Required, StringLength(20)]
    public string Status { get; set; } = string.Empty;
}

public sealed record AdminStoreDetailsResponse(
    int StoreId,
    int SellerUserId,
    string StoreName,
    string? StoreSlug,
    string? StoreDescription,
    string? SupportEmail,
    string? SupportPhone,
    string? ReturnPolicy,
    string? SupportPolicy,
    string OwnerName,
    string Email,
    string? PhoneNumber,
    string AccountStatus,
    string Role,
    string ApprovalStatus,
    string StoreStatus,
    DateTime RegistrationDate,
    DateTime CreatedDate,
    DateTime? UpdatedDate,
    int? ApprovedByAdminUserId)
{
    public string FullName => OwnerName;
    public string SellerName => OwnerName;
    public string Initials => CreateInitials(OwnerName, StoreName);

    private static string CreateInitials(string? fullName, string fallback)
    {
        string source = string.IsNullOrWhiteSpace(fullName) ? fallback : fullName;
        string initials = string.Concat(source
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2)
            .Select(part => char.ToUpperInvariant(part[0])));
        return string.IsNullOrWhiteSpace(initials) ? "ST" : initials;
    }
}

public sealed record PendingSellerResponse(
    int StoreId,
    int SellerUserId,
    string FullName,
    string Email,
    string? PhoneNumber,
    string AccountStatus,
    string Role,
    string StoreName,
    string? StoreSlug,
    string? StoreDescription,
    string? SupportEmail,
    string? SupportPhone,
    string? ReturnPolicy,
    string? SupportPolicy,
    string ApprovalStatus,
    string StoreStatus,
    DateTime RegistrationDate,
    DateTime CreatedDate,
    DateTime? UpdatedDate,
    int? ApprovedByAdminUserId)
{
    public int UserId => SellerUserId;
    public string Initials
    {
        get
        {
            string source = string.IsNullOrWhiteSpace(FullName) ? StoreName : FullName;
            string initials = string.Concat(source
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Take(2)
                .Select(part => char.ToUpperInvariant(part[0])));
            return string.IsNullOrWhiteSpace(initials) ? "ST" : initials;
        }
    }
}

public sealed class AdminStoreApprovalRequest
{
    [Required, StringLength(20)]
    public string Decision { get; set; } = string.Empty;

    [StringLength(500)]
    public string? DecisionNote { get; set; }
}

public sealed record AdminStoreApprovalResponse(
    int StoreId,
    int SellerUserId,
    string ApprovalStatus,
    string StoreStatus,
    string Message);

public sealed record AdminStoreApprovalHistoryResponse(
    int StoreApprovalHistoryId,
    string? OldStatus,
    string NewStatus,
    int ChangedByAdminUserId,
    DateTime ChangedDate,
    string? DecisionNote);

public sealed record AdminProductSummaryResponse(
    int ProductId,
    string ProductName,
    string? Brand,
    int StoreId,
    string StoreName,
    int SellerUserId,
    int CategoryId,
    string CategoryName,
    string Status,
    string ProductCondition,
    decimal? MinimumPrice,
    decimal? MaximumPrice,
    int VariantCount,
    int TotalStock,
    string? PrimaryImageUrl,
    string? PrimaryImageAlt,
    string StoreApprovalStatus,
    string StoreStatus,
    bool StoreCanOperate,
    bool IsSaleEnabled,
    DateTime CreatedDate)
{
    // Friend Admin frontend calls this column sellerName but displays the Store name.
    public string SellerName => StoreName;
    public string CurrencyCode => "EUR";
}

public sealed record AdminProductVariantResponse(
    int VariantId,
    string Sku,
    string? VariantName,
    string? Size,
    string? Color,
    string? StorageCapacity,
    decimal Price,
    int StockQuantity,
    string Status,
    DateTime CreatedDate);

public sealed record AdminProductImageResponse(
    int ImageId,
    string ImageUrl,
    string? AltText,
    int DisplayOrder,
    bool IsPrimary);

public sealed record AdminProductInfoResponse(
    string? ProductDetails,
    string? Specifications,
    string? WhatsInTheBox,
    string? WarrantyInformation,
    string? ReturnPolicy,
    string? CareInstructions,
    string? AdditionalInformation,
    DateTime CreatedDate,
    DateTime? UpdatedDate);

public sealed record AdminProductDetailsResponse(
    int ProductId,
    string ProductName,
    string? ShortDescription,
    string? Description,
    string? Brand,
    string? ModelNumber,
    string ProductCondition,
    string? ConditionDescription,
    string Status,
    DateTime CreatedDate,
    int StoreId,
    string StoreName,
    int SellerUserId,
    string StoreApprovalStatus,
    string StoreStatus,
    int CategoryId,
    string CategoryName,
    AdminProductInfoResponse? ProductInfo,
    IReadOnlyList<AdminProductImageResponse> Images,
    IReadOnlyList<AdminProductVariantResponse> Variants)
{
    public string SellerName => StoreName;
    public bool StoreCanOperate =>
        StoreApprovalStatus == "APPROVED" && StoreStatus == "ACTIVE";
    public bool IsSaleEnabled =>
        Status == "ACTIVE" &&
        StoreCanOperate &&
        Variants.Any(variant => variant.Status == "ACTIVE" && variant.StockQuantity > 0);
    public int VariantCount => Variants.Count;
    public int TotalStock => Variants.Sum(variant => variant.StockQuantity);
    public decimal? MinimumPrice => Variants.Count == 0 ? null : Variants.Min(variant => variant.Price);
    public decimal? MaximumPrice => Variants.Count == 0 ? null : Variants.Max(variant => variant.Price);
    public AdminProductImageResponse? PrimaryImage =>
        Images.FirstOrDefault(image => image.IsPrimary) ?? Images.FirstOrDefault();
    public string? PrimaryImageUrl => PrimaryImage?.ImageUrl;
    public string? PrimaryImageAlt => PrimaryImage?.AltText;
    public string CurrencyCode => "EUR";
}

public sealed record AdminOrderSummaryResponse(
    int OrderId,
    string OrderNumber,
    int BuyerUserId,
    string BuyerName,
    string BuyerEmail,
    int StoreId,
    string StoreName,
    string OrderStatus,
    string PaymentStatus,
    string ShipmentStatus,
    decimal TotalAmount,
    string CurrencyCode,
    DateTime OrderDate,
    int ItemCount);

public sealed record AdminOrderItemResponse(
    int OrderItemId,
    int VariantId,
    string ProductName,
    string Sku,
    string? VariantName,
    int Quantity,
    decimal UnitPrice)
{
    public string ProductNameAtPurchase => ProductName;
    public string SkuAtPurchase => Sku;
    public string? VariantNameAtPurchase => VariantName;
    public decimal UnitPriceAtPurchase => UnitPrice;
    public decimal LineTotal => UnitPrice * Quantity;
}

public sealed record AdminPaymentResponse(
    int PaymentId,
    decimal Amount,
    string PaymentMethod,
    string PaymentStatus,
    DateTime CreatedDate,
    DateTime? PaymentDate,
    string? TransactionReference);

public sealed record AdminShipmentResponse(
    int ShipmentId,
    string? CourierName,
    string? TrackingNumber,
    string ShipmentStatus,
    DateTime? ShippedDate,
    DateTime? DeliveredDate,
    decimal ShippingCost);

public sealed record AdminOrderHistoryResponse(
    int OrderStatusHistoryId,
    string? OldStatus,
    string NewStatus,
    DateTime ChangedDate,
    int? ChangedByUserId,
    string? ChangeNote);

public sealed record AdminOrderAddressResponse(
    int OrderAddressId,
    string AddressType,
    string RecipientName,
    string? RecipientPhone,
    string StreetAddress,
    string City,
    string? StateProvince,
    string? PostalCode,
    string Country);

public sealed record AdminSellerFinancialResponse(
    decimal GrossSalesAmount,
    decimal SellerDiscountAmount,
    decimal CommissionAmount,
    decimal RefundAmount,
    decimal CostOfGoodsAmount,
    decimal SellerNetAmount,
    decimal EstimatedProfitAmount,
    string CurrencyCode,
    DateTime CalculatedDate);

public sealed record AdminOrderDetailsResponse(
    int OrderId,
    string OrderNumber,
    int BuyerUserId,
    string BuyerName,
    string BuyerEmail,
    int StoreId,
    string StoreName,
    int SellerUserId,
    DateTime OrderDate,
    string OrderStatus,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal ShippingAmount,
    decimal TotalAmount,
    string CurrencyCode,
    IReadOnlyList<AdminOrderItemResponse> Items,
    IReadOnlyList<AdminOrderAddressResponse> Addresses,
    IReadOnlyList<AdminPaymentResponse> Payments,
    IReadOnlyList<AdminShipmentResponse> Shipments,
    IReadOnlyList<AdminOrderHistoryResponse> StatusHistory,
    AdminSellerFinancialResponse? SellerFinancial)
{
    public int ItemCount => Items.Sum(item => item.Quantity);
    public string PaymentStatus => Payments.FirstOrDefault()?.PaymentStatus ?? "NO_PAYMENT";
    public string ShipmentStatus => Shipments.FirstOrDefault()?.ShipmentStatus ?? "NO_SHIPMENT";
}

public sealed record AdminDashboardResponse(
    int TotalUsers,
    int ApprovedStores,
    int PendingStoreApplications,
    int TotalOrders,
    IReadOnlyList<AdminDeliveredSalesResponse> DeliveredSalesByCurrency,
    string RevenueBasis = "DELIVERED_ORDERS")
{
    // Compatibility alias for an older Admin frontend. The value is now
    // deliberately based on DELIVERED orders, never PAYMENT rows.
    public IReadOnlyList<AdminDeliveredSalesResponse> RecognizedRevenueByCurrency =>
        DeliveredSalesByCurrency;
}

public sealed record AdminDeliveredSalesResponse(
    string CurrencyCode,
    decimal Amount);

public sealed class AdminSalesPointResponse
{
    public DateTime Date { get; init; }
    public decimal DeliveredOrderValue { get; init; }
    public int DeliveredOrderCount { get; init; }

    // Compatibility aliases retained so an older Admin frontend does not fail
    // while the UI migrates from payment terminology to delivery terminology.
    public decimal PaidSales => DeliveredOrderValue;
    public decimal RecognizedRevenue => DeliveredOrderValue;
    public int PaidOrderCount => DeliveredOrderCount;
}

public sealed class AdminSalesAnalyticsResponse
{
    public string CurrencyCode { get; init; } = string.Empty;
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public string DataBasis { get; init; } = "DELIVERED_ORDERS";
    public decimal DeliveredOrderValue { get; init; }
    public int DeliveredOrderCount { get; init; }
    public decimal AverageDeliveredOrderValue { get; init; }
    public IReadOnlyList<AdminSalesPointResponse> Points { get; init; } =
        Array.Empty<AdminSalesPointResponse>();

    // Backward-compatible wire aliases. These aliases contain delivered-order
    // values and must not be interpreted as proof that Payment is active.
    public decimal PaidSalesGrossValue => DeliveredOrderValue;
    public decimal RecognizedRevenue => DeliveredOrderValue;
    public int PaidOrderCount => DeliveredOrderCount;
    public decimal AveragePaidOrderValue => AverageDeliveredOrderValue;
}

public sealed record AdminOrderAttentionResponse(
    int OrderId,
    string OrderNumber,
    int StoreId,
    string StoreName,
    string OrderStatus,
    string PaymentStatus,
    string ShipmentStatus,
    decimal TotalAmount,
    string CurrencyCode,
    DateTime OrderDate,
    string AttentionReason);
