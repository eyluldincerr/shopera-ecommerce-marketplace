using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Identity.Authentication.Contracts;
using Shopera.Features.Identity.Authentication.DTOs.Requests;
using Shopera.Features.Identity.Authentication.DTOs.Responses;
using Shopera.Features.Identity.Authentication.Models;

namespace Shopera.Features.Identity.Authentication.Services;

public sealed class AuthService : IAuthService
{
    private readonly IAuthRepository _repository;
    private readonly ITokenService _tokens;
    private readonly bool _exposeDevelopmentResetToken;

    public AuthService(
        IAuthRepository repository,
        ITokenService tokens,
        IHostEnvironment? environment = null)
    {
        _repository = repository;
        _tokens = tokens;
        _exposeDevelopmentResetToken =
            environment?.IsDevelopment() == true;
    }

    public async Task<ServiceResult<AuthSessionResponse>> RegisterAsync(
        RegisterRequest request)
    {
        string? role = NormalizePublicRole(request.Role);
        string email = request.Email.Trim().ToLowerInvariant();
        string fullName = request.FullName.Trim();
        string phone = request.PhoneNumber.Trim();

        if (role is null)
        {
            return ServiceResult<AuthSessionResponse>.Failure(
                AuthErrorCodes.InvalidRole,
                "Role must be Buyer or Seller.");
        }

        if (!IsValidPassword(request.Password))
        {
            return ServiceResult<AuthSessionResponse>.Failure(
                AuthErrorCodes.WeakPassword,
                "Password must contain at least eight characters, " +
                "including uppercase, lowercase, and a number.");
        }

        if (await _repository.FindByEmailAsync(email) is not null)
        {
            return ServiceResult<AuthSessionResponse>.Failure(
                AuthErrorCodes.EmailAlreadyExists,
                "An account with this email already exists.");
        }

        var user = new UserAccount
        {
            FullName = fullName,
            Email = email,
            PhoneNumber = phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RegistrationDate = DateTime.UtcNow,
            Role = role,
            AccountStatus = AccountStatuses.Active
        };

        await _repository.AddAsync(user);

        try
        {
            await _repository.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
            when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
        {
            return ServiceResult<AuthSessionResponse>.Failure(
                AuthErrorCodes.EmailAlreadyExists,
                "An account with this email already exists.");
        }

        return ServiceResult<AuthSessionResponse>.Success(
            CreateSession(user));
    }

    public async Task<ServiceResult<AuthSessionResponse>> LoginAsync(
        LoginRequest request)
    {
        string email = request.Email.Trim().ToLowerInvariant();
        UserAccount? user = await _repository.FindByEmailAsync(email);

        if (user is null ||
            !PasswordMatches(request.Password, user.PasswordHash))
        {
            return ServiceResult<AuthSessionResponse>.Failure(
                AuthErrorCodes.InvalidCredentials,
                "Incorrect email or password.");
        }

        if (!string.Equals(
                user.AccountStatus,
                AccountStatuses.Active,
                StringComparison.OrdinalIgnoreCase))
        {
            string accountStatusMessage = user.AccountStatus switch
            {
                AccountStatuses.Inactive =>
                    "Your account is inactive. Please contact an administrator to reactivate it.",
                AccountStatuses.Suspended =>
                    "Your account is suspended. Please contact an administrator for assistance.",
                _ => "Your account is not active."
            };

            return ServiceResult<AuthSessionResponse>.Failure(
                AuthErrorCodes.AccountInactive,
                accountStatusMessage);
        }

        if (!AccountRoles.All.Contains(user.Role))
        {
            return ServiceResult<AuthSessionResponse>.Failure(
                AuthErrorCodes.UnsupportedRole,
                "This account has an unsupported role.");
        }

        return ServiceResult<AuthSessionResponse>.Success(
            CreateSession(user));
    }

    public async Task<ServiceResult<CurrentUserResponse>>
        GetCurrentUserAsync(int userId)
    {
        UserAccount? user =
            await _repository.FindActiveByIdAsync(userId);

        if (user is null)
        {
            return ServiceResult<CurrentUserResponse>.Failure(
                AuthErrorCodes.AccountInactive,
                "The authenticated account is not active.");
        }

        return ServiceResult<CurrentUserResponse>.Success(
            new CurrentUserResponse
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                Role = user.Role
            });
    }

    public async Task<ServiceResult<bool>> ChangePasswordAsync(
        int userId,
        ChangePasswordRequest request)
    {
        UserAccount? user =
            await _repository.FindByIdForUpdateAsync(userId);

        if (user is null ||
            !string.Equals(
                user.AccountStatus,
                AccountStatuses.Active,
                StringComparison.OrdinalIgnoreCase))
        {
            return ServiceResult<bool>.Failure(
                AuthErrorCodes.AccountInactive,
                "The authenticated account is not active.");
        }

        if (!PasswordMatches(
                request.CurrentPassword,
                user.PasswordHash))
        {
            return ServiceResult<bool>.Failure(
                AuthErrorCodes.CurrentPasswordInvalid,
                "Current password is incorrect.");
        }

        if (!IsValidPassword(request.NewPassword))
        {
            return WeakPassword<bool>();
        }

        if (PasswordMatches(request.NewPassword, user.PasswordHash))
        {
            return ServiceResult<bool>.Failure(
                AuthErrorCodes.PasswordReuse,
                "New password must be different from the current password.");
        }

        user.PasswordHash =
            BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _repository.InvalidatePasswordResetTokensAsync(userId);
        await _repository.SaveChangesAsync();

        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<ForgotPasswordResponse>>
        ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        const string safeMessage =
            "If an active account uses this email, password reset " +
            "instructions have been created.";

        string email = request.Email.Trim().ToLowerInvariant();
        UserAccount? user = await _repository.FindByEmailAsync(email);

        if (user is null ||
            !string.Equals(
                user.AccountStatus,
                AccountStatuses.Active,
                StringComparison.OrdinalIgnoreCase))
        {
            return ServiceResult<ForgotPasswordResponse>.Success(
                new ForgotPasswordResponse { Message = safeMessage });
        }

        string rawToken = CreateResetToken();
        string tokenHash = HashResetToken(rawToken);

        await _repository.InvalidatePasswordResetTokensAsync(
            user.UserId);
        await _repository.AddPasswordResetTokenAsync(
            new PasswordResetToken
            {
                UserId = user.UserId,
                TokenHash = tokenHash,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(20)
            });
        await _repository.SaveChangesAsync();

        return ServiceResult<ForgotPasswordResponse>.Success(
            new ForgotPasswordResponse
            {
                Message = safeMessage,
                DevelopmentResetToken =
                    _exposeDevelopmentResetToken
                        ? rawToken
                        : null
            });
    }

    public async Task<ServiceResult<bool>> ResetPasswordAsync(
        ResetPasswordRequest request)
    {
        if (!IsValidPassword(request.NewPassword))
        {
            return WeakPassword<bool>();
        }

        string tokenHash = HashResetToken(request.Token.Trim());
        PasswordResetToken? resetToken =
            await _repository.FindPasswordResetTokenAsync(tokenHash);

        if (resetToken is null ||
            resetToken.UsedAt.HasValue ||
            resetToken.ExpiresAt <= DateTime.UtcNow)
        {
            return InvalidResetToken();
        }

        UserAccount? user =
            await _repository.FindByIdForUpdateAsync(
                resetToken.UserId);

        if (user is null ||
            !string.Equals(
                user.AccountStatus,
                AccountStatuses.Active,
                StringComparison.OrdinalIgnoreCase))
        {
            return InvalidResetToken();
        }

        if (PasswordMatches(request.NewPassword, user.PasswordHash))
        {
            return ServiceResult<bool>.Failure(
                AuthErrorCodes.PasswordReuse,
                "New password must be different from the current password.");
        }

        user.PasswordHash =
            BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        resetToken.UsedAt = DateTime.UtcNow;
        await _repository.InvalidatePasswordResetTokensAsync(user.UserId);

        try
        {
            await _repository.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            return InvalidResetToken();
        }

        return ServiceResult<bool>.Success(true);
    }

    private AuthSessionResponse CreateSession(UserAccount user)
    {
        (string token, DateTime expiresAt) = _tokens.Create(user);
        return new AuthSessionResponse
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            Token = token,
            ExpiresAt = expiresAt
        };
    }

    private static string? NormalizePublicRole(string role)
    {
        string normalized = role.Trim().ToUpperInvariant();
        return normalized switch
        {
            AccountRoles.Buyer => AccountRoles.Buyer,
            AccountRoles.Seller => AccountRoles.Seller,
            _ => null
        };
    }

    private static bool IsValidPassword(string password)
    {
        return password.Length >= 8 &&
            password.Any(char.IsUpper) &&
            password.Any(char.IsLower) &&
            password.Any(char.IsDigit);
    }

    private static bool PasswordMatches(
        string password,
        string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash) ||
            !passwordHash.StartsWith("$2", StringComparison.Ordinal))
        {
            return false;
        }

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch
        {
            // Malformed legacy hashes are invalid credentials, not crashes.
            return false;
        }
    }

    private static string CreateResetToken()
    {
        return Convert.ToBase64String(
                RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashResetToken(string token)
    {
        return Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }

    private static ServiceResult<T> WeakPassword<T>()
    {
        return ServiceResult<T>.Failure(
            AuthErrorCodes.WeakPassword,
            "Password must contain at least eight characters, " +
            "including uppercase, lowercase, and a number.");
    }

    private static ServiceResult<bool> InvalidResetToken()
    {
        return ServiceResult<bool>.Failure(
            AuthErrorCodes.ResetTokenInvalid,
            "Password reset token is invalid, expired, or already used.");
    }
}
