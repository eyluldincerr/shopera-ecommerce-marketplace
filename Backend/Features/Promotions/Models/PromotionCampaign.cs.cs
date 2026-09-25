using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Shopera.Features.Promotions.Models;

public class PromotionCampaign
{
    public int CampaignID { get; set; }

    public int PromotionPlanID { get; set; }

    [Required]
    [MaxLength(200)]
    public string CampaignName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? CampaignDescription { get; set; }

    public byte[]? BannerImage { get; set; } // actual image bytes

    [MaxLength(50)]
    public string? BannerContentType { get; set; } // MIME type

    [MaxLength(255)]
    public string? BannerAltText { get; set; }

    [MaxLength(500)]
    public string? LinkURL { get; set; }

    public int DisplayOrder { get; set; } = 0;

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public bool IsActive { get; set; } = true;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "DRAFT"; // DRAFT, ACTIVE, PAUSED, EXPIRED

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedDate { get; set; }

    // Navigation
    [ForeignKey(nameof(PromotionPlanID))]
    public PromotionPlan? Plan { get; set; }
}