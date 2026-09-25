using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Shopera.Common.DTOs;
using Shopera.Common.Extensions;
using Shopera.Common.Models;
using Shopera.Common.Security;
using Shopera.Features.Identity.Authentication.Contracts;
using Shopera.Features.Identity.Authentication.DTOs.Requests;
using Shopera.Features.Identity.Authentication.DTOs.Responses;
using Shopera.Features.Identity.Authentication.Models;

namespace Shopera.Features.Identity.Authentication.Controllers;

[ApiController]
[Route("api/auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _service;

    public AuthController(IAuthService service)
    {
        _service = service;
    }

    [AllowAnonymous]
    [EnableRateLimiting(SecurityRateLimitPolicies.Registration)]
    [HttpPost("register")]
    public async Task<ActionResult<AuthSessionResponse>> Register(
        RegisterRequest request)
    {
        var result = await _service.RegisterAsync(request);

        if (!result.Succeeded)
        {
            return Failure(result);
        }

        return Ok(result.Value);
    }

    [AllowAnonymous]
    [EnableRateLimiting(SecurityRateLimitPolicies.Login)]
    [HttpPost("login")]
    public async Task<ActionResult<AuthSessionResponse>> Login(
        LoginRequest request)
    {
        var result = await _service.LoginAsync(request);

        if (!result.Succeeded)
        {
            return Failure(result);
        }

        return Ok(result.Value);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var result = await _service.GetCurrentUserAsync(
            User.GetRequiredUserId());

        if (!result.Succeeded)
        {
            return Failure(result);
        }

        return Ok(result.Value);
    }

    [Authorize]
    [EnableRateLimiting(SecurityRateLimitPolicies.Login)]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordRequest request)
    {
        var result = await _service.ChangePasswordAsync(
            User.GetRequiredUserId(),
            request);

        return result.Succeeded
            ? NoContent()
            : FailureResult(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting(SecurityRateLimitPolicies.PasswordRecovery)]
    [HttpPost("forgot-password")]
    public async Task<ActionResult<ForgotPasswordResponse>>
        ForgotPassword(ForgotPasswordRequest request)
    {
        var result = await _service.ForgotPasswordAsync(request);

        return Accepted(result.Value);
    }

    [AllowAnonymous]
    [EnableRateLimiting(SecurityRateLimitPolicies.PasswordRecovery)]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(
        ResetPasswordRequest request)
    {
        var result = await _service.ResetPasswordAsync(request);

        return result.Succeeded
            ? NoContent()
            : FailureResult(result);
    }

    private ActionResult<T> Failure<T>(ServiceResult<T> result)
    {
        return FailureResult(result);
    }

    private ActionResult FailureResult<T>(ServiceResult<T> result)
    {
        var error = new ApiErrorResponse(
            result.ErrorCode!,
            result.ErrorMessage!);

        return result.ErrorCode switch
        {
            AuthErrorCodes.InvalidCredentials or
            AuthErrorCodes.AccountInactive or
            AuthErrorCodes.UnsupportedRole =>
                Unauthorized(error),

            AuthErrorCodes.EmailAlreadyExists =>
                Conflict(error),

            _ => BadRequest(error)
        };
    }
}
