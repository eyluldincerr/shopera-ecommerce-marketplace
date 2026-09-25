USE ECommerceDB_Final;
GO

/* Test-data discovery: replace HTTP variables with real IDs. */
SELECT UserID, FullName, Email, Role, AccountStatus
FROM dbo.USER_ACCOUNT
WHERE AccountStatus = N'ACTIVE'
  AND Role IN (N'BUYER', N'SELLER', N'ADMIN')
ORDER BY Role, UserID;

SELECT TOP (20) ProductID, ProductName, Status, StoreID
FROM dbo.PRODUCT
ORDER BY ProductID;

/* BUYER_ADDRESS verification. */
SELECT AddressID, BuyerUserID, AddressLabel, StreetAddress,
       City, StateProvince, PostalCode, Country,
       IsDefaultShipping, IsDefaultBilling
FROM dbo.BUYER_ADDRESS
ORDER BY BuyerUserID, AddressID;

SELECT BuyerUserID,
       SUM(CASE WHEN IsDefaultShipping = 1 THEN 1 ELSE 0 END)
           AS DefaultShippingCount,
       SUM(CASE WHEN IsDefaultBilling = 1 THEN 1 ELSE 0 END)
           AS DefaultBillingCount
FROM dbo.BUYER_ADDRESS
GROUP BY BuyerUserID
HAVING SUM(CASE WHEN IsDefaultShipping = 1 THEN 1 ELSE 0 END) > 1
    OR SUM(CASE WHEN IsDefaultBilling = 1 THEN 1 ELSE 0 END) > 1;

/* REVIEW verification. */
SELECT ReviewID, BuyerUserID, ProductID, Rating,
       Comment, ReviewDate
FROM dbo.REVIEW
ORDER BY ProductID, ReviewDate DESC;

SELECT BuyerUserID, ProductID, COUNT(*) AS DuplicateCount
FROM dbo.REVIEW
GROUP BY BuyerUserID, ProductID
HAVING COUNT(*) > 1;

/* Must return zero rows: every reviewer needs a delivered purchase. */
SELECT r.ReviewID, r.BuyerUserID, r.ProductID
FROM dbo.REVIEW AS r
WHERE NOT EXISTS
(
    SELECT 1
    FROM dbo.CUSTOMER_ORDER AS o
    INNER JOIN dbo.ORDER_ITEM AS oi
        ON oi.OrderID = o.OrderID
    INNER JOIN dbo.PRODUCT_VARIANT AS pv
        ON pv.VariantID = oi.VariantID
    WHERE o.BuyerUserID = r.BuyerUserID
      AND o.OrderStatus = N'DELIVERED'
      AND pv.ProductID = r.ProductID
);

SELECT ProductID, COUNT(*) AS ReviewCount,
       CAST(AVG(CAST(Rating AS DECIMAL(10, 2)))
           AS DECIMAL(10, 2)) AS AverageRating
FROM dbo.REVIEW
GROUP BY ProductID
ORDER BY ProductID;

/* STORE, approval audit, and notification verification. */
SELECT StoreID, SellerUserID, StoreName, StoreSlug,
       ApprovalStatus, ApprovedByAdminUserID,
       StoreStatus, CreatedDate, UpdatedDate
FROM dbo.STORE
ORDER BY CreatedDate DESC;

SELECT TOP (30) StoreApprovalHistoryID, StoreID,
       OldStatus, NewStatus, ChangedByAdminUserID,
       ChangedDate, DecisionNote
FROM dbo.STORE_APPROVAL_HISTORY
ORDER BY ChangedDate DESC, StoreApprovalHistoryID DESC;

SELECT TOP (50) NotificationID, RecipientUserID,
       ActorUserID, NotificationType, Title,
       RelatedEntityType, RelatedEntityID,
       IsRead, CreatedDate, ReadDate
FROM dbo.NOTIFICATION
WHERE NotificationType IN
(
    N'SellerApprovalRequested',
    N'StoreApproved',
    N'StoreRejected',
    N'AdminMessage'
)
ORDER BY CreatedDate DESC, NotificationID DESC;
