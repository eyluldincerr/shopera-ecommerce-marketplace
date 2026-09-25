using System.Security.Claims;
using Shopera.Features.Notifications.Hubs;

namespace Shopera.Tests;

public sealed class NotificationSignalRTests
{
    [Fact]
    public void UserIdProvider_UsesJwtNameIdentifierClaim()
    {
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, "42")],
                "Test"));

        Assert.Equal("42", ShoperaUserIdProvider.GetUserId(user));
    }

    [Fact]
    public void UserIdProvider_ReturnsNullWithoutIdentifierClaim()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity([], "Test"));

        Assert.Null(ShoperaUserIdProvider.GetUserId(user));
    }
}
