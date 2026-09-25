using Shopera.Common.Models;
using Shopera.Features.Buyer.Addresses.DTOs;

namespace Shopera.Features.Buyer.Addresses.Contracts
{
    public interface IBuyerAddressService
    {
        Task<ServiceResult<IReadOnlyList<BuyerAddressResponse>>>
            GetAllAsync(int buyerUserId);

        Task<ServiceResult<BuyerAddressResponse>> GetByIdAsync(
            int buyerUserId,
            int addressId);

        Task<ServiceResult<BuyerAddressResponse>> CreateAsync(
            int buyerUserId,
            CreateBuyerAddressRequest request);

        Task<ServiceResult<BuyerAddressResponse>> UpdateAsync(
            int buyerUserId,
            int addressId,
            UpdateBuyerAddressRequest request);

        Task<ServiceResult<bool>> DeleteAsync(
            int buyerUserId,
            int addressId);
    }
}
