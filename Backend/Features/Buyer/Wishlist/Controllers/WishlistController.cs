using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.DTOs;
using Shopera.Common.Extensions;
using Shopera.Common.Models;
using Shopera.Domain.Constants;
using Shopera.Features.Buyer.Wishlist.Contracts;
using Shopera.Features.Buyer.Wishlist.DTOs;
using Shopera.Features.Buyer.Wishlist.Models;

namespace Shopera.Features.Buyer.Wishlist.Controllers;

[ApiController]
[Authorize(Roles = AccountRoles.Buyer)]
[Route("api/wishlist")]
public sealed class WishlistController : ControllerBase
{
    private readonly IWishlistService _service;

    public WishlistController(IWishlistService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<WishlistResponse>> Get()
    {
        var result = await _service.GetAsync(User.GetRequiredUserId());
        return result.Succeeded ? Ok(result.Value) : Failure(result);
    }

    [HttpPost("items")]
    public async Task<ActionResult<WishlistResponse>> Add(
        [FromBody] AddWishlistItemRequest request)
    {
        var result = await _service.AddAsync(
            User.GetRequiredUserId(),
            request);

        return result.Succeeded ? Ok(result.Value) : Failure(result);
    }

    [HttpDelete("items/{variantId:int}")]
    public async Task<ActionResult<WishlistResponse>> Remove(int variantId)
    {
        var result = await _service.RemoveAsync(
            User.GetRequiredUserId(),
            variantId);

        return result.Succeeded ? Ok(result.Value) : Failure(result);
    }

    [HttpDelete("items")]
    public async Task<ActionResult<WishlistResponse>> Clear()
    {
        var result = await _service.ClearAsync(User.GetRequiredUserId());
        return result.Succeeded ? Ok(result.Value) : Failure(result);
    }

    private ActionResult Failure(ServiceResult<WishlistResponse> result)
    {
        var error = new ApiErrorResponse(
            result.ErrorCode!,
            result.ErrorMessage!);

        return result.ErrorCode switch
        {
            WishlistErrorCodes.BuyerForbidden =>
                StatusCode(StatusCodes.Status403Forbidden, error),
            WishlistErrorCodes.VariantNotFound =>
                NotFound(error),
            WishlistErrorCodes.ItemUnavailable =>
                Conflict(error),
            _ => BadRequest(error)
        };
    }
}
