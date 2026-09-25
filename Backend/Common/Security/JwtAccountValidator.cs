using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Shopera.Data;
using Shopera.Domain.Constants;

namespace Shopera.Common.Security;

public static class JwtAccountValidator
{
    public static async Task<bool> IsCurrentAccountAllowedAsync(
        ApplicationDbContext dbContext,
        ClaimsPrincipal principal,
        string signingKey,
        CancellationToken cancellationToken = default)
    {
        string? userIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        string? roleValue = principal.FindFirstValue(ClaimTypes.Role);
        string? securityStamp = principal.FindFirstValue(
            JwtSecurityStamp.ClaimType);

        if (!int.TryParse(userIdValue, out int userId) ||
            userId < 1 ||
            string.IsNullOrWhiteSpace(roleValue) ||
            string.IsNullOrWhiteSpace(securityStamp))
        {
            return false;
        }

        string normalizedRole = roleValue.Trim().ToUpperInvariant();
        if (!AccountRoles.All.Contains(normalizedRole))
        {
            return false;
        }

        var account = await dbContext.UserAccounts
            .AsNoTracking()
            .Where(user => user.UserId == userId)
            .Select(user => new
            {
                user.AccountStatus,
                user.Role,
                user.PasswordHash
            })
            .SingleOrDefaultAsync(cancellationToken);

        return account is not null &&
            account.AccountStatus == AccountStatuses.Active &&
            account.Role == normalizedRole &&
            JwtSecurityStamp.Matches(
                securityStamp,
                account.PasswordHash,
                signingKey);
    }
}
