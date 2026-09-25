SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.PASSWORD_RESET_TOKEN', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.PASSWORD_RESET_TOKEN
        (
            PasswordResetTokenID int IDENTITY(1, 1) NOT NULL,
            UserID int NOT NULL,
            TokenHash varchar(64) NOT NULL,
            CreatedAt datetime2(0) NOT NULL,
            ExpiresAt datetime2(0) NOT NULL,
            UsedAt datetime2(0) NULL,
            RowVersion rowversion NOT NULL,

            CONSTRAINT PK_PASSWORD_RESET_TOKEN
                PRIMARY KEY (PasswordResetTokenID),

            CONSTRAINT FK_PASSWORD_RESET_TOKEN_USER_ACCOUNT
                FOREIGN KEY (UserID)
                REFERENCES dbo.USER_ACCOUNT (UserID)
                ON DELETE CASCADE
        );
    END;

    IF COL_LENGTH(
        N'dbo.PASSWORD_RESET_TOKEN',
        N'RowVersion') IS NULL
    BEGIN
        ALTER TABLE dbo.PASSWORD_RESET_TOKEN
            ADD RowVersion rowversion NOT NULL;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.PASSWORD_RESET_TOKEN')
          AND name = N'UX_PASSWORD_RESET_TOKEN_TokenHash'
    )
    BEGIN
        CREATE UNIQUE INDEX UX_PASSWORD_RESET_TOKEN_TokenHash
            ON dbo.PASSWORD_RESET_TOKEN (TokenHash);
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.PASSWORD_RESET_TOKEN')
          AND name = N'IX_PASSWORD_RESET_TOKEN_UserID_ExpiresAt'
    )
    BEGIN
        CREATE INDEX IX_PASSWORD_RESET_TOKEN_UserID_ExpiresAt
            ON dbo.PASSWORD_RESET_TOKEN (UserID, ExpiresAt);
    END;

    COMMIT TRANSACTION;
    PRINT 'PASSWORD_RESET_TOKEN schema is ready.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
