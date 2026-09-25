-- =============================================================================
-- PRODUCT IMAGE SCHEMA VERIFICATION SCRIPT
-- Verify that the ImageData binary storage migration is complete
-- =============================================================================

-- 1. Verify that ImageURL column NO LONGER EXISTS
-- This query should return 0 rows (column should not exist)
SELECT 
	COLUMN_NAME,
	DATA_TYPE,
	CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME = 'PRODUCT_IMAGE'
  AND COLUMN_NAME IN ('ImageURL', 'ImageUrl')
ORDER BY ORDINAL_POSITION;

-- Expected result: (0 rows returned)

-- 2. Verify new binary storage columns exist with correct types
SELECT 
	COLUMN_NAME,
	DATA_TYPE,
	CHARACTER_MAXIMUM_LENGTH,
	IS_NULLABLE,
	COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME = 'PRODUCT_IMAGE'
ORDER BY ORDINAL_POSITION;

-- Expected columns:
-- ImageID                INT             (PK)
-- ProductID              INT             (FK, NOT NULL)
-- ImageData              varbinary(max)  (NOT NULL)      <- New
-- ContentType            nvarchar(50)    (NOT NULL)      <- New
-- OriginalFileName       nvarchar(255)   (NULL)          <- New
-- AltText                nvarchar(255)   (NULL)
-- DisplayOrder           INT             (NOT NULL)
-- IsPrimary              BIT             (NOT NULL, DEFAULT 0)
-- CreatedDate            datetime2(7)    (NOT NULL, DEFAULT SYSUTCDATETIME())

-- 3. Verify data types in detail
SELECT 
	c.COLUMN_NAME,
	c.DATA_TYPE,
	c.CHARACTER_MAXIMUM_LENGTH,
	c.NUMERIC_PRECISION,
	c.NUMERIC_SCALE,
	c.IS_NULLABLE,
	c.COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_SCHEMA = 'dbo'
  AND c.TABLE_NAME = 'PRODUCT_IMAGE'
  AND c.COLUMN_NAME IN ('ImageData', 'ContentType', 'OriginalFileName')
ORDER BY c.ORDINAL_POSITION;

-- Expected results:
-- ImageData:        varbinary(max), NULL='NO', default=NULL
-- ContentType:      nvarchar(50), NULL='NO', default=NULL
-- OriginalFileName: nvarchar(255), NULL='YES', default=NULL

-- 4. Verify binary data storage (sample query)
-- View actual image records without loading large binary data
SELECT TOP 100
	pi.ImageID,
	pi.ProductID,
	pi.ContentType,
	pi.OriginalFileName,
	DATALENGTH(pi.ImageData) AS ImageByteLength,
	pi.AltText,
	pi.DisplayOrder,
	pi.IsPrimary,
	pi.CreatedDate
FROM dbo.PRODUCT_IMAGE pi
ORDER BY pi.ProductID, pi.DisplayOrder;

-- 5. Verify unique constraints on DisplayOrder
-- Each ProductID should have unique DisplayOrder values
SELECT 
	pi.ProductID,
	pi.DisplayOrder,
	COUNT(*) AS DuplicateCount
FROM dbo.PRODUCT_IMAGE pi
GROUP BY pi.ProductID, pi.DisplayOrder
HAVING COUNT(*) > 1
ORDER BY pi.ProductID, pi.DisplayOrder;

-- Expected result: (0 rows - no duplicates)

-- 6. Verify only one primary image per Product
-- Should never have more than 1 IsPrimary per Product
SELECT 
	pi.ProductID,
	COUNT(*) AS PrimaryCount
FROM dbo.PRODUCT_IMAGE pi
WHERE pi.IsPrimary = 1
GROUP BY pi.ProductID
HAVING COUNT(*) > 1
ORDER BY pi.ProductID;

-- Expected result: (0 rows - at most 1 primary per product)

-- 7. Verify DisplayOrder is positive (> 0)
SELECT 
	pi.ImageID,
	pi.ProductID,
	pi.DisplayOrder
FROM dbo.PRODUCT_IMAGE pi
WHERE pi.DisplayOrder <= 0
ORDER BY pi.ProductID, pi.DisplayOrder;

-- Expected result: (0 rows - all DisplayOrder values > 0)

-- 8. Verify no NULL ImageData (all images have binary content)
SELECT 
	pi.ImageID,
	pi.ProductID,
	pi.ContentType
FROM dbo.PRODUCT_IMAGE pi
WHERE pi.ImageData IS NULL;

-- Expected result: (0 rows - all images have data)

-- 9. Verify no NULL ContentType (all images have MIME type)
SELECT 
	pi.ImageID,
	pi.ProductID,
	DATALENGTH(pi.ImageData) AS ByteLength
FROM dbo.PRODUCT_IMAGE pi
WHERE pi.ContentType IS NULL;

-- Expected result: (0 rows - all images have content type)

-- 10. Verify ContentType values are valid MIME types
SELECT DISTINCT
	pi.ContentType,
	COUNT(*) AS ImageCount,
	AVG(DATALENGTH(pi.ImageData)) AS AvgByteLength,
	MIN(DATALENGTH(pi.ImageData)) AS MinByteLength,
	MAX(DATALENGTH(pi.ImageData)) AS MaxByteLength
FROM dbo.PRODUCT_IMAGE pi
GROUP BY pi.ContentType
ORDER BY ImageCount DESC;

-- Expected ContentType values:
-- image/jpeg
-- image/png
-- image/webp

-- 11. Verify image sizes are reasonable (not empty, under 5MB)
SELECT 
	pi.ImageID,
	pi.ProductID,
	pi.ContentType,
	DATALENGTH(pi.ImageData) AS ByteLength,
	DATALENGTH(pi.ImageData) / 1024.0 / 1024.0 AS MegaBytes
FROM dbo.PRODUCT_IMAGE pi
WHERE DATALENGTH(pi.ImageData) = 0
   OR DATALENGTH(pi.ImageData) > 5242880  -- 5 MB
ORDER BY DATALENGTH(pi.ImageData) DESC;

-- Expected result: (0 rows - all images between 1 byte and 5 MB)

-- 12. Verify image indexes exist
SELECT 
	i.NAME AS IndexName,
	i.TYPE_DESC AS IndexType,
	c.NAME AS ColumnName
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.OBJECT_ID = ic.OBJECT_ID AND i.INDEX_ID = ic.INDEX_ID
INNER JOIN sys.columns c ON ic.OBJECT_ID = c.OBJECT_ID AND ic.COLUMN_ID = c.COLUMN_ID
WHERE i.OBJECT_ID = OBJECT_ID('dbo.PRODUCT_IMAGE')
ORDER BY i.NAME, ic.KEY_ORDINAL;

-- Expected indexes:
-- PK_PRODUCT_IMAGE (clustered on ImageID)
-- UQ_PRODUCT_IMAGE_Order (unique on ProductID, DisplayOrder)
-- UX_PRODUCT_IMAGE_OnePrimary (filtered unique on ProductID where IsPrimary=1)
-- IX_PRODUCT_IMAGE_Product (on ProductID)

-- 13. Summary Statistics
SELECT 
	'PRODUCT_IMAGE' AS TableName,
	COUNT(*) AS TotalImages,
	COUNT(DISTINCT ProductID) AS ProductsWithImages,
	SUM(DATALENGTH(ImageData)) / 1024.0 / 1024.0 / 1024.0 AS TotalSizeGB,
	AVG(DATALENGTH(ImageData)) / 1024.0 AS AvgSizeKB,
	MIN(DATALENGTH(ImageData)) / 1024.0 AS MinSizeKB,
	MAX(DATALENGTH(ImageData)) / 1024.0 AS MaxSizeKB,
	SUM(CASE WHEN IsPrimary = 1 THEN 1 ELSE 0 END) AS PrimaryImageCount
FROM dbo.PRODUCT_IMAGE;

-- 14. Verify no Base64 encoded data (check for common Base64 patterns)
-- Base64 strings typically have = padding at the end
SELECT TOP 10
	pi.ImageID,
	pi.ProductID,
	pi.ContentType,
	DATALENGTH(pi.ImageData) AS ByteLength,
	CONVERT(VARCHAR(MAX), SUBSTRING(pi.ImageData, 1, 100)) AS FirstBytes
FROM dbo.PRODUCT_IMAGE pi
WHERE DATALENGTH(pi.ImageData) > 1000
ORDER BY pi.ImageID;

-- Expected: Binary data should not be readable as text
-- If you see Base64 strings (lots of A-Z, a-z, 0-9, +, /, =), that's wrong

-- 15. Foreign key relationships
SELECT 
	fk.NAME AS ForeignKeyName,
	t1.NAME AS ParentTable,
	c1.NAME AS ParentColumn,
	t2.NAME AS ReferencedTable,
	c2.NAME AS ReferencedColumn,
	fk.DELETE_REFERENTIAL_ACTION_DESC AS DeleteAction
FROM sys.foreign_keys fk
INNER JOIN sys.tables t1 ON fk.PARENT_OBJECT_ID = t1.OBJECT_ID
INNER JOIN sys.tables t2 ON fk.REFERENCED_OBJECT_ID = t2.OBJECT_ID
INNER JOIN sys.columns c1 ON fk.PARENT_OBJECT_ID = c1.OBJECT_ID 
	AND fk.PARENT_COLUMN_ID = c1.COLUMN_ID
INNER JOIN sys.columns c2 ON fk.REFERENCED_OBJECT_ID = c2.OBJECT_ID 
	AND fk.REFERENCED_COLUMN_ID = c2.COLUMN_ID
WHERE t1.NAME = 'PRODUCT_IMAGE' OR t2.NAME = 'PRODUCT_IMAGE'
ORDER BY fk.NAME;

-- Expected:
-- FK_PRODUCT_IMAGE_Product (PRODUCT_IMAGE.ProductID -> PRODUCT.ProductID, DeleteAction=NO_ACTION)

-- 16. Check for orphaned images (products that don't exist)
SELECT 
	pi.ImageID,
	pi.ProductID,
	pi.ContentType,
	DATALENGTH(pi.ImageData) AS ByteLength
FROM dbo.PRODUCT_IMAGE pi
LEFT JOIN dbo.PRODUCT p ON pi.ProductID = p.ProductID
WHERE p.ProductID IS NULL
ORDER BY pi.ProductID;

-- Expected result: (0 rows - no orphaned images)

-- =============================================================================
-- SUMMARY CHECK: Run this to verify everything is correct
-- =============================================================================

PRINT '=== PRODUCT_IMAGE SCHEMA VERIFICATION SUMMARY ===';

-- Check 1: ImageURL column does not exist
IF EXISTS (
	SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = 'dbo'
	  AND TABLE_NAME = 'PRODUCT_IMAGE'
	  AND COLUMN_NAME IN ('ImageURL', 'ImageUrl')
)
	PRINT 'ERROR: ImageURL column still exists!';
ELSE
	PRINT 'OK: ImageURL column removed';

-- Check 2: Required new columns exist
IF NOT EXISTS (
	SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = 'dbo'
	  AND TABLE_NAME = 'PRODUCT_IMAGE'
	  AND COLUMN_NAME = 'ImageData'
)
	PRINT 'ERROR: ImageData column missing!';
ELSE
	PRINT 'OK: ImageData column exists';

IF NOT EXISTS (
	SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = 'dbo'
	  AND TABLE_NAME = 'PRODUCT_IMAGE'
	  AND COLUMN_NAME = 'ContentType'
)
	PRINT 'ERROR: ContentType column missing!';
ELSE
	PRINT 'OK: ContentType column exists';

-- Check 3: No empty images
IF EXISTS (
	SELECT 1 FROM dbo.PRODUCT_IMAGE
	WHERE DATALENGTH(ImageData) = 0
)
	PRINT 'ERROR: Empty image data found!';
ELSE
	PRINT 'OK: All images contain data';

-- Check 4: No duplicate DisplayOrder
IF EXISTS (
	SELECT 1 FROM dbo.PRODUCT_IMAGE
	GROUP BY ProductID, DisplayOrder
	HAVING COUNT(*) > 1
)
	PRINT 'ERROR: Duplicate DisplayOrder found!';
ELSE
	PRINT 'OK: DisplayOrder unique per Product';

-- Check 5: No multiple primary images per product
IF EXISTS (
	SELECT 1 FROM dbo.PRODUCT_IMAGE
	WHERE IsPrimary = 1
	GROUP BY ProductID
	HAVING COUNT(*) > 1
)
	PRINT 'ERROR: Multiple primary images found for same product!';
ELSE
	PRINT 'OK: At most one primary image per product';

-- Check 6: No negative or zero DisplayOrder
IF EXISTS (
	SELECT 1 FROM dbo.PRODUCT_IMAGE
	WHERE DisplayOrder <= 0
)
	PRINT 'ERROR: Invalid DisplayOrder found!';
ELSE
	PRINT 'OK: All DisplayOrder values positive';

PRINT '=== VERIFICATION COMPLETE ===';
