using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Shopera.Data;
using Shopera.Domain.Entities;
using Shopera.Features.Notifications.Contracts;
using Shopera.Features.Notifications.DTOs;
using Shopera.Features.Notifications.Hubs;

namespace Shopera.Features.Notifications.Services
{
    public sealed class NotificationService : INotificationService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            ApplicationDbContext dbContext,
            IHubContext<NotificationHub> hubContext,
            ILogger<NotificationService> logger)
        {
            _dbContext = dbContext;
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task<NotificationResponse> CreateAsync(
            CreateNotificationRequest request)
        {
            var response = await CreateStoredAsync(request);

            await DeliverAsync(
                request.RecipientUserId,
                response);

            return response;
        }

        public async Task<NotificationResponse> CreateStoredAsync(
            CreateNotificationRequest request)
        {
            if (request.RecipientUserId <= 0)
            {
                throw new ArgumentException("Recipient user ID must be greater than zero.");
            }

            if (string.IsNullOrWhiteSpace(request.NotificationType) ||
                string.IsNullOrWhiteSpace(request.Title) ||
                string.IsNullOrWhiteSpace(request.Message))
            {
                throw new ArgumentException("Notification type, title, and message are required.");
            }

            if (string.IsNullOrWhiteSpace(request.RelatedEntityType) !=
                !request.RelatedEntityId.HasValue)
            {
                throw new ArgumentException(
                    "Related entity type and ID must either both be supplied or both be omitted.");
            }

            var notification = new Notification
            {
                RecipientUserId = request.RecipientUserId,
                ActorUserId = request.ActorUserId,
                NotificationType = request.NotificationType.Trim(),
                Title = request.Title.Trim(),
                Message = request.Message.Trim(),
                RelatedEntityType = request.RelatedEntityType?.Trim(),
                RelatedEntityId = request.RelatedEntityId,
                IsRead = false,
                CreatedDate = DateTime.UtcNow,
                ReadDate = null
            };

            _dbContext.Notifications.Add(notification);

            await _dbContext.SaveChangesAsync();

            var response = MapToResponse(notification);

            return response;
        }

        public async Task DeliverAsync(
            int recipientUserId,
            NotificationResponse notification)
        {
            await TrySendAsync(
                recipientUserId,
                "ReceiveNotification",
                notification);
        }

        public async Task<IReadOnlyList<NotificationResponse>>
            GetForUserAsync(int recipientUserId)
        {
            return await _dbContext.Notifications
                .AsNoTracking()
                .Where(notification =>
                    notification.RecipientUserId == recipientUserId)
                .OrderByDescending(notification =>
                    notification.CreatedDate)
                .Select(notification => new NotificationResponse
                {
                    NotificationId =
                        notification.NotificationId,

                    NotificationType =
                        notification.NotificationType,

                    Title = notification.Title,

                    Message = notification.Message,

                    RelatedEntityType =
                        notification.RelatedEntityType,

                    RelatedEntityId =
                        notification.RelatedEntityId,

                    IsRead = notification.IsRead,

                    CreatedDate = notification.CreatedDate,

                    ReadDate = notification.ReadDate
                })
                .ToListAsync();
        }

        public async Task<int> GetUnreadCountAsync(
            int recipientUserId)
        {
            return await _dbContext.Notifications.CountAsync(
                notification =>
                    notification.RecipientUserId == recipientUserId &&
                    !notification.IsRead
            );
        }

        public async Task<bool> MarkAsReadAsync(
            int notificationId,
            int recipientUserId)
        {
            var notification =
                await _dbContext.Notifications.FirstOrDefaultAsync(
                    item =>
                        item.NotificationId == notificationId &&
                        item.RecipientUserId == recipientUserId
                );

            if (notification is null)
            {
                return false;
            }

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadDate = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
            }

            await TrySendAsync(
                recipientUserId,
                "NotificationRead",
                notification.NotificationId);

            return true;
        }

        public async Task<int> MarkAllAsReadAsync(
            int recipientUserId)
        {
            var unreadNotifications =
                await _dbContext.Notifications
                    .Where(notification =>
                        notification.RecipientUserId ==
                            recipientUserId &&
                        !notification.IsRead)
                    .ToListAsync();

            if (unreadNotifications.Count == 0)
            {
                return 0;
            }

            var readDate = DateTime.UtcNow;

            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
                notification.ReadDate = readDate;
            }

            await _dbContext.SaveChangesAsync();

            await TrySendAsync(
                recipientUserId,
                "AllNotificationsRead",
                new
                {
                    UpdatedCount = unreadNotifications.Count
                });

            return unreadNotifications.Count;
        }

        private async Task TrySendAsync(
            int recipientUserId,
            string eventName,
            object payload)
        {
            try
            {
                await _hubContext.Clients
                    .User(recipientUserId.ToString())
                    .SendAsync(eventName, payload);
            }
            catch (Exception exception)
            {
                _logger.LogWarning(
                    exception,
                    "Notification {EventName} was saved but could " +
                    "not be delivered live to user {RecipientUserId}.",
                    eventName,
                    recipientUserId);
            }
        }

        private static NotificationResponse MapToResponse(
            Notification notification)
        {
            return new NotificationResponse
            {
                NotificationId =
                    notification.NotificationId,

                NotificationType =
                    notification.NotificationType,

                Title = notification.Title,

                Message = notification.Message,

                RelatedEntityType =
                    notification.RelatedEntityType,

                RelatedEntityId =
                    notification.RelatedEntityId,

                IsRead = notification.IsRead,

                CreatedDate = notification.CreatedDate,

                ReadDate = notification.ReadDate
            };
        }
    }
}
