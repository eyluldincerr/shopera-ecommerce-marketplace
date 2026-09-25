using Shopera.Domain.Entities;

namespace Shopera.Features.Identity.Authentication.Contracts;

public interface IAuthRepository
{
    Task<UserAccount?> FindByEmailAsync(string normalizedEmail);

    Task<UserAccount?> FindActiveByIdAsync(int userId);

    Task<UserAccount?> FindByIdForUpdateAsync(int userId);

    Task<PasswordResetToken?> FindPasswordResetTokenAsync(
        string tokenHash);

    Task InvalidatePasswordResetTokensAsync(int userId);

    Task AddPasswordResetTokenAsync(PasswordResetToken token);

    Task AddAsync(UserAccount user);

    Task SaveChangesAsync();
}
