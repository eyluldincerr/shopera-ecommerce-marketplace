namespace Shopera.Features.StoreMedia.Models
{
    public static class StoreMediaPlacements
    {
        public const string HomeStory = "HOME_STORY";
        public const string StoreShowcase = "STORE_SHOWCASE";
    }

    public static class StoreMediaPlatforms
    {
        public const string YouTube = "YOUTUBE";
        public const string TikTok = "TIKTOK";
    }

    public static class StoreMediaErrorCodes
    {
        public const string StoreNotFound = "STORE_MEDIA_STORE_NOT_FOUND";
        public const string StoreNotPublic = "STORE_MEDIA_STORE_NOT_PUBLIC";
        public const string MediaNotFound = "STORE_MEDIA_NOT_FOUND";
        public const string InvalidTitle = "STORE_MEDIA_TITLE_INVALID";
        public const string InvalidPlacement = "STORE_MEDIA_PLACEMENT_INVALID";
        public const string InvalidUrl = "STORE_MEDIA_URL_INVALID";
        public const string HomeStoryLimitReached = "HOME_STORY_LIMIT_REACHED";
    }
}
