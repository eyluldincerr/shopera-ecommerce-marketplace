/* Step 7 coupon verification: no schema changes are required. */
SELECT
    CouponID,
    CouponCode,
    DiscountType,
    DiscountValue,
    ExpiryDate,
    MinPurchaseAmount,
    UsageLimit,
    Status
FROM dbo.COUPON
ORDER BY CouponID DESC;

SELECT TOP (20)
    OrderID,
    OrderNumber,
    BuyerUserID,
    StoreID,
    CouponID,
    SubtotalAmount,
    DiscountAmount,
    ShippingAmount,
    TotalAmount,
    CurrencyCode,
    OrderDate
FROM dbo.CUSTOMER_ORDER
WHERE CouponID IS NOT NULL
ORDER BY OrderID DESC;
