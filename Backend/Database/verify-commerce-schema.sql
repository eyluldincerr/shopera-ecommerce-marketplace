SET NOCOUNT ON;

-- Non-mutating verification for the current Shopera 27-table physical design.
-- This script intentionally checks representative/critical columns from every
-- authoritative table so an older 23/24-table database snapshot is detected
-- before the application is started against it.

DECLARE @Required TABLE
(
    TableName sysname NOT NULL,
    ColumnName sysname NOT NULL
);

INSERT INTO @Required (TableName, ColumnName)
VALUES
    (N'USER_ACCOUNT', N'UserID'),
    (N'USER_ACCOUNT', N'PasswordHash'),
    (N'USER_ACCOUNT', N'Role'),
    (N'USER_ACCOUNT', N'AccountStatus'),

    (N'PASSWORD_RESET_TOKEN', N'PasswordResetTokenID'),
    (N'PASSWORD_RESET_TOKEN', N'UserID'),
    (N'PASSWORD_RESET_TOKEN', N'TokenHash'),
    (N'PASSWORD_RESET_TOKEN', N'CreatedAt'),
    (N'PASSWORD_RESET_TOKEN', N'ExpiresAt'),
    (N'PASSWORD_RESET_TOKEN', N'UsedAt'),
    (N'PASSWORD_RESET_TOKEN', N'RowVersion'),

    (N'STORE', N'StoreID'),
    (N'STORE', N'SellerUserID'),
    (N'STORE', N'ApprovalStatus'),
    (N'STORE', N'StoreStatus'),

    (N'STORE_APPROVAL_HISTORY', N'StoreApprovalHistoryID'),
    (N'NOTIFICATION', N'NotificationID'),
    (N'NOTIFICATION', N'RecipientUserID'),
    (N'BUYER_ADDRESS', N'AddressID'),

    (N'CATEGORY', N'CategoryID'),
    (N'CATEGORY', N'CategoryImageData'),
    (N'CATEGORY', N'CategoryImageContentType'),

    (N'PRODUCT', N'ProductID'),
    (N'PRODUCT', N'StoreID'),
    (N'PRODUCT', N'CategoryID'),
    (N'PRODUCT', N'Status'),
    (N'PRODUCT_INFO', N'ProductInfoID'),

    (N'PRODUCT_IMAGE', N'ImageID'),
    (N'PRODUCT_IMAGE', N'ProductID'),
    (N'PRODUCT_IMAGE', N'ImageData'),
    (N'PRODUCT_IMAGE', N'ContentType'),

    (N'PRODUCT_VARIANT', N'VariantID'),
    (N'PRODUCT_VARIANT', N'ProductID'),
    (N'PRODUCT_VARIANT', N'CostPrice'),
    (N'PRODUCT_VARIANT', N'StockQuantity'),
    (N'PRODUCT_VARIANT', N'RowVersion'),

    (N'CART', N'CartID'),
    (N'CART', N'BuyerUserID'),
    (N'CART_ITEM', N'CartItemID'),
    (N'CART_ITEM', N'VariantID'),

    (N'WISHLIST', N'WishlistID'),
    (N'WISHLIST_ITEM', N'WishlistItemID'),
    (N'WISHLIST_ITEM', N'VariantID'),

    (N'COUPON', N'CouponID'),
    (N'COUPON', N'CouponCode'),

    (N'CUSTOMER_ORDER', N'OrderID'),
    (N'CUSTOMER_ORDER', N'OrderNumber'),
    (N'CUSTOMER_ORDER', N'StoreID'),
    (N'CUSTOMER_ORDER', N'TotalAmount'),
    (N'CUSTOMER_ORDER', N'CurrencyCode'),
    (N'CUSTOMER_ORDER', N'BuyerArchivedDate'),

    (N'ORDER_ADDRESS', N'OrderAddressID'),
    (N'ORDER_ADDRESS', N'AddressType'),
    (N'ORDER_ITEM', N'OrderItemID'),
    (N'ORDER_ITEM', N'ProductNameAtPurchase'),
    (N'ORDER_ITEM', N'SKUAtPurchase'),
    (N'ORDER_ITEM', N'UnitCostAtPurchase'),

    (N'ORDER_SELLER_FINANCIAL', N'OrderSellerFinancialID'),
    (N'ORDER_SELLER_FINANCIAL', N'SellerNetAmount'),
    (N'ORDER_SELLER_FINANCIAL', N'EstimatedProfitAmount'),
    (N'ORDER_SELLER_FINANCIAL', N'CurrencyCode'),

    (N'PAYMENT', N'PaymentID'),
    (N'PAYMENT', N'PaymentStatus'),
    (N'SHIPMENT', N'ShipmentID'),
    (N'SHIPMENT', N'ShipmentStatus'),
    (N'SHIPMENT', N'TrackingNumber'),
    (N'ORDER_STATUS_HISTORY', N'OrderStatusHistoryID'),
    (N'ORDER_STATUS_HISTORY', N'NewStatus'),
    (N'REVIEW', N'ReviewID'),

    (N'PROMOTION_PLAN', N'PromotionPlanID'),
    (N'PROMOTION_PLAN', N'PlanType'),
    (N'PROMOTION_PLAN', N'IsActive'),

    (N'PROMOTION_CAMPAIGN', N'CampaignID'),
    (N'PROMOTION_CAMPAIGN', N'PromotionPlanID'),
    (N'PROMOTION_CAMPAIGN', N'BannerImage'),
    (N'PROMOTION_CAMPAIGN', N'BannerContentType'),
    (N'PROMOTION_CAMPAIGN', N'LinkURL'),
    (N'PROMOTION_CAMPAIGN', N'StartDate'),
    (N'PROMOTION_CAMPAIGN', N'EndDate'),
    (N'PROMOTION_CAMPAIGN', N'Status'),
    (N'PROMOTION_CAMPAIGN', N'IsActive'),

    (N'STORE_MEDIA', N'StoreMediaID'),
    (N'STORE_MEDIA', N'StoreID'),
    (N'STORE_MEDIA', N'Placement'),
    (N'STORE_MEDIA', N'Platform'),
    (N'STORE_MEDIA', N'ExternalURL'),
    (N'STORE_MEDIA', N'ExpiresAt'),
    (N'STORE_MEDIA', N'IsActive'),
    (N'STORE_MEDIA', N'RemovedDate');

SELECT required.TableName, required.ColumnName
FROM @Required AS required
WHERE COL_LENGTH(N'dbo.' + required.TableName, required.ColumnName) IS NULL
ORDER BY required.TableName, required.ColumnName;

IF EXISTS
(
    SELECT 1
    FROM @Required AS required
    WHERE COL_LENGTH(N'dbo.' + required.TableName, required.ColumnName) IS NULL
)
BEGIN
    RAISERROR(
        'Shopera 27-table schema verification failed. Missing tables/columns are listed above.',
        16,
        1
    );
    RETURN;
END;

PRINT 'Shopera 27-table schema verification passed.';
