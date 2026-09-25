using System.Security.Claims;

namespace Shopera.Common.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetRequiredUserId(this ClaimsPrincipal user)
    {
        string? value = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(value, out int userId) || userId <= 0)
        {
            throw new UnauthorizedAccessException(
                "The access token does not contain a valid user identifier.");
        }

        return userId;
    }
}
