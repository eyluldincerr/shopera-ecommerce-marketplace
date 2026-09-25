SELECT
    w.WishlistID,
    w.BuyerUserID,
    w.CreatedDate,
    wi.WishlistItemID,
    wi.VariantID,
    wi.AddedDate,
    pv.ProductID,
    p.ProductName,
    s.StoreName,
    pv.SKU,
    pv.Price,
    pv.StockQuantity,
    pv.Status AS VariantStatus,
    p.Status AS ProductStatus
FROM dbo.WISHLIST AS w
LEFT JOIN dbo.WISHLIST_ITEM AS wi
    ON wi.WishlistID = w.WishlistID
LEFT JOIN dbo.PRODUCT_VARIANT AS pv
    ON pv.VariantID = wi.VariantID
LEFT JOIN dbo.PRODUCT AS p
    ON p.ProductID = pv.ProductID
LEFT JOIN dbo.STORE AS s
    ON s.StoreID = p.StoreID
ORDER BY w.BuyerUserID, wi.AddedDate DESC, wi.WishlistItemID DESC;
