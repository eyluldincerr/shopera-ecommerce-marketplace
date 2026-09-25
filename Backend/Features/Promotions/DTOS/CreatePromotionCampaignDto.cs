using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Promotions.DTOs;

public class CreatePromotionCampaignDto
{
    [Required]
    public int PromotionPlanID { get; set; }

    [Required]
    [MaxLength(200)]
    public string CampaignName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? CampaignDescription { get; set; }

    public IFormFile? BannerImageFile { get; set; } // For upload

    [MaxLength(255)]
    public string? BannerAltText { get; set; }

    [MaxLength(500)]
    public string? LinkURL { get; set; }

    public int DisplayOrder { get; set; } = 0;

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public bool IsActive { get; set; } = true;
}