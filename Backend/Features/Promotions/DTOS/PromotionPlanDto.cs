namespace Shopera.Features.Promotions.DTOs;

public class PromotionPlanDto
{
    public int PromotionPlanID { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string? PlanDescription { get; set; }
    public string PlanType { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? Config { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
}