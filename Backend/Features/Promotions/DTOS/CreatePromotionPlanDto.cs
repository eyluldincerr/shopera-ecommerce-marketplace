using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Promotions.DTOs;

public class CreatePromotionPlanDto
{
    [Required]
    [MaxLength(100)]
    public string PlanName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? PlanDescription { get; set; }

    [Required]
    [MaxLength(30)]
    public string PlanType { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public string? Config { get; set; }
}