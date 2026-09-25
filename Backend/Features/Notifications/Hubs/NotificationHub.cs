using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Shopera.Features.Notifications.Hubs
{
    // This hub is intentionally empty. It is the authenticated SignalR
    // connection endpoint; server-side notifications are sent through
    // IHubContext<NotificationHub> in NotificationService. Add public hub
    // methods only when clients need to call the server over SignalR.
    [Authorize]
    public sealed class NotificationHub : Hub
    {
    }
}
