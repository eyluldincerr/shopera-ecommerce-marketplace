using Shopera.Features.Notifications.DTOs;

namespace Shopera.Features.Notifications.Contracts
{
    public interface INotificationService
    {
        Task<NotificationResponse> CreateAsync(
            CreateNotificationRequest request);

        Task<NotificationResponse> CreateStoredAsync(
            CreateNotificationRequest request);

        Task DeliverAsync(
            int recipientUserId,
            NotificationResponse notification);

        Task<IReadOnlyList<NotificationResponse>> GetForUserAsync(
            int recipientUserId);

        Task<int> GetUnreadCountAsync(
            int recipientUserId);

        Task<bool> MarkAsReadAsync(
            int notificationId,
            int recipientUserId);

        Task<int> MarkAllAsReadAsync(
            int recipientUserId);
    }
}
