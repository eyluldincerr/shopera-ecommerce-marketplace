using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Admin.DTOs
{
    public sealed class AdminStoreDecisionRequest
    {
        [StringLength(500)]
        public string? DecisionNote { get; set; }
    }
}
