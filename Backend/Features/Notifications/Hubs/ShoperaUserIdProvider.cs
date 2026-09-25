using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace Shopera.Features.Notifications.Hubs;

public sealed class ShoperaUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return GetUserId(connection.User);
    }

    public static string? GetUserId(ClaimsPrincipal? user)
    {
        return user?.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
