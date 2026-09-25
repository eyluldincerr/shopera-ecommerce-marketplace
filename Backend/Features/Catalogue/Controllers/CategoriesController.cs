using Microsoft.AspNetCore.Mvc;
using Shopera.Features.Catalogue.Contracts;
using Shopera.Features.Catalogue.DTOs;

namespace Shopera.Features.Catalogue.Controllers
{
    [ApiController]
    [Route("api/categories")]
    public sealed class CategoriesController : ControllerBase
    {
        private readonly IProductCatalogueService
            _catalogueService;

        public CategoriesController(
            IProductCatalogueService catalogueService)
        {
            _catalogueService = catalogueService;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<
            PublicCategoryResponse>>> GetCategories()
        {
            return Ok(
                await _catalogueService.GetCategoriesAsync());
        }

        [HttpGet("{categoryId:int}/image")]
        public async Task<ActionResult> GetCategoryImage(int categoryId)
        {
            var result =
                await _catalogueService.GetCategoryImageAsync(categoryId);

            if (!result.Succeeded)
            {
                return NotFound(new
                {
                    Code = result.ErrorCode,
                    Message = result.ErrorMessage
                });
            }

            return File(
                result.Value!.ImageData,
                result.Value.ContentType);
        }
    }
}
