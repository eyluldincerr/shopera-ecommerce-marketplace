using Microsoft.EntityFrameworkCore;
using Shopera.Common.DTOs;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Admin.Contracts;
using Shopera.Features.Admin.DTOs;
using Shopera.Features.Admin.Models;
using Shopera.Features.Notifications.Contracts;
using Shopera.Features.Notifications.DTOs;

namespace Shopera.Features.Admin.Services
{
    public sealed class AdminService : IAdminService
    {
        private const int MaximumPageSize = 100;

        private readonly ApplicationDbContext _dbContext;
        private readonly INotificationService _notificationService;

        public AdminService(
            ApplicationDbContext dbContext,
            INotificationService notificationService)
        {
            _dbContext = dbContext;
            _notificationService = notificationService;
        }

        public async Task<AdminServiceResult<
            PagedResponse<AdminStoreResponse>>> GetStoresAsync(
            int adminUserId,
            string? approvalStatus,
            string? search,
            int page,
            int pageSize)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<PagedResponse<AdminStoreResponse>>();
            }

            var normalizedStatus =
                NormalizeOptionalUppercase(approvalStatus);

            if (normalizedStatus is not null &&
                !StoreApprovalStatuses.All.Contains(normalizedStatus))
            {
                return AdminServiceResult<
                    PagedResponse<AdminStoreResponse>>.Failure(
                    AdminErrorCodes.InvalidApprovalStatus,
                    "Approval status must be PENDING, APPROVED, " +
                    "REJECTED, or SUSPENDED.");
            }

            page = NormalizePage(page);
            pageSize = NormalizePageSize(pageSize);

            var query =
                from store in _dbContext.Stores.AsNoTracking()
                join seller in _dbContext.UserAccounts.AsNoTracking()
                    on store.SellerUserId equals seller.UserId
                select new
                {
                    Store = store,
                    Seller = seller
                };

            if (normalizedStatus is not null)
            {
                query = query.Where(item =>
                    item.Store.ApprovalStatus == normalizedStatus);
            }

            var normalizedSearch = NormalizeOptional(search);

            if (normalizedSearch is not null)
            {
                var pattern = $"%{normalizedSearch}%";

                query = query.Where(item =>
                    EF.Functions.Like(
                        item.Store.StoreName,
                        pattern) ||
                    EF.Functions.Like(
                        item.Seller.FullName,
                        pattern) ||
                    EF.Functions.Like(
                        item.Seller.Email,
                        pattern));
            }

            var totalCount = await query.CountAsync();

            var stores = await query
                .OrderByDescending(item => item.Store.CreatedDate)
                .ThenBy(item => item.Store.StoreId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(item => new AdminStoreResponse
                {
                    StoreId = item.Store.StoreId,
                    StoreName = item.Store.StoreName,
                    StoreSlug = item.Store.StoreSlug,
                    StoreDescription = item.Store.StoreDescription,
                    SupportEmail = item.Store.SupportEmail,
                    SupportPhone = item.Store.SupportPhone,
                    ReturnPolicy = item.Store.ReturnPolicy,
                    SupportPolicy = item.Store.SupportPolicy,
                    SellerUserId = item.Store.SellerUserId,
                    SellerName = item.Seller.FullName,
                    SellerEmail = item.Seller.Email,
                    SellerPhoneNumber = item.Seller.PhoneNumber,
                    SellerRegistrationDate = item.Seller.RegistrationDate,
                    SellerAccountStatus = item.Seller.AccountStatus,
                    SellerRole = item.Seller.Role,
                    ApprovalStatus = item.Store.ApprovalStatus,
                    StoreStatus = item.Store.StoreStatus,
                    ApprovedByAdminUserId = item.Store.ApprovedByAdminUserId,
                    CreatedDate = item.Store.CreatedDate,
                    UpdatedDate = item.Store.UpdatedDate
                })
                .ToListAsync();

            return AdminServiceResult<
                PagedResponse<AdminStoreResponse>>.Success(
                new PagedResponse<AdminStoreResponse>(
                    stores,
                    page,
                    pageSize,
                    totalCount));
        }

        public Task<AdminServiceResult<AdminStoreDecisionResponse>>
            ApproveStoreAsync(
                int adminUserId,
                int storeId,
                AdminStoreDecisionRequest request)
        {
            return DecideStoreAsync(
                adminUserId,
                storeId,
                StoreApprovalStatuses.Approved,
                request.DecisionNote);
        }

        public async Task<AdminServiceResult<
            AdminStoreDecisionResponse>> RejectStoreAsync(
            int adminUserId,
            int storeId,
            AdminStoreDecisionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.DecisionNote))
            {
                return AdminServiceResult<
                    AdminStoreDecisionResponse>.Failure(
                    AdminErrorCodes.DecisionNoteRequired,
                    "A rejection reason is required.");
            }

            return await DecideStoreAsync(
                adminUserId,
                storeId,
                StoreApprovalStatuses.Rejected,
                request.DecisionNote);
        }

        public async Task<AdminServiceResult<PagedResponse<
            AdminNotificationRecipientResponse>>>
            GetNotificationRecipientsAsync(
                int adminUserId,
                string? search,
                string? role,
                int page,
                int pageSize)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<PagedResponse<
                    AdminNotificationRecipientResponse>>();
            }

            var normalizedRole = NormalizeOptionalUppercase(role);

            if (normalizedRole is not null &&
                !AccountRoles.All.Contains(normalizedRole))
            {
                return AdminServiceResult<PagedResponse<
                    AdminNotificationRecipientResponse>>.Failure(
                    AdminErrorCodes.InvalidRole,
                    "Role must be BUYER, SELLER, or ADMIN.");
            }

            page = NormalizePage(page);
            pageSize = NormalizePageSize(pageSize);

            var query =
                from user in _dbContext.UserAccounts.AsNoTracking()
                join store in _dbContext.Stores.AsNoTracking()
                    on user.UserId equals store.SellerUserId
                    into stores
                from store in stores.DefaultIfEmpty()
                select new
                {
                    User = user,
                    Store = store
                };

            if (normalizedRole is not null)
            {
                query = query.Where(item =>
                    item.User.Role == normalizedRole);
            }

            var normalizedSearch = NormalizeOptional(search);

            if (normalizedSearch is not null)
            {
                var pattern = $"%{normalizedSearch}%";

                query = query.Where(item =>
                    EF.Functions.Like(
                        item.User.FullName,
                        pattern) ||
                    EF.Functions.Like(
                        item.User.Email,
                        pattern) ||
                    (item.Store != null &&
                     EF.Functions.Like(
                         item.Store.StoreName,
                         pattern)));
            }

            var totalCount = await query.CountAsync();

            var recipients = await query
                .OrderBy(item => item.User.FullName)
                .ThenBy(item => item.User.UserId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(item =>
                    new AdminNotificationRecipientResponse
                    {
                        UserId = item.User.UserId,
                        FullName = item.User.FullName,
                        Email = item.User.Email,
                        Role = item.User.Role,
                        AccountStatus =
                            item.User.AccountStatus,
                        StoreId = item.Store == null
                            ? null
                            : item.Store.StoreId,
                        StoreName = item.Store == null
                            ? null
                            : item.Store.StoreName
                    })
                .ToListAsync();

            return AdminServiceResult<PagedResponse<
                AdminNotificationRecipientResponse>>.Success(
                new PagedResponse<
                    AdminNotificationRecipientResponse>(
                    recipients,
                    page,
                    pageSize,
                    totalCount));
        }

        public async Task<AdminServiceResult<
            AdminSentNotificationResponse>> SendNotificationAsync(
            int adminUserId,
            AdminSendNotificationRequest request)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<AdminSentNotificationResponse>();
            }

            if (request.RecipientUserId.HasValue ==
                request.StoreId.HasValue)
            {
                return AdminServiceResult<
                    AdminSentNotificationResponse>.Failure(
                    AdminErrorCodes.InvalidTarget,
                    "Provide exactly one target: RecipientUserId " +
                    "or StoreId.");
            }

            if (!string.IsNullOrWhiteSpace(
                    request.RelatedEntityType) !=
                request.RelatedEntityId.HasValue)
            {
                return AdminServiceResult<
                    AdminSentNotificationResponse>.Failure(
                    AdminErrorCodes.InvalidTarget,
                    "RelatedEntityType and RelatedEntityId must " +
                    "either both be provided or both be omitted.");
            }

            NotificationTarget? target;

            if (request.StoreId.HasValue)
            {
                var storeId = request.StoreId.Value;

                target = await (
                    from store in _dbContext.Stores.AsNoTracking()
                    join user in
                        _dbContext.UserAccounts.AsNoTracking()
                        on store.SellerUserId equals user.UserId
                    where store.StoreId == storeId
                    select new NotificationTarget
                    {
                        UserId = user.UserId,
                        UserName = user.FullName,
                        UserRole = user.Role,
                        StoreId = store.StoreId,
                        StoreName = store.StoreName
                    })
                    .SingleOrDefaultAsync();

                if (target is null)
                {
                    return AdminServiceResult<
                        AdminSentNotificationResponse>.Failure(
                        AdminErrorCodes.StoreNotFound,
                        "The selected store was not found.");
                }
            }
            else
            {
                var recipientUserId =
                    request.RecipientUserId!.Value;

                target = await _dbContext.UserAccounts
                    .AsNoTracking()
                    .Where(user =>
                        user.UserId == recipientUserId)
                    .Select(user => new NotificationTarget
                    {
                        UserId = user.UserId,
                        UserName = user.FullName,
                        UserRole = user.Role
                    })
                    .SingleOrDefaultAsync();

                if (target is null)
                {
                    return AdminServiceResult<
                        AdminSentNotificationResponse>.Failure(
                        AdminErrorCodes.RecipientNotFound,
                        "The selected notification recipient " +
                        "was not found.");
                }
            }

            var relatedEntityType =
                NormalizeOptional(request.RelatedEntityType);
            var relatedEntityId = request.RelatedEntityId;

            if (target.StoreId.HasValue &&
                relatedEntityType is null)
            {
                relatedEntityType = "Store";
                relatedEntityId = target.StoreId;
            }

            var notification =
                await _notificationService.CreateAsync(
                    new CreateNotificationRequest
                    {
                        RecipientUserId = target.UserId,
                        ActorUserId = adminUserId,
                        NotificationType = "AdminMessage",
                        Title = request.Title.Trim(),
                        Message = request.Message.Trim(),
                        RelatedEntityType =
                            relatedEntityType,
                        RelatedEntityId = relatedEntityId
                    });

            return AdminServiceResult<
                AdminSentNotificationResponse>.Success(
                new AdminSentNotificationResponse
                {
                    RecipientUserId = target.UserId,
                    RecipientName = target.UserName,
                    RecipientRole = target.UserRole,
                    StoreId = target.StoreId,
                    StoreName = target.StoreName,
                    Notification = notification
                });
        }

        private async Task<AdminServiceResult<
            AdminStoreDecisionResponse>> DecideStoreAsync(
            int adminUserId,
            int storeId,
            string newStatus,
            string? decisionNote)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<AdminStoreDecisionResponse>();
            }

            var store = await _dbContext.Stores
                .AsNoTracking()
                .SingleOrDefaultAsync(item =>
                    item.StoreId == storeId);

            if (store is null)
            {
                return AdminServiceResult<
                    AdminStoreDecisionResponse>.Failure(
                    AdminErrorCodes.StoreNotFound,
                    "The selected store was not found.");
            }

            if (!string.Equals(
                    store.ApprovalStatus,
                    StoreApprovalStatuses.Pending,
                    StringComparison.OrdinalIgnoreCase))
            {
                return AdminServiceResult<
                    AdminStoreDecisionResponse>.Failure(
                    AdminErrorCodes.InvalidStoreTransition,
                    "Only a PENDING store can be approved " +
                    "or rejected.");
            }

            var changedDate = DateTime.UtcNow;
            var normalizedNote = NormalizeOptional(decisionNote);

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync();

            var updatedRows = await _dbContext.Stores
                .Where(item =>
                    item.StoreId == storeId &&
                    item.ApprovalStatus ==
                        StoreApprovalStatuses.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        item => item.ApprovalStatus,
                        newStatus)
                    .SetProperty(
                        item => item.ApprovedByAdminUserId,
                        (int?)adminUserId)
                    .SetProperty(
                        item => item.UpdatedDate,
                        (DateTime?)changedDate));

            if (updatedRows == 0)
            {
                await transaction.RollbackAsync();

                return AdminServiceResult<
                    AdminStoreDecisionResponse>.Failure(
                    AdminErrorCodes.InvalidStoreTransition,
                    "The store status changed before this " +
                    "decision was saved. Refresh and try again.");
            }

            _dbContext.StoreApprovalHistories.Add(
                new StoreApprovalHistory
                {
                    StoreId = store.StoreId,
                    OldStatus = store.ApprovalStatus,
                    NewStatus = newStatus,
                    ChangedByAdminUserId = adminUserId,
                    ChangedDate = changedDate,
                    DecisionNote = normalizedNote
                });

            await _dbContext.SaveChangesAsync();

            var approved = string.Equals(
                newStatus,
                StoreApprovalStatuses.Approved,
                StringComparison.Ordinal);

            var notification =
                await _notificationService.CreateStoredAsync(
                    new CreateNotificationRequest
                    {
                        RecipientUserId = store.SellerUserId,
                        ActorUserId = adminUserId,
                        NotificationType = approved
                            ? "StoreApproved"
                            : "StoreRejected",
                        Title = approved
                            ? "Store approved"
                            : "Store application rejected",
                        Message = BuildDecisionMessage(
                            store.StoreName,
                            approved,
                            normalizedNote),
                        RelatedEntityType = "Store",
                        RelatedEntityId = store.StoreId
                    });

            await transaction.CommitAsync();

            await _notificationService.DeliverAsync(
                store.SellerUserId,
                notification);

            return AdminServiceResult<
                AdminStoreDecisionResponse>.Success(
                new AdminStoreDecisionResponse
                {
                    StoreId = store.StoreId,
                    StoreName = store.StoreName,
                    SellerUserId = store.SellerUserId,
                    OldStatus = store.ApprovalStatus,
                    NewStatus = newStatus,
                    ChangedByAdminUserId = adminUserId,
                    ChangedDate = changedDate,
                    DecisionNote = normalizedNote,
                    Notification = notification
                });
        }

        private async Task<bool> IsActiveAdminAsync(
            int adminUserId)
        {
            return adminUserId > 0 &&
                await _dbContext.UserAccounts
                    .AsNoTracking()
                    .AnyAsync(user =>
                        user.UserId == adminUserId &&
                        user.Role == AccountRoles.Admin &&
                        user.AccountStatus ==
                            AccountStatuses.Active);
        }

        private static AdminServiceResult<T> Forbidden<T>()
        {
            return AdminServiceResult<T>.Failure(
                AdminErrorCodes.AdminForbidden,
                "The supplied user is not an active admin.");
        }

        private static string BuildDecisionMessage(
            string storeName,
            bool approved,
            string? decisionNote)
        {
            if (approved)
            {
                return $"Your store \"{storeName}\" has been approved.";
            }

            return $"Your store \"{storeName}\" was rejected. " +
                $"Reason: {decisionNote}";
        }

        private static int NormalizePage(int page)
        {
            return page < 1 ? 1 : page;
        }

        private static int NormalizePageSize(int pageSize)
        {
            return Math.Clamp(pageSize, 1, MaximumPageSize);
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static string? NormalizeOptionalUppercase(
            string? value)
        {
            return NormalizeOptional(value)?.ToUpperInvariant();
        }

        private sealed class NotificationTarget
        {
            public int UserId { get; set; }

            public string UserName { get; set; } = string.Empty;

            public string UserRole { get; set; } = string.Empty;

            public int? StoreId { get; set; }

            public string? StoreName { get; set; }
        }
    }
}
