using Shopera.Features.Notifications.Contracts;
using Shopera.Features.Notifications.DTOs;

namespace Shopera.Tests.Support
{
    internal sealed class FakeNotificationService
        : INotificationService
    {
        private int _nextNotificationId = 1;

        public List<CreateNotificationRequest> Created { get; } =
            new();

        public List<(int RecipientUserId, int NotificationId)>
            Delivered { get; } = new();

        public Task<NotificationResponse> CreateAsync(
            CreateNotificationRequest request)
        {
            return CreateAndRecordAsync(request, true);
        }

        public Task<NotificationResponse> CreateStoredAsync(
            CreateNotificationRequest request)
        {
            return CreateAndRecordAsync(request, false);
        }

        public Task DeliverAsync(
            int recipientUserId,
            NotificationResponse notification)
        {
            Delivered.Add(
                (recipientUserId, notification.NotificationId));

            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<NotificationResponse>>
            GetForUserAsync(int recipientUserId)
        {
            return Task.FromResult<
                IReadOnlyList<NotificationResponse>>(
                Array.Empty<NotificationResponse>());
        }

        public Task<int> GetUnreadCountAsync(
            int recipientUserId)
        {
            return Task.FromResult(0);
        }

        public Task<bool> MarkAsReadAsync(
            int notificationId,
            int recipientUserId)
        {
            return Task.FromResult(false);
        }

        public Task<int> MarkAllAsReadAsync(
            int recipientUserId)
        {
            return Task.FromResult(0);
        }

        private async Task<NotificationResponse>
            CreateAndRecordAsync(
                CreateNotificationRequest request,
                bool deliver)
        {
            Created.Add(request);

            var response = new NotificationResponse
            {
                NotificationId = _nextNotificationId++,
                NotificationType = request.NotificationType,
                Title = request.Title,
                Message = request.Message,
                RelatedEntityType =
                    request.RelatedEntityType,
                RelatedEntityId =
                    request.RelatedEntityId,
                IsRead = false,
                CreatedDate = DateTime.UtcNow
            };

            if (deliver)
            {
                await DeliverAsync(
                    request.RecipientUserId,
                    response);
            }

            return response;
        }
    }
}
