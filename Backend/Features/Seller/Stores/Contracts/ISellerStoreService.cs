using Shopera.Common.Models;
using Shopera.Features.Seller.Stores.DTOs;

namespace Shopera.Features.Seller.Stores.Contracts
{
    public interface ISellerStoreService
    {
        Task<ServiceResult<SellerStoreResponse>> GetMineAsync(
            int sellerUserId);

        Task<ServiceResult<StoreSubmissionResponse>>
            CreateAsync(
                int sellerUserId,
                CreateSellerStoreRequest request);

        Task<ServiceResult<SellerStoreResponse>> UpdateAsync(
            int sellerUserId,
            UpdateSellerStoreRequest request);

        Task<ServiceResult<SellerStoreResponse>>
            UpdateStatusAsync(
                int sellerUserId,
                UpdateSellerStoreStatusRequest request);

        Task<ServiceResult<StoreSubmissionResponse>>
            ResubmitAsync(int sellerUserId);
    }
}
