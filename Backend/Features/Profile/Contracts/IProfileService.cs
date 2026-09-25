using Shopera.Common.Models;
using Shopera.Features.Profile.DTOs;

namespace Shopera.Features.Profile.Contracts;

public interface IProfileService
{
    Task<ServiceResult<UserProfileResponse>> GetAsync(int userId);

    Task<ServiceResult<UserProfileResponse>> UpdateAsync(
        int userId,
        UpdateUserProfileRequest request);
}
