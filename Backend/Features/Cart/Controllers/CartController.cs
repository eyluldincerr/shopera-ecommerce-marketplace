using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Exceptions;
using Shopera.Common.Extensions;
using Shopera.Domain.Constants;
using Shopera.Features.Cart.Contracts;
using Shopera.Features.Cart.DTOs.Requests;
using Shopera.Features.Cart.DTOs.Responses;

namespace Shopera.Features.Cart.Controllers;

[ApiController]
[Authorize(Roles = AccountRoles.Buyer)]
[Route("api/cart")]
public sealed class CartController : ControllerBase
{
    private readonly ICartService _service;

    public CartController(ICartService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<CartResponse>> Get() =>
        Ok(await _service.GetAsync(User.GetRequiredUserId()));

    [HttpPost("items")]
    public async Task<ActionResult<CartResponse>> Add(AddCartItemRequest request)
    {
        try
        {
            return Ok(await _service.AddItemAsync(User.GetRequiredUserId(), request));
        }
        catch (RequestConflictException exception)
        {
            return Conflict(CreateConflictProblem(exception));
        }
    }

    [HttpPut("items/{variantId:int}")]
    public async Task<ActionResult<CartResponse>> Update(int variantId, UpdateCartItemQuantityRequest request)
    {
        try
        {
            return Ok(await _service.UpdateQuantityAsync(User.GetRequiredUserId(), variantId, request));
        }
        catch (RequestConflictException exception)
        {
            return Conflict(CreateConflictProblem(exception));
        }
    }

    [HttpDelete("items/{variantId:int}")]
    public async Task<IActionResult> Remove(int variantId)
    {
        await _service.RemoveItemAsync(User.GetRequiredUserId(), variantId);
        return NoContent();
    }

    [HttpDelete("items")]
    public async Task<IActionResult> Clear()
    {
        await _service.ClearAsync(User.GetRequiredUserId());
        return NoContent();
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
