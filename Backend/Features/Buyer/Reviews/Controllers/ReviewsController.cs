using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.DTOs;
using Shopera.Common.Extensions;
using Shopera.Common.Models;
using Shopera.Domain.Constants;
using Shopera.Features.Buyer.Reviews.Contracts;
using Shopera.Features.Buyer.Reviews.DTOs;
using Shopera.Features.Buyer.Reviews.Models;

namespace Shopera.Features.Buyer.Reviews.Controllers
{
    [ApiController]
    [Route("api/products/{productId:int}/reviews")]
    public sealed class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        public async Task<ActionResult<ProductReviewsResponse>>
            GetForProduct(
                int productId,
                [FromQuery] int page = 1,
                [FromQuery] int pageSize = 20)
        {
            if (productId < 1)
            {
                return InvalidProductId();
            }

            var result =
                await _reviewService.GetForProductAsync(
                    productId,
                    page,
                    pageSize);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("mine")]
        [Authorize(Roles = AccountRoles.Buyer)]
        public async Task<ActionResult<MyReviewStateResponse>>
            GetMine(int productId)
        {
            if (productId < 1)
            {
                return InvalidProductId();
            }

            var result = await _reviewService.GetMineStateAsync(
                User.GetRequiredUserId(),
                productId);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPost]
        [Authorize(Roles = AccountRoles.Buyer)]
        public async Task<ActionResult<ReviewResponse>> Create(
            int productId,
            [FromBody] CreateReviewRequest request)
        {
            if (productId < 1)
            {
                return InvalidProductId();
            }

            var result = await _reviewService.CreateAsync(
                User.GetRequiredUserId(),
                productId,
                request);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            return Created(
                $"/api/products/{productId}/reviews",
                result.Value);
        }

        [HttpPatch("mine")]
        [Authorize(Roles = AccountRoles.Buyer)]
        public async Task<ActionResult<ReviewResponse>>
            UpdateMine(
                int productId,
                [FromBody] UpdateReviewRequest request)
        {
            if (productId < 1)
            {
                return InvalidProductId();
            }

            var result =
                await _reviewService.UpdateMineAsync(
                    User.GetRequiredUserId(),
                    productId,
                    request);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpDelete("mine")]
        [Authorize(Roles = AccountRoles.Buyer)]
        public async Task<IActionResult> DeleteMine(
            int productId)
        {
            if (productId < 1)
            {
                return InvalidProductId();
            }

            var result =
                await _reviewService.DeleteMineAsync(
                    User.GetRequiredUserId(),
                    productId);

            return result.Succeeded
                ? NoContent()
                : Failure(result);
        }

        private BadRequestObjectResult InvalidProductId()
        {
            return BadRequest(
                new ApiErrorResponse(
                    "INVALID_PRODUCT_ID",
                    "Product ID must be greater than zero."));
        }

        private ActionResult Failure<T>(
            ServiceResult<T> result)
        {
            var error = new ApiErrorResponse(
                result.ErrorCode!,
                result.ErrorMessage!);

            return result.ErrorCode switch
            {
                ReviewErrorCodes.BuyerForbidden =>
                    StatusCode(
                        StatusCodes.Status403Forbidden,
                        error),
                ReviewErrorCodes.DeliveredOrderRequired =>
                    StatusCode(
                        StatusCodes.Status403Forbidden,
                        error),
                ReviewErrorCodes.ProductNotFound or
                ReviewErrorCodes.ReviewNotFound =>
                    NotFound(error),
                ReviewErrorCodes.ReviewAlreadyExists or
                ReviewErrorCodes.ProductNotReviewable =>
                    Conflict(error),
                _ => BadRequest(error)
            };
        }
    }
}
