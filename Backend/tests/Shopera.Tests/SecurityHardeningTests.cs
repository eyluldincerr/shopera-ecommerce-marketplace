using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Shopera.Common.Security;
using Shopera.Configuration;
using Shopera.Domain.Constants;
using Shopera.Features.Identity.Authentication.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests;

public sealed class SecurityHardeningTests
{
    private const string SigningKey = "test-security-signing-key-32-characters-long";

    [Fact]
    public void TokenService_IssuesPasswordBoundSecurityStampClaim()
    {
        var user = TestData.ActiveSeller(20);
        var service = new TokenService(Options.Create(new JwtSettings
        {
            Key = SigningKey,
            Issuer = "Shopera.Tests",
            Audience = "Shopera.Tests",
            DurationInMinutes = 60
        }));

        (string token, _) = service.Create(user);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token);
        string? stamp = parsed.Claims
            .SingleOrDefault(claim => claim.Type == JwtSecurityStamp.ClaimType)
            ?.Value;

        Assert.Equal(
            JwtSecurityStamp.Create(user.PasswordHash, SigningKey),
            stamp);
    }

    [Fact]
    public async Task JwtAccountValidator_AcceptsActiveAccountWithMatchingRole()
    {
        await using var database = new TestDatabase();
        database.Context.UserAccounts.Add(TestData.ActiveSeller(20));
        await database.Context.SaveChangesAsync();

        bool allowed = await JwtAccountValidator.IsCurrentAccountAllowedAsync(
            database.Context,
            Principal(20, AccountRoles.Seller, "test-only-hash"),
            SigningKey);

        Assert.True(allowed);
    }

    [Fact]
    public async Task JwtAccountValidator_RejectsSuspendedAccount()
    {
        await using var database = new TestDatabase();
        var seller = TestData.ActiveSeller(20);
        seller.AccountStatus = AccountStatuses.Suspended;
        database.Context.UserAccounts.Add(seller);
        await database.Context.SaveChangesAsync();

        bool allowed = await JwtAccountValidator.IsCurrentAccountAllowedAsync(
            database.Context,
            Principal(20, AccountRoles.Seller, "test-only-hash"),
            SigningKey);

        Assert.False(allowed);
    }

    [Fact]
    public async Task JwtAccountValidator_RejectsTokenAfterRoleChange()
    {
        await using var database = new TestDatabase();
        var user = TestData.ActiveSeller(20);
        user.Role = AccountRoles.Buyer;
        database.Context.UserAccounts.Add(user);
        await database.Context.SaveChangesAsync();

        bool allowed = await JwtAccountValidator.IsCurrentAccountAllowedAsync(
            database.Context,
            Principal(20, AccountRoles.Seller, "test-only-hash"),
            SigningKey);

        Assert.False(allowed);
    }

    [Fact]
    public async Task JwtAccountValidator_RejectsTokenAfterPasswordHashChanges()
    {
        await using var database = new TestDatabase();
        var seller = TestData.ActiveSeller(20);
        database.Context.UserAccounts.Add(seller);
        await database.Context.SaveChangesAsync();

        ClaimsPrincipal tokenPrincipal = Principal(
            20,
            AccountRoles.Seller,
            seller.PasswordHash);

        seller.PasswordHash = "new-password-hash";
        await database.Context.SaveChangesAsync();

        bool allowed = await JwtAccountValidator.IsCurrentAccountAllowedAsync(
            database.Context,
            tokenPrincipal,
            SigningKey);

        Assert.False(allowed);
    }

    [Fact]
    public async Task SecurityHeaders_AddNoSniffAndNoStoreForBearerRequests()
    {
        var middleware = new SecurityHeadersMiddleware(_ => Task.CompletedTask);
        var context = new DefaultHttpContext();
        context.Request.Headers.Authorization = "Bearer test-token";

        await middleware.InvokeAsync(context);
        await context.Response.StartAsync();

        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"]);
        Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"]);
        Assert.Equal("no-store", context.Response.Headers["Cache-Control"].ToString());
        Assert.Equal("no-cache", context.Response.Headers["Pragma"].ToString());
    }

    [Fact]
    public void ImageSignatureValidator_RecognizesJpeg()
    {
        byte[] bytes = { 0xFF, 0xD8, 0xFF, 0xE0 };

        string? detected = ImageUploadSignatureValidator
            .DetectSupportedContentType(bytes);

        Assert.Equal("image/jpeg", detected);
        Assert.True(ImageUploadSignatureValidator.ExtensionMatches(
            "photo.jpg",
            "image/jpeg"));
    }

    [Fact]
    public void ImageSignatureValidator_RecognizesPng()
    {
        byte[] bytes =
        {
            0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A
        };

        string? detected = ImageUploadSignatureValidator
            .DetectSupportedContentType(bytes);

        Assert.Equal("image/png", detected);
        Assert.True(ImageUploadSignatureValidator.ExtensionMatches(
            "photo.png",
            "image/png"));
    }

    [Fact]
    public void ImageSignatureValidator_RejectsHtmlDisguisedAsPng()
    {
        byte[] html = "<html><script>alert(1)</script></html>"u8.ToArray();

        string? detected = ImageUploadSignatureValidator
            .DetectSupportedContentType(html);

        Assert.Null(detected);
    }

    private static ClaimsPrincipal Principal(
        int userId,
        string role,
        string passwordHash) =>
        new(new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
                new Claim(
                    JwtSecurityStamp.ClaimType,
                    JwtSecurityStamp.Create(passwordHash, SigningKey))
            },
            "test"));
}
