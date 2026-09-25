using Microsoft.AspNetCore.Mvc;
using Shopera.Features.Promotions.Services;

namespace Shopera.Features.Promotions.Controllers;

[ApiController]
[Route("api/promotions")]
public class PublicPromotionController : ControllerBase
{
    private readonly IPromotionService _promotionService;

    public PublicPromotionController(IPromotionService promotionService)
    {
        _promotionService = promotionService;
    }

    [HttpGet("campaigns/active")]
    public async Task<IActionResult> GetActiveCampaigns()
    {
        var campaigns = await _promotionService.GetActiveCampaignsForHomeAsync();
        return Ok(campaigns);
    }

    [HttpGet("campaigns/{campaignId}/image")]
    public async Task<IActionResult> GetCampaignImage(int campaignId)
    {
        var image = await _promotionService.GetCampaignImageAsync(campaignId);
        if (image == null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "public,max-age=60";
        return File(image.Value.Data, image.Value.ContentType);
    }
}
