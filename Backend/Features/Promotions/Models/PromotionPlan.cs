using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Promotions.Models;

public class PromotionPlan
{
    public int PromotionPlanID { get; set; }

    [Required]
    [MaxLength(100)]
    public string PlanName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? PlanDescription { get; set; }

    [Required]
    [MaxLength(30)]
    public string PlanType { get; set; } = string.Empty; // BANNER, DISCOUNT, FEATURED

    public bool IsActive { get; set; } = true;

    public string? Config { get; set; } // JSON configuration

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedDate { get; set; }

    // Navigation
    public ICollection<PromotionCampaign> Campaigns { get; set; } = new List<PromotionCampaign>();
}