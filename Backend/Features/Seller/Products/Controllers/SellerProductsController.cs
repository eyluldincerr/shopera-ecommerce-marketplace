using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Extensions;
using Shopera.Common.DTOs;
using Shopera.Common.Models;
using Shopera.Domain.Constants;
using Shopera.Features.Seller.Products.Contracts;
using Shopera.Features.Seller.Products.DTOs;
using Shopera.Features.Seller.Products.Models;

namespace Shopera.Features.Seller.Products.Controllers
{
    [ApiController]
    [Authorize(Roles = AccountRoles.Seller)]
    [Route("api/seller/products")]
    public sealed class SellerProductsController : ControllerBase
    {
        private readonly ISellerProductService _service;

        public SellerProductsController(
            ISellerProductService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResponse<
            SellerProductListResponse>>> GetMine(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _service.GetMineAsync(
                SellerUserId,
                search,
                status,
                page,
                pageSize);
            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("{productId:int}")]
        public Task<ActionResult<SellerProductResponse>> Get(
            int productId)
        {
            return Execute(
                id => _service.GetAsync(id, productId));
        }

        [HttpGet("inventory")]
        public async Task<ActionResult<PagedResponse<
            SellerInventoryItemResponse>>> GetInventory(
            [FromQuery] string? search = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] string? stockStatus = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _service.GetInventoryAsync(
                SellerUserId,
                search,
                categoryId,
                stockStatus,
                page,
                pageSize);
            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPost]
        public async Task<ActionResult<SellerProductResponse>>
            Create(
                [FromBody] CreateSellerProductRequest request)
        {
            var result = await _service.CreateAsync(
                SellerUserId,
                request);
            return result.Succeeded
                ? Created(
                    $"/api/seller/products/" +
                    $"{result.Value!.ProductId}",
                    result.Value)
                : Failure(result);
        }

        [HttpPatch("{productId:int}")]
        public Task<ActionResult<SellerProductResponse>> Update(
            int productId,
            [FromBody] UpdateSellerProductRequest request)
        {
            return Execute(
                id => _service.UpdateAsync(
                    id,
                    productId,
                    request));
        }

        [HttpDelete("{productId:int}")]
        public async Task<ActionResult> Delete(
            int productId)
        {
            var result = await _service.DeleteAsync(
                SellerUserId,
                productId);
            return result.Succeeded
                ? NoContent()
                : Failure(result);
        }

        [HttpPut("{productId:int}/info")]
        public Task<ActionResult<SellerProductResponse>> UpsertInfo(
            int productId,
            [FromBody] UpsertProductInfoRequest request)
        {
            return Execute(
                id => _service.UpsertInfoAsync(
                    id,
                    productId,
                    request));
        }

        [HttpPost("{productId:int}/images")]
        public Task<ActionResult<SellerProductResponse>> AddImage(
            int productId,
            [FromForm] CreateProductImageRequest request)
        {
            return Execute(
                id => _service.AddImageAsync(
                    id,
                    productId,
                    request));
        }

        [HttpPatch("{productId:int}/images/{imageId:int}")]
        public Task<ActionResult<SellerProductResponse>> UpdateImage(
            int productId,
            int imageId,
            [FromForm] UpdateProductImageRequest request)
        {
            return Execute(
                id => _service.UpdateImageAsync(
                    id,
                    productId,
                    imageId,
                    request));
        }

        [HttpDelete("{productId:int}/images/{imageId:int}")]
        public Task<ActionResult<SellerProductResponse>> DeleteImage(
            int productId,
            int imageId)
        {
            return Execute(
                id => _service.DeleteImageAsync(
                    id,
                    productId,
                    imageId));
        }

        [HttpGet("{productId:int}/images/{imageId:int}/content")]
        public async Task<ActionResult> GetImageContent(
            int productId,
            int imageId)
        {
            var result = await _service.GetImageContentAsync(
                SellerUserId,
                productId,
                imageId);

            if (!result.Succeeded)
            {
                return Failure(result);
            }

            Response.Headers["Cache-Control"] =
                "private,no-store";
            return File(
                result.Value!.ImageData,
                result.Value.ContentType);
        }

        [HttpPost("{productId:int}/variants")]
        public Task<ActionResult<SellerProductResponse>> AddVariant(
            int productId,
            [FromBody] CreateProductVariantRequest request)
        {
            return Execute(
                id => _service.AddVariantAsync(
                    id,
                    productId,
                    request));
        }

        [HttpPatch("{productId:int}/variants/{variantId:int}")]
        public Task<ActionResult<SellerProductResponse>>
            UpdateVariant(
                int productId,
                int variantId,
                [FromBody] UpdateProductVariantRequest request)
        {
            return Execute(
                id => _service.UpdateVariantAsync(
                    id,
                    productId,
                    variantId,
                    request));
        }

        [HttpDelete("{productId:int}/variants/{variantId:int}")]
        public Task<ActionResult<SellerProductResponse>>
            DeleteVariant(
                int productId,
                int variantId,
                [FromBody] DeleteProductVariantRequest request)
        {
            return Execute(
                id => _service.DeleteVariantAsync(
                    id,
                    productId,
                    variantId,
                    request));
        }

        [HttpPatch("{productId:int}/status")]
        public Task<ActionResult<SellerProductResponse>> UpdateStatus(
            int productId,
            [FromBody] UpdateProductStatusRequest request)
        {
            return Execute(
                id => _service.UpdateStatusAsync(
                    id,
                    productId,
                    request));
        }

        private async Task<ActionResult<SellerProductResponse>>
            Execute(
                Func<int, Task<ServiceResult<
                    SellerProductResponse>>> action)
        {
            var result = await action(SellerUserId);
            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        private int SellerUserId => User.GetRequiredUserId();

        private ActionResult Failure<T>(ServiceResult<T> result)
        {
            var error = new
            {
                Code = result.ErrorCode,
                Message = result.ErrorMessage
            };

            return result.ErrorCode switch
            {
                SellerProductErrorCodes.SellerForbidden =>
                    StatusCode(
                        StatusCodes.Status403Forbidden,
                        error),
                SellerProductErrorCodes.ProductNotFound or
                SellerProductErrorCodes.CategoryNotFound or
                SellerProductErrorCodes.ImageNotFound or
                SellerProductErrorCodes.VariantNotFound =>
                    NotFound(error),
                SellerProductErrorCodes.ImageFileTooLarge =>
                    StatusCode(
                        StatusCodes.Status413PayloadTooLarge,
                        error),
                SellerProductErrorCodes.StoreNotReady or
                SellerProductErrorCodes.DuplicateSku or
                SellerProductErrorCodes.DuplicateVariantOptions or
                SellerProductErrorCodes.DuplicateDisplayOrder or
                SellerProductErrorCodes.ImageConcurrencyConflict or
                SellerProductErrorCodes.ProductConcurrencyConflict or
                SellerProductErrorCodes.InvalidTransition or
                SellerProductErrorCodes.ConcurrencyConflict =>
                    Conflict(error),
                _ => BadRequest(error)
            };
        }
    }
}
