using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using Shopera.Common.DTOs;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Identity.Authentication.Contracts;
using Shopera.Features.Identity.Authentication.Controllers;
using Shopera.Features.Identity.Authentication.DTOs.Requests;
using Shopera.Features.Identity.Authentication.Models;
using Shopera.Features.Identity.Authentication.Services;

namespace Shopera.Tests;

public sealed class AuthServiceTests
{
    [Fact]
    public async Task Login_UnknownEmail_ReturnsTypedFailureWithoutThrowing()
    {
        var service = Service(new FakeAuthRepository());

        var result = await service.LoginAsync(Login());

        Assert.False(result.Succeeded);
        Assert.Equal(AuthErrorCodes.InvalidCredentials, result.ErrorCode);
        Assert.Equal("Incorrect email or password.", result.ErrorMessage);
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsSameSafeFailureAsUnknownEmail()
    {
        var repository = new FakeAuthRepository
        {
            User = ActiveUser("CorrectPassword1")
        };
        var service = Service(repository);

        var result = await service.LoginAsync(Login("WrongPassword1"));

        Assert.False(result.Succeeded);
        Assert.Equal(AuthErrorCodes.InvalidCredentials, result.ErrorCode);
        Assert.Equal("Incorrect email or password.", result.ErrorMessage);
    }

    [Fact]
    public async Task Login_MalformedLegacyHash_ReturnsFailureInsteadOfCrashing()
    {
        var user = ActiveUser("CorrectPassword1");
        user.PasswordHash = "plain-text-legacy-password";
        var service = Service(new FakeAuthRepository { User = user });

        var result = await service.LoginAsync(Login("CorrectPassword1"));

        Assert.False(result.Succeeded);
        Assert.Equal(AuthErrorCodes.InvalidCredentials, result.ErrorCode);
    }

    [Fact]
    public async Task Login_CorrectCredentials_ReturnsJwtSession()
    {
        var service = Service(
            new FakeAuthRepository
            {
                User = ActiveUser("CorrectPassword1")
            });

        var result = await service.LoginAsync(Login("CorrectPassword1"));

        Assert.True(result.Succeeded);
        Assert.Equal("test.jwt.token", result.Value!.Token);
        Assert.Equal("seller@shopera.test", result.Value.Email);
        Assert.Equal(AccountRoles.Seller, result.Value.Role);
    }

    [Fact]
    public async Task Controller_InvalidCredentials_ReturnsControlled401()
    {
        var controller = new AuthController(
            Service(new FakeAuthRepository()));

        var action = await controller.Login(Login());

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(
            action.Result);
        var error = Assert.IsType<ApiErrorResponse>(unauthorized.Value);
        Assert.Equal(AuthErrorCodes.InvalidCredentials, error.Code);
        Assert.Equal("Incorrect email or password.", error.Message);
    }

    [Fact]
    public async Task Controller_DuplicateRegistration_ReturnsControlled409()
    {
        var controller = new AuthController(
            Service(new FakeAuthRepository
            {
                User = ActiveUser("CorrectPassword1")
            }));

        var action = await controller.Register(new RegisterRequest
        {
            FullName = "Seller Test",
            Email = "seller@shopera.test",
            Password = "CorrectPassword1",
            PhoneNumber = "+905551112233",
            Role = "Seller"
        });

        var conflict = Assert.IsType<ConflictObjectResult>(action.Result);
        var error = Assert.IsType<ApiErrorResponse>(conflict.Value);
        Assert.Equal(AuthErrorCodes.EmailAlreadyExists, error.Code);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_ReturnsTypedFailure()
    {
        var repository = new FakeAuthRepository
        {
            User = ActiveUser("CorrectPassword1")
        };
        var service = Service(repository);

        var result = await service.ChangePasswordAsync(
            repository.User!.UserId,
            new ChangePasswordRequest
            {
                CurrentPassword = "WrongPassword1",
                NewPassword = "NewPassword2"
            });

        Assert.False(result.Succeeded);
        Assert.Equal(
            AuthErrorCodes.CurrentPasswordInvalid,
            result.ErrorCode);
    }

    [Fact]
    public async Task ChangePassword_ValidRequest_RehashesPassword()
    {
        var repository = new FakeAuthRepository
        {
            User = ActiveUser("CorrectPassword1")
        };
        var service = Service(repository);

        var result = await service.ChangePasswordAsync(
            repository.User!.UserId,
            new ChangePasswordRequest
            {
                CurrentPassword = "CorrectPassword1",
                NewPassword = "NewPassword2"
            });

        Assert.True(result.Succeeded);
        Assert.True(BCrypt.Net.BCrypt.Verify(
            "NewPassword2",
            repository.User.PasswordHash));
        Assert.False(BCrypt.Net.BCrypt.Verify(
            "CorrectPassword1",
            repository.User.PasswordHash));
    }

    [Fact]
    public async Task ForgotPassword_UnknownEmail_DoesNotRevealAccount()
    {
        var repository = new FakeAuthRepository();
        var service = Service(repository);

        var result = await service.ForgotPasswordAsync(
            new ForgotPasswordRequest
            {
                Email = "unknown@shopera.test"
            });

        Assert.True(result.Succeeded);
        Assert.Contains("If an active account", result.Value!.Message);
        Assert.Null(result.Value.DevelopmentResetToken);
        Assert.Empty(repository.ResetTokens);
    }

    [Fact]
    public async Task ResetPassword_ValidToken_IsSingleUseAndChangesPassword()
    {
        const string rawToken = "test-reset-token";
        var repository = new FakeAuthRepository
        {
            User = ActiveUser("CorrectPassword1")
        };
        repository.ResetTokens.Add(new PasswordResetToken
        {
            UserId = repository.User.UserId,
            TokenHash = HashToken(rawToken),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });
        var service = Service(repository);
        var request = new ResetPasswordRequest
        {
            Token = rawToken,
            NewPassword = "ResetPassword2"
        };

        var first = await service.ResetPasswordAsync(request);
        var second = await service.ResetPasswordAsync(request);

        Assert.True(first.Succeeded);
        Assert.False(second.Succeeded);
        Assert.Equal(AuthErrorCodes.ResetTokenInvalid, second.ErrorCode);
        Assert.True(BCrypt.Net.BCrypt.Verify(
            "ResetPassword2",
            repository.User.PasswordHash));
        Assert.NotNull(repository.ResetTokens[0].UsedAt);
    }

    [Fact]
    public async Task ResetPassword_ExpiredToken_ReturnsTypedFailure()
    {
        const string rawToken = "expired-reset-token";
        var repository = new FakeAuthRepository
        {
            User = ActiveUser("CorrectPassword1")
        };
        repository.ResetTokens.Add(new PasswordResetToken
        {
            UserId = repository.User.UserId,
            TokenHash = HashToken(rawToken),
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            ExpiresAt = DateTime.UtcNow.AddMinutes(-1)
        });

        var result = await Service(repository).ResetPasswordAsync(
            new ResetPasswordRequest
            {
                Token = rawToken,
                NewPassword = "ResetPassword2"
            });

        Assert.False(result.Succeeded);
        Assert.Equal(AuthErrorCodes.ResetTokenInvalid, result.ErrorCode);
    }

    private static AuthService Service(FakeAuthRepository repository) =>
        new(repository, new FakeTokenService());

    private static LoginRequest Login(
        string password = "AnyPassword1") =>
        new()
        {
            Email = "seller@shopera.test",
            Password = password
        };

    private static UserAccount ActiveUser(string password) =>
        new()
        {
            UserId = 20,
            FullName = "Seller Test",
            Email = "seller@shopera.test",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = AccountRoles.Seller,
            AccountStatus = AccountStatuses.Active,
            RegistrationDate = DateTime.UtcNow
        };

    private static string HashToken(string token) =>
        Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private sealed class FakeTokenService : ITokenService
    {
        public (string Token, DateTime ExpiresAt) Create(
            UserAccount user) =>
            ("test.jwt.token", DateTime.UtcNow.AddHours(1));
    }

    private sealed class FakeAuthRepository : IAuthRepository
    {
        public UserAccount? User { get; set; }

        public List<PasswordResetToken> ResetTokens { get; } = new();

        public Task<UserAccount?> FindByEmailAsync(
            string normalizedEmail) =>
            Task.FromResult(
                string.Equals(
                    User?.Email,
                    normalizedEmail,
                    StringComparison.OrdinalIgnoreCase)
                    ? User
                    : null);

        public Task<UserAccount?> FindActiveByIdAsync(int userId) =>
            Task.FromResult(
                User?.UserId == userId &&
                User.AccountStatus == AccountStatuses.Active
                    ? User
                    : null);

        public Task<UserAccount?> FindByIdForUpdateAsync(int userId) =>
            Task.FromResult(User?.UserId == userId ? User : null);

        public Task<PasswordResetToken?> FindPasswordResetTokenAsync(
            string tokenHash) =>
            Task.FromResult(
                ResetTokens.SingleOrDefault(token =>
                    token.TokenHash == tokenHash));

        public Task InvalidatePasswordResetTokensAsync(int userId)
        {
            foreach (var token in ResetTokens.Where(token =>
                token.UserId == userId && token.UsedAt is null))
            {
                token.UsedAt = DateTime.UtcNow;
            }

            return Task.CompletedTask;
        }

        public Task AddPasswordResetTokenAsync(
            PasswordResetToken token)
        {
            ResetTokens.Add(token);
            return Task.CompletedTask;
        }

        public Task AddAsync(UserAccount user)
        {
            User = user;
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync() => Task.CompletedTask;
    }
}
