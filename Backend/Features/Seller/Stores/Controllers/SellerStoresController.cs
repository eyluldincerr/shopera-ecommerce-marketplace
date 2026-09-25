using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Extensions;
using Shopera.Common.DTOs;
using Shopera.Common.Models;
using Shopera.Domain.Constants;
using Shopera.Features.Seller.Stores.Contracts;
using Shopera.Features.Seller.Stores.DTOs;
using Shopera.Features.Seller.Stores.Models;

namespace Shopera.Features.Seller.Stores.Controllers
{
    [ApiController]
    [Authorize(Roles = AccountRoles.Seller)]
    [Route("api/seller/store")]
    public sealed class SellerStoresController
        : ControllerBase
    {
        private readonly ISellerStoreService _storeService;

        public SellerStoresController(
            ISellerStoreService storeService)
        {
            _storeService = storeService;
        }

        [HttpGet]
        public async Task<ActionResult<SellerStoreResponse>>
            GetMine()
        {
            var result = await _storeService.GetMineAsync(
                SellerUserId);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPost]
        public async Task<ActionResult<StoreSubmissionResponse>>
            Create(
                [FromBody] CreateSellerStoreRequest request)
        {
            var result = await _storeService.CreateAsync(
                SellerUserId,
                request);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return Created(
                "/api/seller/store",
                result.Value);
        }

        [HttpPatch]
        public async Task<ActionResult<SellerStoreResponse>>
            Update(
                [FromBody] UpdateSellerStoreRequest request)
        {
            var result = await _storeService.UpdateAsync(
                SellerUserId,
                request);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPost("resubmit")]
        public async Task<ActionResult<StoreSubmissionResponse>>
            Resubmit()
        {
            var result = await _storeService.ResubmitAsync(
                SellerUserId);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPatch("status")]
        public async Task<ActionResult<SellerStoreResponse>>
            UpdateStatus(
                [FromBody]
                UpdateSellerStoreStatusRequest request)
        {
            var result = await _storeService.UpdateStatusAsync(
                SellerUserId,
                request);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        private int SellerUserId => User.GetRequiredUserId();

        private ActionResult Failure<T>(
            ServiceResult<T> result)
        {
            var error = new ApiErrorResponse(
                result.ErrorCode!,
                result.ErrorMessage!);

            return result.ErrorCode switch
            {
                SellerStoreErrorCodes.SellerForbidden =>
                    StatusCode(
                        StatusCodes.Status403Forbidden,
                        error),
                SellerStoreErrorCodes.StoreNotFound =>
                    NotFound(error),
                SellerStoreErrorCodes.StoreAlreadyExists or
                SellerStoreErrorCodes.DuplicateStoreName or
                SellerStoreErrorCodes.DuplicateStoreSlug or
                SellerStoreErrorCodes.InvalidStoreTransition =>
                    Conflict(error),
                _ => BadRequest(error)
            };
        }
    }
}
