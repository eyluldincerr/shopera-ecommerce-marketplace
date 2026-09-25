using Shopera.Features.Promotions.DTOs;

namespace Shopera.Features.Promotions.Services;

public interface IPromotionService
{
    // Plans
    Task<IEnumerable<PromotionPlanDto>> GetAllPlansAsync();
    Task<PromotionPlanDto?> GetPlanByIdAsync(int planId);
    Task<PromotionPlanDto> CreatePlanAsync(CreatePromotionPlanDto dto);
    Task<PromotionPlanDto> UpdatePlanAsync(int planId, CreatePromotionPlanDto dto);
    Task DeletePlanAsync(int planId);

    // Campaigns
    Task<IEnumerable<PromotionCampaignDto>> GetAllCampaignsAsync(bool includeInactive = false);
    Task<IEnumerable<PromotionCampaignDto>> GetActiveCampaignsForHomeAsync();
    Task<PromotionCampaignDto?> GetCampaignByIdAsync(int campaignId);
    Task<PromotionCampaignDto> CreateCampaignAsync(CreatePromotionCampaignDto dto);
    Task<PromotionCampaignDto> UpdateCampaignAsync(int campaignId, CreatePromotionCampaignDto dto);
    Task DeleteCampaignAsync(int campaignId);
    Task UpdateCampaignStatusAsync(int campaignId, string status);

    // Image
    Task<(byte[] Data, string ContentType)?> GetCampaignImageAsync(int campaignId);
}
