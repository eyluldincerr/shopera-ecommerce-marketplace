using Shopera.Features.Cart.DTOs.Requests;
using Shopera.Features.Cart.DTOs.Responses;

namespace Shopera.Features.Cart.Contracts;

public interface ICartService
{
    Task<CartResponse> GetAsync(int buyerUserId);
    Task<CartResponse> AddItemAsync(int buyerUserId, AddCartItemRequest request);
    Task<CartResponse> UpdateQuantityAsync(int buyerUserId, int variantId, UpdateCartItemQuantityRequest request);
    Task RemoveItemAsync(int buyerUserId, int variantId);
    Task ClearAsync(int buyerUserId);
}
