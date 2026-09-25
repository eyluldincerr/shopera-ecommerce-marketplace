/*
  Diagnostic only. This script does NOT change data.
  It identifies Stores that are APPROVED but operationally INACTIVE.

  After deploying the backend fix, new Admin approvals will become APPROVED + ACTIVE.
  Existing APPROVED + INACTIVE Stores are not auto-reactivated because Seller
  deactivation is a valid business action.
*/
SELECT
    StoreID,
    SellerUserID,
    StoreName,
    StoreSlug,
    ApprovalStatus,
    StoreStatus,
    ApprovedByAdminUserID,
    CreatedDate,
    UpdatedDate
FROM dbo.STORE
WHERE ApprovalStatus = 'APPROVED'
  AND StoreStatus = 'INACTIVE'
ORDER BY StoreID;
