using Microsoft.AspNetCore.Mvc;
using Shopera.Common.DTOs;
using Shopera.Common.Models;
using Shopera.Features.Catalogue.Contracts;
using Shopera.Features.Catalogue.DTOs;
using Shopera.Features.Catalogue.Models;

namespace Shopera.Features.Catalogue.Controllers
{
    [ApiController]
    [Route("api/products")]
    public sealed class ProductsController : ControllerBase
    {
        private readonly IProductCatalogueService
            _catalogueService;

        public ProductsController(
            IProductCatalogueService catalogueService)
        {
            _catalogueService = catalogueService;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResponse<
            PublicProductCardResponse>>> GetProducts(
            [FromQuery] ProductCatalogueQuery query)
        {
            var result =
                await _catalogueService.GetProductsAsync(query);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("{productId:int}")]
        public async Task<ActionResult<
            PublicProductDetailResponse>> GetProduct(
            int productId)
        {
            if (productId < 1)
            {
                return BadRequest(new
                {
                    Code = "INVALID_PRODUCT_ID",
                    Message =
                        "Product ID must be greater than zero."
                });
            }

            var result =
                await _catalogueService.GetProductAsync(
                    productId);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("{productId:int}/related")]
        public async Task<ActionResult<PagedResponse<
            PublicProductCardResponse>>> GetRelatedProducts(
            int productId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 4)
        {
            if (productId < 1)
            {
                return BadRequest(new
                {
                    Code = "INVALID_PRODUCT_ID",
                    Message =
                        "Product ID must be greater than zero."
                });
            }

            var result =
                await _catalogueService.GetRelatedProductsAsync(
                    productId,
                    page,
                    pageSize);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("brands")]
        public async Task<ActionResult<IReadOnlyList<
            PublicBrandResponse>>> GetBrands(
            [FromQuery] int limit = 20)
        {
            return Ok(
                await _catalogueService.GetBrandsAsync(limit));
        }

        private ActionResult Failure<T>(
            ServiceResult<T> result)
        {
            var error = new
            {
                Code = result.ErrorCode,
                Message = result.ErrorMessage
            };

            return result.ErrorCode switch
            {
                CatalogueErrorCodes.ProductNotFound =>
                    NotFound(error),
                _ => BadRequest(error)
            };
        }
    }
}
