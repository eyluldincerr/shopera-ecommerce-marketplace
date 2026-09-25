using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.DTOs;
using Shopera.Common.Extensions;
using Shopera.Common.Models;
using Shopera.Features.Profile.Contracts;
using Shopera.Features.Profile.DTOs;
using Shopera.Features.Profile.Models;

namespace Shopera.Features.Profile.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public sealed class ProfileController : ControllerBase
{
    private readonly IProfileService _service;

    public ProfileController(IProfileService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<UserProfileResponse>> Get()
    {
        var result = await _service.GetAsync(User.GetRequiredUserId());

        return result.Succeeded
            ? Ok(result.Value)
            : Failure(result);
    }

    [HttpPatch]
    public async Task<ActionResult<UserProfileResponse>> Update(
        UpdateUserProfileRequest request)
    {
        var result = await _service.UpdateAsync(
            User.GetRequiredUserId(),
            request);

        return result.Succeeded
            ? Ok(result.Value)
            : Failure(result);
    }

    private ActionResult Failure<T>(ServiceResult<T> result)
    {
        var error = new ApiErrorResponse(
            result.ErrorCode!,
            result.ErrorMessage!);

        return result.ErrorCode == ProfileErrorCodes.AccountInactive
            ? Unauthorized(error)
            : BadRequest(error);
    }
}
