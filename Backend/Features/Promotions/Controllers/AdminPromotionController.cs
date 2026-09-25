using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shopera.Features.Promotions.DTOs;
using Shopera.Features.Promotions.Services;

namespace Shopera.Features.Promotions.Controllers;

[ApiController]
[Route("api/admin/promotions")]
[Authorize(Roles = "ADMIN")]
public class AdminPromotionController : ControllerBase
{
    private readonly IPromotionService _promotionService;

    public AdminPromotionController(IPromotionService promotionService)
    {
        _promotionService = promotionService;
    }

    // ---- Plans ----
    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await _promotionService.GetAllPlansAsync();
        return Ok(plans);
    }

    [HttpGet("plans/{planId}")]
    public async Task<IActionResult> GetPlan(int planId)
    {
        var plan = await _promotionService.GetPlanByIdAsync(planId);
        if (plan == null) return NotFound();
        return Ok(plan);
    }

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan([FromBody] CreatePromotionPlanDto dto)
    {
        var plan = await _promotionService.CreatePlanAsync(dto);
        return CreatedAtAction(nameof(GetPlan), new { planId = plan.PromotionPlanID }, plan);
    }

    [HttpPut("plans/{planId}")]
    public async Task<IActionResult> UpdatePlan(int planId, [FromBody] CreatePromotionPlanDto dto)
    {
        var plan = await _promotionService.UpdatePlanAsync(planId, dto);
        return Ok(plan);
    }

    [HttpDelete("plans/{planId}")]
    public async Task<IActionResult> DeletePlan(int planId)
    {
        await _promotionService.DeletePlanAsync(planId);
        return NoContent();
    }

    // ---- Campaigns ----
    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns([FromQuery] bool includeInactive = false)
    {
        var campaigns = await _promotionService.GetAllCampaignsAsync(includeInactive);
        return Ok(campaigns);
    }

    [HttpGet("campaigns/{campaignId}")]
    public async Task<IActionResult> GetCampaign(int campaignId)
    {
        var campaign = await _promotionService.GetCampaignByIdAsync(campaignId);
        if (campaign == null) return NotFound();
        return Ok(campaign);
    }

    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromForm] CreatePromotionCampaignDto dto)
    {
        var campaign = await _promotionService.CreateCampaignAsync(dto);
        return CreatedAtAction(nameof(GetCampaign), new { campaignId = campaign.CampaignID }, campaign);
    }

    [HttpPut("campaigns/{campaignId}")]
    public async Task<IActionResult> UpdateCampaign(int campaignId, [FromForm] CreatePromotionCampaignDto dto)
    {
        var campaign = await _promotionService.UpdateCampaignAsync(campaignId, dto);
        return Ok(campaign);
    }

    [HttpDelete("campaigns/{campaignId}")]
    public async Task<IActionResult> DeleteCampaign(int campaignId)
    {
        await _promotionService.DeleteCampaignAsync(campaignId);
        return NoContent();
    }

    [HttpPatch("campaigns/{campaignId}/status")]
    public async Task<IActionResult> UpdateStatus(int campaignId, [FromBody] string status)
    {
        await _promotionService.UpdateCampaignStatusAsync(campaignId, status);
        return NoContent();
    }
}