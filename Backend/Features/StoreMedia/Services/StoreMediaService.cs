using Microsoft.EntityFrameworkCore;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Features.StoreMedia.DTOs;
using Shopera.Features.StoreMedia.Models;
using System.Data;

namespace Shopera.Features.StoreMedia.Services
{
    public sealed class StoreMediaService
    {
        public const int MaxActiveHomeStoriesPerStore = 2;
        public static readonly TimeSpan HomeStoryLifetime = TimeSpan.FromHours(24);

        private readonly ApplicationDbContext _dbContext;

        public StoreMediaService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        private DbSet<Models.StoreMedia> Media =>
            _dbContext.Set<Models.StoreMedia>();

        public async Task<IReadOnlyList<StoreMediaResponse>>
            GetPublicHomeStoriesAsync()
        {
            var now = DateTime.UtcNow;

            var rows = await (
                from media in Media.AsNoTracking()
                join store in _dbContext.Stores.AsNoTracking()
                    on media.StoreId equals store.StoreId
                join seller in _dbContext.UserAccounts.AsNoTracking()
                    on store.SellerUserId equals seller.UserId
                where media.IsActive &&
                      media.RemovedDate == null &&
                      media.Placement == StoreMediaPlacements.HomeStory &&
                      media.ExpiresAt != null &&
                      media.ExpiresAt > now &&
                      store.ApprovalStatus == StoreApprovalStatuses.Approved &&
                      store.StoreStatus == StoreStatuses.Active &&
                      seller.AccountStatus == AccountStatuses.Active
                orderby media.CreatedDate descending
                select new
                {
                    Media = media,
                    Store = store
                })
                .ToListAsync();

            return rows
                .Select(row => MapResponse(row.Media, row.Store))
                .ToList();
        }

        public async Task<IReadOnlyList<StoreMediaResponse>>
            GetPublicShowcaseAsync(int storeId)
        {
            if (storeId < 1)
            {
                return Array.Empty<StoreMediaResponse>();
            }

            var rows = await (
                from media in Media.AsNoTracking()
                join store in _dbContext.Stores.AsNoTracking()
                    on media.StoreId equals store.StoreId
                join seller in _dbContext.UserAccounts.AsNoTracking()
                    on store.SellerUserId equals seller.UserId
                where media.IsActive &&
                      media.RemovedDate == null &&
                      media.Placement == StoreMediaPlacements.StoreShowcase &&
                      store.StoreId == storeId &&
                      store.ApprovalStatus == StoreApprovalStatuses.Approved &&
                      store.StoreStatus == StoreStatuses.Active &&
                      seller.AccountStatus == AccountStatuses.Active
                orderby media.CreatedDate descending
                select new
                {
                    Media = media,
                    Store = store
                })
                .ToListAsync();

            return rows
                .Select(row => MapResponse(row.Media, row.Store))
                .ToList();
        }

        public async Task<ServiceResult<IReadOnlyList<StoreMediaResponse>>>
            GetSellerMediaAsync(int sellerUserId)
        {
            var store = await _dbContext.Stores
                .AsNoTracking()
                .SingleOrDefaultAsync(item => item.SellerUserId == sellerUserId);

            if (store is null)
            {
                return ServiceResult<IReadOnlyList<StoreMediaResponse>>.Failure(
                    StoreMediaErrorCodes.StoreNotFound,
                    "Create your store before adding Store Stories or Store Showcase media.");
            }

            var now = DateTime.UtcNow;

            var items = await Media
                .AsNoTracking()
                .Where(item =>
                    item.StoreId == store.StoreId &&
                    item.IsActive &&
                    item.RemovedDate == null &&
                    (item.Placement != StoreMediaPlacements.HomeStory ||
                     (item.ExpiresAt != null && item.ExpiresAt > now)))
                .OrderByDescending(item => item.CreatedDate)
                .ToListAsync();

            return ServiceResult<IReadOnlyList<StoreMediaResponse>>.Success(
                items.Select(item => MapResponse(item, store)).ToList());
        }

        public async Task<ServiceResult<StoreMediaResponse>> CreateAsync(
            int sellerUserId,
            CreateStoreMediaRequest request)
        {
            var title = (request.Title ?? string.Empty).Trim();

            if (title.Length is < 1 or > 120)
            {
                return ServiceResult<StoreMediaResponse>.Failure(
                    StoreMediaErrorCodes.InvalidTitle,
                    "Title is required and must be 120 characters or fewer.");
            }

            var placement = (request.Placement ?? string.Empty)
                .Trim()
                .ToUpperInvariant();

            if (placement != StoreMediaPlacements.HomeStory &&
                placement != StoreMediaPlacements.StoreShowcase)
            {
                return ServiceResult<StoreMediaResponse>.Failure(
                    StoreMediaErrorCodes.InvalidPlacement,
                    "Placement must be HOME_STORY or STORE_SHOWCASE.");
            }

            if (!ExternalVideoParser.TryParse(request.VideoUrl, out var parsedVideo) ||
                parsedVideo is null)
            {
                return ServiceResult<StoreMediaResponse>.Failure(
                    StoreMediaErrorCodes.InvalidUrl,
                    "Paste a public HTTPS YouTube or TikTok video URL.");
            }

            var now = DateTime.UtcNow;

            await using var transaction = await _dbContext.Database
                .BeginTransactionAsync(IsolationLevel.Serializable);

            var seller = await _dbContext.UserAccounts
                .AsNoTracking()
                .SingleOrDefaultAsync(item => item.UserId == sellerUserId);

            var store = await _dbContext.Stores
                .SingleOrDefaultAsync(item => item.SellerUserId == sellerUserId);

            if (seller is null || store is null)
            {
                await transaction.RollbackAsync();
                return ServiceResult<StoreMediaResponse>.Failure(
                    StoreMediaErrorCodes.StoreNotFound,
                    "Create your store before adding Store Stories or Store Showcase media.");
            }

            if (seller.AccountStatus != AccountStatuses.Active ||
                store.ApprovalStatus != StoreApprovalStatuses.Approved ||
                store.StoreStatus != StoreStatuses.Active)
            {
                await transaction.RollbackAsync();
                return ServiceResult<StoreMediaResponse>.Failure(
                    StoreMediaErrorCodes.StoreNotPublic,
                    "Your store must be approved and active before publishing media.");
            }

            if (placement == StoreMediaPlacements.HomeStory)
            {
                var activeHomeStoryCount = await Media.CountAsync(item =>
                    item.StoreId == store.StoreId &&
                    item.Placement == StoreMediaPlacements.HomeStory &&
                    item.IsActive &&
                    item.RemovedDate == null &&
                    item.ExpiresAt != null &&
                    item.ExpiresAt > now);

                if (activeHomeStoryCount >= MaxActiveHomeStoriesPerStore)
                {
                    await transaction.RollbackAsync();
                    return ServiceResult<StoreMediaResponse>.Failure(
                        StoreMediaErrorCodes.HomeStoryLimitReached,
                        "A store can have at most 2 active homepage stories. Remove one or wait for it to expire.");
                }
            }

            var media = new Models.StoreMedia
            {
                StoreId = store.StoreId,
                Title = title,
                Placement = placement,
                Platform = parsedVideo.Platform,
                ExternalUrl = parsedVideo.CanonicalUrl,
                ExternalVideoId = parsedVideo.VideoId,
                CreatedDate = now,
                ExpiresAt = placement == StoreMediaPlacements.HomeStory
                    ? now.Add(HomeStoryLifetime)
                    : null,
                IsActive = true,
                RemovedDate = null
            };

            Media.Add(media);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return ServiceResult<StoreMediaResponse>.Success(
                MapResponse(media, store));
        }

        public async Task<ServiceResult<bool>> RemoveAsync(
            int sellerUserId,
            int storeMediaId)
        {
            var storeId = await _dbContext.Stores
                .Where(item => item.SellerUserId == sellerUserId)
                .Select(item => (int?)item.StoreId)
                .SingleOrDefaultAsync();

            if (storeId is null)
            {
                return ServiceResult<bool>.Failure(
                    StoreMediaErrorCodes.StoreNotFound,
                    "Store not found.");
            }

            var media = await Media.SingleOrDefaultAsync(item =>
                item.StoreMediaId == storeMediaId &&
                item.StoreId == storeId.Value &&
                item.IsActive &&
                item.RemovedDate == null);

            if (media is null)
            {
                return ServiceResult<bool>.Failure(
                    StoreMediaErrorCodes.MediaNotFound,
                    "Store media was not found.");
            }

            media.IsActive = false;
            media.RemovedDate = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return ServiceResult<bool>.Success(true);
        }

        private static StoreMediaResponse MapResponse(
            Models.StoreMedia media,
            Shopera.Domain.Entities.Store store)
        {
            string? thumbnailUrl = null;
            string? embedUrl = null;

            if (media.Platform == StoreMediaPlatforms.YouTube &&
                !string.IsNullOrWhiteSpace(media.ExternalVideoId))
            {
                thumbnailUrl =
                    $"https://i.ytimg.com/vi/{media.ExternalVideoId}/hqdefault.jpg";
                embedUrl =
                    $"https://www.youtube-nocookie.com/embed/{media.ExternalVideoId}";
            }
            else if (media.Platform == StoreMediaPlatforms.TikTok)
            {
                thumbnailUrl = !string.IsNullOrWhiteSpace(store.StoreBannerUrl)
                    ? store.StoreBannerUrl
                    : store.StoreLogoUrl;
            }

            return new StoreMediaResponse(
                media.StoreMediaId,
                media.StoreId,
                store.StoreName,
                store.StoreSlug,
                store.StoreLogoUrl,
                store.StoreBannerUrl,
                media.Title,
                media.Placement,
                media.Platform,
                media.ExternalUrl,
                thumbnailUrl,
                embedUrl,
                media.CreatedDate,
                media.ExpiresAt);
        }
    }
}
