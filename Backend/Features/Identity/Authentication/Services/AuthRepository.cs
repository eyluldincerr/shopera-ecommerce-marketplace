using Microsoft.EntityFrameworkCore;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Identity.Authentication.Contracts;

namespace Shopera.Features.Identity.Authentication.Services;

public sealed class AuthRepository : IAuthRepository
{
    private readonly ApplicationDbContext _context;

    public AuthRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task<UserAccount?> FindByEmailAsync(string normalizedEmail) =>
        _context.UserAccounts.SingleOrDefaultAsync(user => user.Email == normalizedEmail);

    public Task<UserAccount?> FindActiveByIdAsync(int userId) =>
        _context.UserAccounts.AsNoTracking().SingleOrDefaultAsync(user =>
            user.UserId == userId && user.AccountStatus == AccountStatuses.Active);

    public Task<UserAccount?> FindByIdForUpdateAsync(int userId) =>
        _context.UserAccounts.SingleOrDefaultAsync(user =>
            user.UserId == userId);

    public Task<PasswordResetToken?> FindPasswordResetTokenAsync(
        string tokenHash) =>
        _context.PasswordResetTokens.SingleOrDefaultAsync(token =>
            token.TokenHash == tokenHash);

    public async Task InvalidatePasswordResetTokensAsync(int userId)
    {
        var activeTokens = await _context.PasswordResetTokens
            .Where(token =>
                token.UserId == userId &&
                token.UsedAt == null)
            .ToListAsync();

        foreach (var token in activeTokens)
        {
            token.UsedAt = DateTime.UtcNow;
        }
    }

    public Task AddPasswordResetTokenAsync(PasswordResetToken token) =>
        _context.PasswordResetTokens.AddAsync(token).AsTask();

    public Task AddAsync(UserAccount user) => _context.UserAccounts.AddAsync(user).AsTask();

    public Task SaveChangesAsync() => _context.SaveChangesAsync();
}
