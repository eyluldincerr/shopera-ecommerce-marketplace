using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Profile.DTOs;
using Shopera.Features.Profile.Models;
using Shopera.Features.Profile.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests;

public sealed class ProfileServiceTests
{
    [Fact]
    public async Task Get_ReturnsAuthenticatedAccountProfile()
    {
        await using var database = new TestDatabase();
        var user = ActiveUser();
        database.Context.UserAccounts.Add(user);
        await database.Context.SaveChangesAsync();

        var result = await new ProfileService(database.Context)
            .GetAsync(user.UserId);

        Assert.True(result.Succeeded);
        Assert.Equal(user.UserId, result.Value!.UserId);
        Assert.Equal("seller@shopera.test", result.Value.Email);
        Assert.Equal(AccountRoles.Seller, result.Value.Role);
    }

    [Fact]
    public async Task Update_ChangesOnlyEditableIdentityFields()
    {
        await using var database = new TestDatabase();
        var user = ActiveUser();
        database.Context.UserAccounts.Add(user);
        await database.Context.SaveChangesAsync();

        var result = await new ProfileService(database.Context)
            .UpdateAsync(
                user.UserId,
                new UpdateUserProfileRequest
                {
                    FullName = "Updated Seller",
                    PhoneNumber = "+905559998877"
                });

        Assert.True(result.Succeeded);
        Assert.Equal("Updated Seller", user.FullName);
        Assert.Equal("+905559998877", user.PhoneNumber);
        Assert.Equal("seller@shopera.test", user.Email);
        Assert.Equal(AccountRoles.Seller, user.Role);
        Assert.Equal(AccountStatuses.Active, user.AccountStatus);
    }

    [Fact]
    public async Task Update_InactiveAccount_ReturnsTypedFailure()
    {
        await using var database = new TestDatabase();
        var user = ActiveUser();
        user.AccountStatus = AccountStatuses.Suspended;
        database.Context.UserAccounts.Add(user);
        await database.Context.SaveChangesAsync();

        var result = await new ProfileService(database.Context)
            .UpdateAsync(
                user.UserId,
                new UpdateUserProfileRequest
                {
                    FullName = "Updated Seller"
                });

        Assert.False(result.Succeeded);
        Assert.Equal(ProfileErrorCodes.AccountInactive, result.ErrorCode);
    }

    private static UserAccount ActiveUser() => new()
    {
        UserId = 42,
        FullName = "Original Seller",
        Email = "seller@shopera.test",
        PhoneNumber = "+905551112233",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1"),
        RegistrationDate = DateTime.UtcNow,
        Role = AccountRoles.Seller,
        AccountStatus = AccountStatuses.Active
    };
}
