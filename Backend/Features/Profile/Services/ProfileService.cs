using Microsoft.EntityFrameworkCore;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Profile.Contracts;
using Shopera.Features.Profile.DTOs;
using Shopera.Features.Profile.Models;

namespace Shopera.Features.Profile.Services;

public sealed class ProfileService : IProfileService
{
    private readonly ApplicationDbContext _context;

    public ProfileService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ServiceResult<UserProfileResponse>> GetAsync(
        int userId)
    {
        UserAccount? user = await _context.UserAccounts
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId);

        if (!IsActive(user))
        {
            return Inactive();
        }

        return ServiceResult<UserProfileResponse>.Success(Map(user!));
    }

    public async Task<ServiceResult<UserProfileResponse>> UpdateAsync(
        int userId,
        UpdateUserProfileRequest request)
    {
        UserAccount? user = await _context.UserAccounts
            .SingleOrDefaultAsync(item => item.UserId == userId);

        if (!IsActive(user))
        {
            return Inactive();
        }

        string fullName = request.FullName.Trim();
        string? phoneNumber = string.IsNullOrWhiteSpace(
                request.PhoneNumber)
            ? null
            : request.PhoneNumber.Trim();

        if (fullName.Length is < 3 or > 150 ||
            phoneNumber?.Length > 30)
        {
            return ServiceResult<UserProfileResponse>.Failure(
                ProfileErrorCodes.InvalidProfile,
                "Profile name or phone number is invalid.");
        }

        user!.FullName = fullName;
        user.PhoneNumber = phoneNumber;
        await _context.SaveChangesAsync();

        return ServiceResult<UserProfileResponse>.Success(Map(user));
    }

    private static bool IsActive(UserAccount? user) =>
        user is not null &&
        string.Equals(
            user.AccountStatus,
            AccountStatuses.Active,
            StringComparison.OrdinalIgnoreCase);

    private static UserProfileResponse Map(UserAccount user) =>
        new()
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            AccountStatus = user.AccountStatus
        };

    private static ServiceResult<UserProfileResponse> Inactive() =>
        ServiceResult<UserProfileResponse>.Failure(
            ProfileErrorCodes.AccountInactive,
            "The authenticated account is not active.");
}
