using Shopera.Features.Cart.DTOs.Responses;
using Shopera.Features.Orders.DTOs.Requests;
using Shopera.Features.Orders.DTOs.Responses;

namespace Shopera.Features.Orders.Contracts;

public interface IOrderService
{
    Task<OrderDetailsResponse> CheckoutAsync(int buyerUserId, CheckoutRequest request);
    Task<IReadOnlyList<OrderSummaryResponse>> GetBuyerOrdersAsync(int buyerUserId);
    Task<OrderDetailsResponse> GetBuyerOrderAsync(int buyerUserId, int orderId);
    Task<OrderDetailsResponse> CancelAsync(int buyerUserId, int orderId, CancelOrderRequest request);
    Task<CartResponse> ReorderAsync(int buyerUserId, int orderId);
    Task ArchiveAsync(int buyerUserId, int orderId);
    Task<IReadOnlyList<SellerOrderResponse>> GetSellerOrdersAsync(int sellerUserId);
    Task<SellerOrderResponse> GetSellerOrderAsync(int sellerUserId, int orderId);
    Task<bool> ChangeStatusAsync(
        int sellerUserId,
        int orderId,
        string newStatus,
        string? courierName = null,
        string? trackingNumber = null);
    Task<SellerOrderResponse> UpdateShipmentAsync(
        int sellerUserId,
        int orderId,
        UpdateShipmentRequest request);
}
