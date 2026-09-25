using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Notifications.Contracts;
using Shopera.Features.Notifications.DTOs;
using Shopera.Features.Seller.Stores.Contracts;
using Shopera.Features.Seller.Stores.DTOs;
using Shopera.Features.Seller.Stores.Models;

namespace Shopera.Features.Seller.Stores.Services
{
    public sealed class SellerStoreService
        : ISellerStoreService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly INotificationService _notificationService;

        public SellerStoreService(
            ApplicationDbContext dbContext,
            INotificationService notificationService)
        {
            _dbContext = dbContext;
            _notificationService = notificationService;
        }

        public async Task<ServiceResult<SellerStoreResponse>>
            GetMineAsync(int sellerUserId)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return Forbidden<SellerStoreResponse>();
            }

            var store = await _dbContext.Stores
                .AsNoTracking()
                .SingleOrDefaultAsync(item =>
                    item.SellerUserId == sellerUserId);

            if (store is null)
            {
                return NotFound<SellerStoreResponse>();
            }

            return ServiceResult<SellerStoreResponse>.Success(
                await MapToResponseAsync(store));
        }

        public async Task<ServiceResult<StoreSubmissionResponse>>
            CreateAsync(
                int sellerUserId,
                CreateSellerStoreRequest request)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return Forbidden<StoreSubmissionResponse>();
            }

            if (await _dbContext.Stores.AnyAsync(store =>
                    store.SellerUserId == sellerUserId))
            {
                return ServiceResult<
                    StoreSubmissionResponse>.Failure(
                    SellerStoreErrorCodes.StoreAlreadyExists,
                    "A seller may own only one store.");
            }

            var storeName =
                NormalizeRequired(request.StoreName);

            if (storeName is null)
            {
                return Invalid<StoreSubmissionResponse>(
                    "StoreName is required.");
            }

            var storeSlug = NormalizeSlug(request.StoreSlug);
            var supportEmail =
                NormalizeRequiredEmail(request.SupportEmail);

            if (supportEmail is null)
            {
                return Invalid<StoreSubmissionResponse>(
                    "SupportEmail is required and must be a " +
                    "valid email address.");
            }

            var duplicateError = await FindDuplicateAsync(
                null,
                storeName,
                storeSlug);

            if (duplicateError is not null)
            {
                return ServiceResult<
                    StoreSubmissionResponse>.Failure(
                    duplicateError.Value.Code,
                    duplicateError.Value.Message);
            }

            var store = new Store
            {
                SellerUserId = sellerUserId,
                StoreName = storeName,
                StoreSlug = storeSlug,
                StoreDescription =
                    NormalizeOptional(
                        request.StoreDescription),
                StoreLogoUrl =
                    NormalizeOptional(request.StoreLogoUrl),
                StoreBannerUrl =
                    NormalizeOptional(
                        request.StoreBannerUrl),
                SupportEmail = supportEmail,
                SupportPhone =
                    NormalizeOptional(request.SupportPhone),
                ReturnPolicy =
                    NormalizeOptional(request.ReturnPolicy),
                SupportPolicy =
                    NormalizeOptional(request.SupportPolicy),
                ApprovalStatus =
                    StoreApprovalStatuses.Pending,
                ApprovedByAdminUserId = null,
                CreatedDate = DateTime.UtcNow,
                UpdatedDate = null,
                StoreStatus = StoreStatuses.Active
            };

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync();

            _dbContext.Stores.Add(store);
            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                await transaction.RollbackAsync();
                _dbContext.ChangeTracker.Clear();

                if (DatabaseExceptionClassifier.MentionsConstraint(exception, "UQ_STORE_Seller"))
                {
                    return ServiceResult<StoreSubmissionResponse>.Failure(
                        SellerStoreErrorCodes.StoreAlreadyExists,
                        "A seller may own only one store.");
                }

                if (DatabaseExceptionClassifier.MentionsConstraint(exception, "UX_STORE_Slug_NotNull"))
                {
                    return ServiceResult<StoreSubmissionResponse>.Failure(
                        SellerStoreErrorCodes.DuplicateStoreSlug,
                        "Another store already uses this slug.");
                }

                return ServiceResult<StoreSubmissionResponse>.Failure(
                    SellerStoreErrorCodes.DuplicateStoreName,
                    "Another store already uses this name.");
            }

            var notifications =
                await SaveAdminNotificationsAsync(
                    store,
                    sellerUserId,
                    "A seller submitted a new store for approval.");

            await transaction.CommitAsync();
            await DeliverNotificationsAsync(notifications);

            return ServiceResult<
                StoreSubmissionResponse>.Success(
                new StoreSubmissionResponse
                {
                    Store = await MapToResponseAsync(store),
                    AdminNotificationCount =
                        notifications.Count
                });
        }

        public async Task<ServiceResult<SellerStoreResponse>>
            UpdateAsync(
                int sellerUserId,
                UpdateSellerStoreRequest request)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return Forbidden<SellerStoreResponse>();
            }

            var store = await _dbContext.Stores
                .SingleOrDefaultAsync(item =>
                    item.SellerUserId == sellerUserId);

            if (store is null)
            {
                return NotFound<SellerStoreResponse>();
            }

            if (store.ApprovalStatus ==
                    StoreApprovalStatuses.Suspended ||
                store.StoreStatus == StoreStatuses.Suspended ||
                store.StoreStatus == StoreStatuses.Closed)
            {
                return ServiceResult<
                    SellerStoreResponse>.Failure(
                    SellerStoreErrorCodes
                        .InvalidStoreTransition,
                    "A suspended or closed store cannot be " +
                    "edited by the seller.");
            }

            var storeName = request.StoreName is null
                ? store.StoreName
                : NormalizeRequired(request.StoreName);

            if (storeName is null)
            {
                return Invalid<SellerStoreResponse>(
                    "StoreName cannot be empty.");
            }

            var storeSlug = request.StoreSlug is null
                ? store.StoreSlug
                : NormalizeSlug(request.StoreSlug);
            var supportEmail =
                NormalizeRequiredEmail(request.SupportEmail);

            if (supportEmail is null)
            {
                return Invalid<SellerStoreResponse>(
                    "SupportEmail is required and must be a " +
                    "valid email address.");
            }

            var duplicateError = await FindDuplicateAsync(
                store.StoreId,
                storeName,
                storeSlug);

            if (duplicateError is not null)
            {
                return ServiceResult<
                    SellerStoreResponse>.Failure(
                    duplicateError.Value.Code,
                    duplicateError.Value.Message);
            }

            store.StoreName = storeName;
            store.StoreSlug = storeSlug;
            store.StoreDescription =
                ApplyOptionalUpdate(
                    request.StoreDescription,
                    store.StoreDescription);
            store.StoreLogoUrl =
                ApplyOptionalUpdate(
                    request.StoreLogoUrl,
                    store.StoreLogoUrl);
            store.StoreBannerUrl =
                ApplyOptionalUpdate(
                    request.StoreBannerUrl,
                    store.StoreBannerUrl);
            store.SupportEmail = supportEmail;
            store.SupportPhone =
                ApplyOptionalUpdate(
                    request.SupportPhone,
                    store.SupportPhone);
            store.ReturnPolicy =
                ApplyOptionalUpdate(
                    request.ReturnPolicy,
                    store.ReturnPolicy);
            store.SupportPolicy =
                ApplyOptionalUpdate(
                    request.SupportPolicy,
                    store.SupportPolicy);
            store.UpdatedDate = DateTime.UtcNow;

            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();

                if (DatabaseExceptionClassifier.MentionsConstraint(exception, "UX_STORE_Slug_NotNull"))
                {
                    return ServiceResult<SellerStoreResponse>.Failure(
                        SellerStoreErrorCodes.DuplicateStoreSlug,
                        "Another store already uses this slug.");
                }

                return ServiceResult<SellerStoreResponse>.Failure(
                    SellerStoreErrorCodes.DuplicateStoreName,
                    "Another store already uses this name.");
            }

            return ServiceResult<SellerStoreResponse>.Success(
                await MapToResponseAsync(store));
        }

        public async Task<ServiceResult<StoreSubmissionResponse>>
            ResubmitAsync(int sellerUserId)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return Forbidden<StoreSubmissionResponse>();
            }

            var store = await _dbContext.Stores
                .SingleOrDefaultAsync(item =>
                    item.SellerUserId == sellerUserId);

            if (store is null)
            {
                return NotFound<StoreSubmissionResponse>();
            }

            if (store.ApprovalStatus !=
                StoreApprovalStatuses.Rejected)
            {
                return ServiceResult<
                    StoreSubmissionResponse>.Failure(
                    SellerStoreErrorCodes
                        .InvalidStoreTransition,
                    "Only a REJECTED store can be resubmitted.");
            }

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync();

            store.ApprovalStatus =
                StoreApprovalStatuses.Pending;
            store.ApprovedByAdminUserId = null;
            store.UpdatedDate = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            // STORE_APPROVAL_HISTORY requires an admin actor in
            // the approved physical schema. A seller resubmission
            // therefore cannot truthfully create an admin-history
            // row. The next admin decision remains fully audited.
            var notifications =
                await SaveAdminNotificationsAsync(
                    store,
                    sellerUserId,
                    "A seller resubmitted a rejected store " +
                    "for approval.");

            await transaction.CommitAsync();
            await DeliverNotificationsAsync(notifications);

            return ServiceResult<
                StoreSubmissionResponse>.Success(
                new StoreSubmissionResponse
                {
                    Store = await MapToResponseAsync(store),
                    AdminNotificationCount =
                        notifications.Count
                });
        }

        public async Task<ServiceResult<SellerStoreResponse>>
            UpdateStatusAsync(
                int sellerUserId,
                UpdateSellerStoreStatusRequest request)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return Forbidden<SellerStoreResponse>();
            }

            var store = await _dbContext.Stores
                .SingleOrDefaultAsync(item =>
                    item.SellerUserId == sellerUserId);

            if (store is null)
            {
                return NotFound<SellerStoreResponse>();
            }

            var requestedStatus =
                NormalizeOptional(request.StoreStatus)?
                    .ToUpperInvariant();
            var sellerStatuses = new[]
            {
                StoreStatuses.Active,
                StoreStatuses.Inactive,
                StoreStatuses.Closed
            };

            if (requestedStatus is null ||
                !sellerStatuses.Contains(requestedStatus))
            {
                return ServiceResult<
                    SellerStoreResponse>.Failure(
                    SellerStoreErrorCodes
                        .InvalidStoreTransition,
                    "Seller store status must be ACTIVE, " +
                    "INACTIVE, or CLOSED.");
            }

            if (store.StoreStatus == StoreStatuses.Closed)
            {
                return ServiceResult<
                    SellerStoreResponse>.Failure(
                    SellerStoreErrorCodes
                        .InvalidStoreTransition,
                    "A CLOSED store cannot be reopened by the " +
                    "seller.");
            }

            if (store.StoreStatus ==
                    StoreStatuses.Suspended ||
                store.ApprovalStatus ==
                    StoreApprovalStatuses.Suspended)
            {
                return ServiceResult<
                    SellerStoreResponse>.Failure(
                    SellerStoreErrorCodes
                        .InvalidStoreTransition,
                    "A suspended store requires Admin action.");
            }

            if (requestedStatus == StoreStatuses.Active &&
                store.ApprovalStatus !=
                    StoreApprovalStatuses.Approved)
            {
                return ServiceResult<
                    SellerStoreResponse>.Failure(
                    SellerStoreErrorCodes
                        .InvalidStoreTransition,
                    "Only an APPROVED store can be activated.");
            }

            store.StoreStatus = requestedStatus;
            store.UpdatedDate = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            return ServiceResult<SellerStoreResponse>.Success(
                await MapToResponseAsync(store));
        }

        private async Task<List<SavedAdminNotification>>
            SaveAdminNotificationsAsync(
                Store store,
                int sellerUserId,
                string actionMessage)
        {
            var adminUserIds = await _dbContext.UserAccounts
                .AsNoTracking()
                .Where(user =>
                    user.Role == AccountRoles.Admin &&
                    user.AccountStatus ==
                        AccountStatuses.Active)
                .Select(user => user.UserId)
                .ToListAsync();

            var notifications =
                new List<SavedAdminNotification>();

            foreach (var adminUserId in adminUserIds)
            {
                var response =
                    await _notificationService
                        .CreateStoredAsync(
                            new CreateNotificationRequest
                            {
                                RecipientUserId =
                                    adminUserId,
                                ActorUserId =
                                    sellerUserId,
                                NotificationType =
                                    "SellerApprovalRequested",
                                Title =
                                    "Store approval requested",
                                Message =
                                    $"{actionMessage} " +
                                    $"Store: {store.StoreName}.",
                                RelatedEntityType = "Store",
                                RelatedEntityId =
                                    store.StoreId
                            });

                notifications.Add(
                    new SavedAdminNotification(
                        adminUserId,
                        response));
            }

            return notifications;
        }

        private async Task DeliverNotificationsAsync(
            IReadOnlyList<SavedAdminNotification> notifications)
        {
            foreach (var notification in notifications)
            {
                await _notificationService.DeliverAsync(
                    notification.AdminUserId,
                    notification.Response);
            }
        }

        private async Task<SellerStoreResponse>
            MapToResponseAsync(Store store)
        {
            var latestDecisionNote =
                await _dbContext.StoreApprovalHistories
                    .AsNoTracking()
                    .Where(history =>
                        history.StoreId == store.StoreId)
                    .OrderByDescending(history =>
                        history.ChangedDate)
                    .ThenByDescending(history =>
                        history.StoreApprovalHistoryId)
                    .Select(history => history.DecisionNote)
                    .FirstOrDefaultAsync();

            var visibleProductCount =
                store.ApprovalStatus == StoreApprovalStatuses.Approved &&
                store.StoreStatus == StoreStatuses.Active
                    ? await _dbContext.Products
                        .AsNoTracking()
                        .CountAsync(product =>
                            product.StoreId == store.StoreId &&
                            (product.Status == ProductStatuses.Active ||
                             product.Status == ProductStatuses.OutOfStock))
                    : 0;

            return new SellerStoreResponse
            {
                StoreId = store.StoreId,
                SellerUserId = store.SellerUserId,
                StoreName = store.StoreName,
                StoreSlug = store.StoreSlug,
                StoreDescription = store.StoreDescription,
                StoreLogoUrl = store.StoreLogoUrl,
                StoreBannerUrl = store.StoreBannerUrl,
                SupportEmail = store.SupportEmail,
                SupportPhone = store.SupportPhone,
                ReturnPolicy = store.ReturnPolicy,
                SupportPolicy = store.SupportPolicy,
                ApprovalStatus = store.ApprovalStatus,
                StoreStatus = store.StoreStatus,
                CreatedDate = store.CreatedDate,
                UpdatedDate = store.UpdatedDate,
                LatestDecisionNote = latestDecisionNote,
                VisibleProductCount = visibleProductCount
            };
        }

        private async Task<(string Code, string Message)?>
            FindDuplicateAsync(
                int? excludedStoreId,
                string storeName,
                string? storeSlug)
        {
            if (await _dbContext.Stores.AnyAsync(store =>
                    (!excludedStoreId.HasValue ||
                     store.StoreId != excludedStoreId.Value) &&
                    store.StoreName == storeName))
            {
                return (
                    SellerStoreErrorCodes.DuplicateStoreName,
                    "Another store already uses this name.");
            }

            if (storeSlug is not null &&
                await _dbContext.Stores.AnyAsync(store =>
                    (!excludedStoreId.HasValue ||
                     store.StoreId != excludedStoreId.Value) &&
                    store.StoreSlug == storeSlug))
            {
                return (
                    SellerStoreErrorCodes.DuplicateStoreSlug,
                    "Another store already uses this slug.");
            }

            return null;
        }

        private async Task<bool> IsActiveSellerAsync(
            int sellerUserId)
        {
            return sellerUserId > 0 &&
                await _dbContext.UserAccounts
                    .AsNoTracking()
                    .AnyAsync(user =>
                        user.UserId == sellerUserId &&
                        user.Role == AccountRoles.Seller &&
                        user.AccountStatus ==
                            AccountStatuses.Active);
        }

        private static string? NormalizeRequired(
            string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static string? NormalizeOptional(
            string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static string? NormalizeSlug(string? value)
        {
            return NormalizeOptional(value)?.ToLowerInvariant();
        }

        private static string? NormalizeRequiredEmail(
            string? value)
        {
            var normalized = NormalizeRequired(value);

            return normalized is not null &&
                new EmailAddressAttribute().IsValid(normalized)
                    ? normalized.ToLowerInvariant()
                    : null;
        }

        private static string? ApplyOptionalUpdate(
            string? requestedValue,
            string? currentValue)
        {
            return requestedValue is null
                ? currentValue
                : NormalizeOptional(requestedValue);
        }

        private static ServiceResult<T> Forbidden<T>()
        {
            return ServiceResult<T>.Failure(
                SellerStoreErrorCodes.SellerForbidden,
                "The supplied user is not an active seller.");
        }

        private static ServiceResult<T> NotFound<T>()
        {
            return ServiceResult<T>.Failure(
                SellerStoreErrorCodes.StoreNotFound,
                "The seller does not have a store.");
        }

        private static ServiceResult<T> Invalid<T>(
            string message)
        {
            return ServiceResult<T>.Failure(
                SellerStoreErrorCodes.InvalidStore,
                message);
        }

        private sealed record SavedAdminNotification(
            int AdminUserId,
            NotificationResponse Response);
    }
}
