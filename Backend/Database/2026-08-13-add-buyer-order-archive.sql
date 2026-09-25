USE ECommerceDB_Final;
GO

IF COL_LENGTH(N'dbo.CUSTOMER_ORDER', N'BuyerArchivedDate') IS NULL
BEGIN
    ALTER TABLE dbo.CUSTOMER_ORDER
        ADD BuyerArchivedDate DATETIME2(0) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_ORDER_BuyerArchive'
      AND object_id = OBJECT_ID(N'dbo.CUSTOMER_ORDER')
)
BEGIN
    CREATE INDEX IX_ORDER_BuyerArchive
        ON dbo.CUSTOMER_ORDER(BuyerUserID, BuyerArchivedDate, OrderDate DESC);
END;
GO
