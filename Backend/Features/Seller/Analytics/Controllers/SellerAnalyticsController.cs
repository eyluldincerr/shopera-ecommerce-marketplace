using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Extensions;
using Shopera.Domain.Constants;
using Shopera.Features.Seller.Analytics.Contracts;
using Shopera.Features.Seller.Analytics.DTOs;

namespace Shopera.Features.Seller.Analytics.Controllers;

[ApiController]
[Authorize(Roles = AccountRoles.Seller)]
[Route("api/seller/analytics")]
public sealed class SellerAnalyticsController : ControllerBase
{
    private readonly ISellerAnalyticsService _service;

    public SellerAnalyticsController(ISellerAnalyticsService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<SellerAnalyticsResponse>> Get(
        [FromQuery] string? salesPeriod = "ALL_TIME",
        [FromQuery] string? categoryPeriod = "ALL_TIME",
        [FromQuery] int yearOffset = 0)
    {
        return Ok(await _service.GetAsync(
            User.GetRequiredUserId(),
            salesPeriod,
            categoryPeriod,
            yearOffset));
    }
}
