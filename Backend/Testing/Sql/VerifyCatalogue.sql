USE ECommerceDB_Final;
GO

/* CATEGORY hierarchy and product usage. */
SELECT c.CategoryID, c.CategoryName, c.ParentCategoryID,
       p.CategoryName AS ParentCategoryName,
       c.ManagedByAdminUserID,
       COUNT(DISTINCT pr.ProductID) AS ProductCount
FROM dbo.CATEGORY AS c
LEFT JOIN dbo.CATEGORY AS p
    ON p.CategoryID = c.ParentCategoryID
LEFT JOIN dbo.PRODUCT AS pr
    ON pr.CategoryID = c.CategoryID
GROUP BY c.CategoryID, c.CategoryName, c.ParentCategoryID,
         p.CategoryName, c.ManagedByAdminUserID
ORDER BY p.CategoryName, c.CategoryName;

/* Must return zero rows: a category cannot be its own ancestor. */
WITH CategoryTree AS
(
    SELECT CategoryID, ParentCategoryID, CategoryID AS StartID,
           CAST(N'/' + CONVERT(NVARCHAR(20), CategoryID) + N'/'
                AS NVARCHAR(MAX)) AS PathText
    FROM dbo.CATEGORY

    UNION ALL

    SELECT parent.CategoryID, parent.ParentCategoryID,
           tree.StartID,
           tree.PathText +
               CONVERT(NVARCHAR(20), parent.CategoryID) + N'/'
    FROM CategoryTree AS tree
    INNER JOIN dbo.CATEGORY AS parent
        ON parent.CategoryID = tree.ParentCategoryID
    WHERE tree.PathText NOT LIKE
        N'%/' + CONVERT(NVARCHAR(20), parent.CategoryID) + N'/%'
)
SELECT StartID
FROM CategoryTree
WHERE CategoryID = ParentCategoryID
OPTION (MAXRECURSION 32767);

/* Complete aggregate used by the Seller and public product detail. */
SELECT TOP (100)
       pr.ProductID, pr.ProductName, pr.ShortDescription,
       pr.Brand, pr.ModelNumber, pr.ProductCondition,
       pr.ConditionDescription, pr.Status, pr.CreatedDate,
       pr.StoreID, s.StoreName, s.ApprovalStatus, s.StoreStatus,
       pr.CategoryID, c.CategoryName,
       pi.ProductDetails, pi.Specifications, pi.WhatsInTheBox,
       pi.WarrantyInformation, pi.ReturnPolicy,
       pi.CareInstructions, pi.AdditionalInformation
FROM dbo.PRODUCT AS pr
INNER JOIN dbo.STORE AS s ON s.StoreID = pr.StoreID
INNER JOIN dbo.CATEGORY AS c ON c.CategoryID = pr.CategoryID
LEFT JOIN dbo.PRODUCT_INFO AS pi
    ON pi.ProductID = pr.ProductID
ORDER BY pr.CreatedDate DESC, pr.ProductID DESC;

/* Image order and one-primary invariant. Both queries must return zero rows. */
SELECT ProductID, DisplayOrder, COUNT(*) AS DuplicateCount
FROM dbo.PRODUCT_IMAGE
GROUP BY ProductID, DisplayOrder
HAVING COUNT(*) > 1;

SELECT ProductID,
       SUM(CASE WHEN IsPrimary = 1 THEN 1 ELSE 0 END)
           AS PrimaryCount
FROM dbo.PRODUCT_IMAGE
GROUP BY ProductID
HAVING SUM(CASE WHEN IsPrimary = 1 THEN 1 ELSE 0 END) > 1;

/* SKU, inventory, price, and confidential seller cost verification. */
SELECT TOP (200)
       pv.VariantID, pv.ProductID, pv.SKU, pv.VariantName,
       pv.Size, pv.Color, pv.StorageCapacity,
       pv.Price, pv.CostPrice, pv.StockQuantity,
       pv.Status, pv.RowVersion
FROM dbo.PRODUCT_VARIANT AS pv
ORDER BY pv.ProductID, pv.VariantID;

/* All three invariant queries must return zero rows. */
SELECT SKU, COUNT(*) AS DuplicateCount
FROM dbo.PRODUCT_VARIANT
GROUP BY SKU
HAVING COUNT(*) > 1;

SELECT VariantID, Price, CostPrice, StockQuantity
FROM dbo.PRODUCT_VARIANT
WHERE Price < 0 OR CostPrice < 0 OR StockQuantity < 0;

SELECT ProductID, Size, Color, StorageCapacity,
       COUNT(*) AS DuplicateOptionCount
FROM dbo.PRODUCT_VARIANT
GROUP BY ProductID, Size, Color, StorageCapacity
HAVING COUNT(*) > 1;

/* Public visibility: only approved/active stores and public product states. */
SELECT pr.ProductID, pr.ProductName, pr.Status,
       s.StoreID, s.StoreName, s.ApprovalStatus, s.StoreStatus
FROM dbo.PRODUCT AS pr
INNER JOIN dbo.STORE AS s ON s.StoreID = pr.StoreID
WHERE s.ApprovalStatus = N'APPROVED'
  AND s.StoreStatus = N'ACTIVE'
  AND pr.Status IN (N'ACTIVE', N'OUT_OF_STOCK')
ORDER BY pr.CreatedDate DESC, pr.ProductID DESC;

/* Capacity check: confirms paging is required when count approaches 1,000. */
SELECT COUNT(*) AS PublicProductCount
FROM dbo.PRODUCT AS pr
INNER JOIN dbo.STORE AS s ON s.StoreID = pr.StoreID
WHERE s.ApprovalStatus = N'APPROVED'
  AND s.StoreStatus = N'ACTIVE'
  AND pr.Status IN (N'ACTIVE', N'OUT_OF_STOCK');
