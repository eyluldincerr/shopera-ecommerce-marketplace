using Shopera.Common.Models;
using Shopera.Features.Buyer.Wishlist.DTOs;

namespace Shopera.Features.Buyer.Wishlist.Contracts;

public interface IWishlistService
{
    Task<ServiceResult<WishlistResponse>> GetAsync(int buyerUserId);

    Task<ServiceResult<WishlistResponse>> AddAsync(
        int buyerUserId,
        AddWishlistItemRequest request);

    Task<ServiceResult<WishlistResponse>> RemoveAsync(
        int buyerUserId,
        int variantId);

    Task<ServiceResult<WishlistResponse>> ClearAsync(int buyerUserId);
}
