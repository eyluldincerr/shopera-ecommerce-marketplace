USE ECommerceDB_Final;
GO

SELECT TOP 50
    OrderID,
    OrderNumber,
    BuyerUserID,
    OrderStatus,
    BuyerArchivedDate,
    OrderDate,
    TotalAmount,
    CurrencyCode
FROM dbo.CUSTOMER_ORDER
ORDER BY OrderDate DESC, OrderID DESC;
GO

SELECT
    BuyerUserID,
    COUNT(*) AS ArchivedOrderCount
FROM dbo.CUSTOMER_ORDER
WHERE BuyerArchivedDate IS NOT NULL
GROUP BY BuyerUserID
ORDER BY BuyerUserID;
GO
