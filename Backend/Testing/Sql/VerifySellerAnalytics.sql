/* Step 10 - Seller Analytics verification.
   Set @SellerUserID to the Seller account being tested. */
DECLARE @SellerUserID INT = 10;

SELECT
    s.StoreID,
    s.StoreName,
    o.OrderID,
    o.OrderNumber,
    o.OrderDate,
    o.OrderStatus,
    o.CurrencyCode,
    f.GrossSalesAmount,
    f.SellerDiscountAmount,
    f.CommissionAmount,
    f.RefundAmount,
    f.CostOfGoodsAmount,
    f.SellerNetAmount,
    f.EstimatedProfitAmount
FROM dbo.STORE AS s
JOIN dbo.CUSTOMER_ORDER AS o
    ON o.StoreID = s.StoreID
LEFT JOIN dbo.ORDER_SELLER_FINANCIAL AS f
    ON f.OrderID = o.OrderID
WHERE s.SellerUserID = @SellerUserID
ORDER BY o.OrderDate DESC, o.OrderID DESC;

SELECT
    p.ProductID,
    p.ProductName,
    c.CategoryName,
    SUM(oi.Quantity) AS DeliveredUnits,
    SUM(oi.Quantity * oi.UnitPriceAtPurchase) AS GrossItemRevenue
FROM dbo.STORE AS s
JOIN dbo.CUSTOMER_ORDER AS o
    ON o.StoreID = s.StoreID
JOIN dbo.ORDER_ITEM AS oi
    ON oi.OrderID = o.OrderID
JOIN dbo.PRODUCT_VARIANT AS pv
    ON pv.VariantID = oi.VariantID
JOIN dbo.PRODUCT AS p
    ON p.ProductID = pv.ProductID
JOIN dbo.CATEGORY AS c
    ON c.CategoryID = p.CategoryID
WHERE s.SellerUserID = @SellerUserID
  AND o.OrderStatus = N'DELIVERED'
GROUP BY p.ProductID, p.ProductName, c.CategoryName
ORDER BY DeliveredUnits DESC, GrossItemRevenue DESC;

SELECT TOP (5)
    r.ReviewID,
    r.ProductID,
    p.ProductName,
    u.FullName AS BuyerName,
    r.Rating,
    r.Comment,
    r.ReviewDate
FROM dbo.STORE AS s
JOIN dbo.PRODUCT AS p
    ON p.StoreID = s.StoreID
JOIN dbo.REVIEW AS r
    ON r.ProductID = p.ProductID
JOIN dbo.USER_ACCOUNT AS u
    ON u.UserID = r.BuyerUserID
WHERE s.SellerUserID = @SellerUserID
ORDER BY r.ReviewDate DESC, r.ReviewID DESC;
