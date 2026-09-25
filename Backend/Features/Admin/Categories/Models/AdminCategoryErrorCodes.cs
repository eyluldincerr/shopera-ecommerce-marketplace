namespace Shopera.Features.Admin.Categories.Models
{
    public static class AdminCategoryErrorCodes
    {
        public const string AdminForbidden = "ADMIN_FORBIDDEN";
        public const string CategoryNotFound = "CATEGORY_NOT_FOUND";
        public const string ParentNotFound = "PARENT_CATEGORY_NOT_FOUND";
        public const string DuplicateCategory = "DUPLICATE_CATEGORY";
        public const string CategoryCycle = "CATEGORY_CYCLE";
        public const string CategoryInUse = "CATEGORY_IN_USE";
        public const string InvalidCategory = "INVALID_CATEGORY";
    }
}
