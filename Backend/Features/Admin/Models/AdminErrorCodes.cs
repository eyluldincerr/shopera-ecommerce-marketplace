namespace Shopera.Features.Admin.Models
{
    public static class AdminErrorCodes
    {
        public const string AdminForbidden = "ADMIN_FORBIDDEN";
        public const string StoreNotFound = "STORE_NOT_FOUND";
        public const string RecipientNotFound = "RECIPIENT_NOT_FOUND";
        public const string InvalidStoreTransition =
            "INVALID_STORE_TRANSITION";
        public const string InvalidApprovalStatus =
            "INVALID_APPROVAL_STATUS";
        public const string InvalidRole = "INVALID_ROLE";
        public const string InvalidTarget = "INVALID_TARGET";
        public const string DecisionNoteRequired =
            "DECISION_NOTE_REQUIRED";
    }
}
