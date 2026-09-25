using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Buyer.Reviews.DTOs
{
    public sealed class CreateReviewRequest
    {
        [Range(1, 5)]
        public int Rating { get; set; }

        [StringLength(2000)]
        public string? Comment { get; set; }
    }
}
