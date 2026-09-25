using Shopera.Common.Models;
using Shopera.Features.Identity.Authentication.DTOs.Requests;
using Shopera.Features.Identity.Authentication.DTOs.Responses;

namespace Shopera.Features.Identity.Authentication.Contracts;

public interface IAuthService
{
    Task<ServiceResult<AuthSessionResponse>> RegisterAsync(RegisterRequest request);

    Task<ServiceResult<AuthSessionResponse>> LoginAsync(LoginRequest request);

    Task<ServiceResult<CurrentUserResponse>> GetCurrentUserAsync(int userId);

    Task<ServiceResult<bool>> ChangePasswordAsync(
        int userId,
        ChangePasswordRequest request);

    Task<ServiceResult<ForgotPasswordResponse>> ForgotPasswordAsync(
        ForgotPasswordRequest request);

    Task<ServiceResult<bool>> ResetPasswordAsync(
        ResetPasswordRequest request);
}
