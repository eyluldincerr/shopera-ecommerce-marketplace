using Microsoft.AspNetCore.Mvc;
using Shopera.Common.DTOs;
using Shopera.Common.Models;
using Shopera.Features.Catalogue.Contracts;
using Shopera.Features.Catalogue.DTOs;
using Shopera.Features.Catalogue.Models;

namespace Shopera.Features.Catalogue.Controllers
{
    [ApiController]
    [Route("api/stores")]
    public sealed class PublicStoresController : ControllerBase
    {
        private readonly IProductCatalogueService
            _catalogueService;

        public PublicStoresController(
            IProductCatalogueService catalogueService)
        {
            _catalogueService = catalogueService;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResponse<
            PublicStoreCardResponse>>> GetStores(
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            return Ok(
                await _catalogueService.GetStoresAsync(
                    search,
                    page,
                    pageSize));
        }

        [HttpGet("{storeId:int}")]
        public async Task<ActionResult<
            PublicStoreDetailResponse>> GetStore(int storeId)
        {
            if (storeId < 1)
            {
                return BadRequest(new
                {
                    Code = "INVALID_STORE_ID",
                    Message =
                        "Store ID must be greater than zero."
                });
            }

            var result =
                await _catalogueService.GetStoreAsync(storeId);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("by-slug/{storeSlug}")]
        public async Task<ActionResult<
            PublicStoreDetailResponse>> GetStoreBySlug(
            string storeSlug)
        {
            var result =
                await _catalogueService.GetStoreBySlugAsync(
                    storeSlug);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("{storeId:int}/products")]
        public async Task<ActionResult<PagedResponse<
            PublicProductCardResponse>>> GetStoreProducts(
            int storeId,
            [FromQuery] ProductCatalogueQuery query)
        {
            if (storeId < 1)
            {
                return BadRequest(new
                {
                    Code = "INVALID_STORE_ID",
                    Message =
                        "Store ID must be greater than zero."
                });
            }

            query.StoreId = storeId;
            var result =
                await _catalogueService.GetProductsAsync(query);

            return result.Succeeded
                ? Ok(result.Value)
                : BadRequest(new
                {
                    Code = result.ErrorCode,
                    Message = result.ErrorMessage
                });
        }

        private ActionResult Failure<T>(
            ServiceResult<T> result)
        {
            return result.ErrorCode ==
                CatalogueErrorCodes.StoreNotFound
                    ? NotFound(new
                    {
                        Code = result.ErrorCode,
                        Message = result.ErrorMessage
                    })
                    : BadRequest(new
                    {
                        Code = result.ErrorCode,
                        Message = result.ErrorMessage
                    });
        }
    }
}
