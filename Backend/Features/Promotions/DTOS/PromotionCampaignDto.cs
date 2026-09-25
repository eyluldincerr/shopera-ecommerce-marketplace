namespace Shopera.Features.Promotions.DTOs;

public class PromotionCampaignDto
{
    public int CampaignID { get; set; }
    public int PromotionPlanID { get; set; }
    public string PromotionPlanName { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string? CampaignDescription { get; set; }
    public string? BannerImageUrl { get; set; }
    public bool HasBannerImage { get; set; }
    public string? BannerContentType { get; set; }
    public string? BannerAltText { get; set; }
    public string? LinkURL { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
}
