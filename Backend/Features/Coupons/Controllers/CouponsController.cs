using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Exceptions;
using Shopera.Common.Extensions;
using Shopera.Domain.Constants;
using Shopera.Features.Coupons.Contracts;
using Shopera.Features.Coupons.DTOs;

namespace Shopera.Features.Coupons.Controllers;

[ApiController]
[Authorize(Roles = AccountRoles.Buyer)]
[Route("api/coupons")]
public sealed class CouponsController : ControllerBase
{
    private readonly ICouponService _service;

    public CouponsController(ICouponService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BuyerCouponResponse>>> GetAvailable()
    {
        return Ok(await _service.GetAvailableAsync(User.GetRequiredUserId()));
    }

    [HttpPost("validate")]
    public async Task<ActionResult<CouponValidationResponse>> Validate(
        [FromBody] ValidateCouponRequest request)
    {
        try
        {
            return Ok(await _service.ValidateForCartAsync(
                User.GetRequiredUserId(),
                request.CouponCode));
        }
        catch (RequestConflictException exception)
        {
            // Coupon rejection is an expected Buyer/business outcome, not a
            // server failure. Handle it in user code so Visual Studio does not
            // stop the request as "User-Unhandled" while debugging.
            return Conflict(CreateConflictProblem(exception));
        }
    }

    private ProblemDetails CreateConflictProblem(RequestConflictException exception)
    {
        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Request conflict",
            Detail = exception.PublicMessage,
            Instance = HttpContext.Request.Path
        };

        problem.Extensions["code"] = exception.Code;
        foreach ((string key, object? value) in exception.Extensions)
        {
            if (value is not null)
            {
                problem.Extensions[key] = value;
            }
        }

        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
        return problem;
    }
}
