using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Exceptions;
using Shopera.Common.Extensions;
using Shopera.Domain.Constants;
using Shopera.Features.Cart.DTOs.Responses;
using Shopera.Features.Orders.Contracts;
using Shopera.Features.Orders.DTOs.Requests;
using Shopera.Features.Orders.DTOs.Responses;

namespace Shopera.Features.Orders.Controllers;

[ApiController]
[Authorize]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService _service;

    public OrdersController(IOrderService service)
    {
        _service = service;
    }

    [Authorize(Roles = AccountRoles.Buyer)]
    [HttpPost("checkout")]
    public async Task<ActionResult<OrderDetailsResponse>> Checkout(CheckoutRequest request)
    {
        try
        {
            OrderDetailsResponse result = await _service.CheckoutAsync(User.GetRequiredUserId(), request);
            return CreatedAtAction(nameof(GetBuyerOrder), new { orderId = result.OrderId }, result);
        }
        catch (RequestConflictException exception)
        {
            return Conflict(CreateConflictProblem(exception));
        }
    }

    [Authorize(Roles = AccountRoles.Buyer)]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderSummaryResponse>>> GetBuyerOrders() =>
        Ok(await _service.GetBuyerOrdersAsync(User.GetRequiredUserId()));

    [Authorize(Roles = AccountRoles.Buyer)]
    [HttpGet("{orderId:int}")]
    public async Task<ActionResult<OrderDetailsResponse>> GetBuyerOrder(int orderId) =>
        Ok(await _service.GetBuyerOrderAsync(User.GetRequiredUserId(), orderId));

    [Authorize(Roles = AccountRoles.Buyer)]
    [HttpPatch("{orderId:int}/cancel")]
    public async Task<ActionResult<OrderDetailsResponse>> Cancel(int orderId, CancelOrderRequest request)
    {
        try
        {
            return Ok(await _service.CancelAsync(User.GetRequiredUserId(), orderId, request));
        }
        catch (RequestConflictException exception)
        {
            return Conflict(CreateConflictProblem(exception));
        }
    }

    [Authorize(Roles = AccountRoles.Buyer)]
    [HttpPost("{orderId:int}/reorder")]
    public async Task<ActionResult<CartResponse>> Reorder(int orderId)
    {
        try
        {
            return Ok(await _service.ReorderAsync(User.GetRequiredUserId(), orderId));
        }
        catch (RequestConflictException exception)
        {
            return Conflict(CreateConflictProblem(exception));
        }
    }

    [Authorize(Roles = AccountRoles.Buyer)]
    [HttpPatch("{orderId:int}/archive")]
    public async Task<IActionResult> Archive(int orderId)
    {
        try
        {
            await _service.ArchiveAsync(User.GetRequiredUserId(), orderId);
            return NoContent();
        }
        catch (RequestConflictException exception)
        {
            return Conflict(CreateConflictProblem(exception));
        }
    }

    [Authorize(Roles = AccountRoles.Seller)]
    [HttpGet("seller")]
    public async Task<ActionResult<IReadOnlyList<SellerOrderResponse>>> GetSellerOrders() =>
        Ok(await _service.GetSellerOrdersAsync(User.GetRequiredUserId()));

    [Authorize(Roles = AccountRoles.Seller)]
    [HttpGet("seller/{orderId:int}")]
    public async Task<ActionResult<SellerOrderResponse>> GetSellerOrder(int orderId) =>
        Ok(await _service.GetSellerOrderAsync(User.GetRequiredUserId(), orderId));

    [Authorize(Roles = AccountRoles.Seller)]
    [HttpPatch("{orderId:int}/status")]
    public async Task<IActionResult> ChangeStatus(int orderId, ChangeOrderStatusRequest request)
    {
        try
        {
            bool updated = await _service.ChangeStatusAsync(
                User.GetRequiredUserId(),
                orderId,
                request.NewStatus,
                request.CourierName,
                request.TrackingNumber);
            return updated ? NoContent() : NotFound();
        }
        catch (RequestConflictException exception)
        {
            return Conflict(CreateConflictProblem(exception));
        }
    }

    [Authorize(Roles = AccountRoles.Seller)]
    [HttpPatch("{orderId:int}/shipment")]
    public async Task<ActionResult<SellerOrderResponse>> UpdateShipment(
        int orderId,
        UpdateShipmentRequest request)
    {
        try
        {
            return Ok(await _service.UpdateShipmentAsync(
                User.GetRequiredUserId(),
                orderId,
                request));
        }
        catch (RequestConflictException exception)
        {
            return Conflict(CreateConflictProblem(exception));
        }
    }

    private ProblemDetails CreateConflictProblem(RequestConflictException exception)
    {
        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Request conflict",
            Detail = exception.PublicMessage,
            Instance = HttpContext.Request.Path
        };

        problem.Extensions["code"] = exception.Code;
        foreach ((string key, object? value) in exception.Extensions)
        {
            if (value is not null)
            {
                problem.Extensions[key] = value;
            }
        }

        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
        return problem;
    }
}
