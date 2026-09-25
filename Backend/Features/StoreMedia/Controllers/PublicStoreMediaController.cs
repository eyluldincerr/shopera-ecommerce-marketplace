using Microsoft.AspNetCore.Mvc;
using Shopera.Data;
using Shopera.Features.StoreMedia.DTOs;
using Shopera.Features.StoreMedia.Services;

namespace Shopera.Features.StoreMedia.Controllers
{
    [ApiController]
    [Route("api/stores")]
    public sealed class PublicStoreMediaController : ControllerBase
    {
        private readonly StoreMediaService _service;

        public PublicStoreMediaController(ApplicationDbContext dbContext)
        {
            _service = new StoreMediaService(dbContext);
        }

        [HttpGet("stories")]
        public async Task<ActionResult<IReadOnlyList<StoreMediaResponse>>>
            GetHomeStories()
        {
            return Ok(await _service.GetPublicHomeStoriesAsync());
        }

        [HttpGet("{storeId:int}/showcase")]
        public async Task<ActionResult<IReadOnlyList<StoreMediaResponse>>>
            GetStoreShowcase(int storeId)
        {
            if (storeId < 1)
            {
                return BadRequest(new
                {
                    Code = "INVALID_STORE_ID",
                    Message = "Store ID must be greater than zero."
                });
            }

            return Ok(await _service.GetPublicShowcaseAsync(storeId));
        }
    }
}
