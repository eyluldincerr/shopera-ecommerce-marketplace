using Shopera.Common.Models;
using Shopera.Features.Buyer.Reviews.DTOs;

namespace Shopera.Features.Buyer.Reviews.Contracts
{
    public interface IReviewService
    {
        Task<ServiceResult<ProductReviewsResponse>>
            GetForProductAsync(
                int productId,
                int page,
                int pageSize);

        Task<ServiceResult<MyReviewStateResponse>> GetMineStateAsync(
            int buyerUserId,
            int productId);

        Task<ServiceResult<ReviewResponse>> CreateAsync(
            int buyerUserId,
            int productId,
            CreateReviewRequest request);

        Task<ServiceResult<ReviewResponse>> UpdateMineAsync(
            int buyerUserId,
            int productId,
            UpdateReviewRequest request);

        Task<ServiceResult<bool>> DeleteMineAsync(
            int buyerUserId,
            int productId);
    }
}
