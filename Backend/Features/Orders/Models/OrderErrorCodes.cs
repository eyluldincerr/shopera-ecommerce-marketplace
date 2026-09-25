namespace Shopera.Features.Orders.Models;

public static class OrderErrorCodes
{
    public const string CartEmpty = "CART_EMPTY";
    public const string StoreUnavailable = "STORE_UNAVAILABLE";
    public const string CancellationNotAllowed = "ORDER_CANCELLATION_NOT_ALLOWED";
    public const string InventoryRestoreFailed = "ORDER_INVENTORY_RESTORE_FAILED";
    public const string StatusTransitionNotAllowed = "ORDER_STATUS_TRANSITION_NOT_ALLOWED";
    public const string CouponInvalid = "COUPON_INVALID";
    public const string CouponNotApplicable = "COUPON_NOT_APPLICABLE";
    public const string CheckoutConcurrencyConflict = "CHECKOUT_CONCURRENCY_CONFLICT";
    public const string ReorderNotAllowed = "ORDER_REORDER_NOT_ALLOWED";
    public const string ArchiveNotAllowed = "ORDER_ARCHIVE_NOT_ALLOWED";
    public const string ShipmentNotAvailable = "SHIPMENT_NOT_AVAILABLE";
    public const string TrackingNumberInUse = "SHIPMENT_TRACKING_NUMBER_IN_USE";
}
