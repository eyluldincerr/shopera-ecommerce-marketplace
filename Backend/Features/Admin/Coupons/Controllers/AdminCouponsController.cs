using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Extensions;
using Shopera.Common.Models;
using Shopera.Domain.Constants;
using Shopera.Features.Admin.Coupons.Contracts;
using Shopera.Features.Admin.Coupons.DTOs;
using Shopera.Features.Admin.Coupons.Models;

namespace Shopera.Features.Admin.Coupons.Controllers;

[ApiController]
[Authorize(Roles = AccountRoles.Admin)]
[Route("api/admin/coupons")]
public sealed class AdminCouponsController : ControllerBase
{
    private readonly IAdminCouponService _service;

    public AdminCouponsController(IAdminCouponService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminCouponResponse>>> GetAll()
    {
        var result = await _service.GetAllAsync(User.GetRequiredUserId());
        return result.Succeeded ? Ok(result.Value) : Failure(result);
    }

    [HttpPost]
    public async Task<ActionResult<AdminCouponResponse>> Create(
        [FromBody] CreateAdminCouponRequest request)
    {
        var result = await _service.CreateAsync(User.GetRequiredUserId(), request);
        return result.Succeeded
            ? Created($"/api/admin/coupons/{result.Value!.CouponId}", result.Value)
            : Failure(result);
    }

    [HttpPatch("{couponId:int}")]
    public async Task<ActionResult<AdminCouponResponse>> Update(
        int couponId,
        [FromBody] UpdateAdminCouponRequest request)
    {
        var result = await _service.UpdateAsync(
            User.GetRequiredUserId(),
            couponId,
            request);
        return result.Succeeded ? Ok(result.Value) : Failure(result);
    }

    [HttpDelete("{couponId:int}")]
    public async Task<ActionResult> Disable(int couponId)
    {
        var result = await _service.DisableAsync(User.GetRequiredUserId(), couponId);
        return result.Succeeded ? NoContent() : Failure(result);
    }

    private ActionResult Failure<T>(ServiceResult<T> result)
    {
        var error = new
        {
            Code = result.ErrorCode,
            Message = result.ErrorMessage
        };

        return result.ErrorCode switch
        {
            AdminCouponErrorCodes.AdminForbidden =>
                StatusCode(StatusCodes.Status403Forbidden, error),
            AdminCouponErrorCodes.CouponNotFound => NotFound(error),
            AdminCouponErrorCodes.DuplicateCoupon => Conflict(error),
            _ => BadRequest(error)
        };
    }
}
