using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.DTOs;
using Shopera.Common.Extensions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Features.StoreMedia.DTOs;
using Shopera.Features.StoreMedia.Models;
using Shopera.Features.StoreMedia.Services;

namespace Shopera.Features.StoreMedia.Controllers
{
    [ApiController]
    [Authorize(Roles = AccountRoles.Seller)]
    [Route("api/seller/store/media")]
    public sealed class SellerStoreMediaController : ControllerBase
    {
        private readonly StoreMediaService _service;

        public SellerStoreMediaController(ApplicationDbContext dbContext)
        {
            _service = new StoreMediaService(dbContext);
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<StoreMediaResponse>>> GetMine()
        {
            var result = await _service.GetSellerMediaAsync(SellerUserId);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPost]
        public async Task<ActionResult<StoreMediaResponse>> Create(
            [FromBody] CreateStoreMediaRequest request)
        {
            var result = await _service.CreateAsync(SellerUserId, request);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return Created(
                $"/api/seller/store/media/{result.Value!.StoreMediaId}",
                result.Value);
        }

        [HttpDelete("{storeMediaId:int}")]
        public async Task<IActionResult> Remove(int storeMediaId)
        {
            if (storeMediaId < 1)
            {
                return BadRequest(new ApiErrorResponse(
                    StoreMediaErrorCodes.MediaNotFound,
                    "Store media ID must be greater than zero."));
            }

            var result = await _service.RemoveAsync(SellerUserId, storeMediaId);

            return result.Succeeded
                ? NoContent()
                : Failure(result);
        }

        private int SellerUserId => User.GetRequiredUserId();

        private ActionResult Failure<T>(ServiceResult<T> result)
        {
            var error = new ApiErrorResponse(
                result.ErrorCode!,
                result.ErrorMessage!);

            return result.ErrorCode switch
            {
                StoreMediaErrorCodes.StoreNotFound or
                StoreMediaErrorCodes.MediaNotFound => NotFound(error),

                StoreMediaErrorCodes.HomeStoryLimitReached or
                StoreMediaErrorCodes.StoreNotPublic => Conflict(error),

                _ => BadRequest(error)
            };
        }
    }
}
