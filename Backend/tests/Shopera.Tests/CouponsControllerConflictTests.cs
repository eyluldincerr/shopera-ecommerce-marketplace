using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Exceptions;
using Shopera.Features.Coupons.Contracts;
using Shopera.Features.Coupons.Controllers;
using Shopera.Features.Coupons.DTOs;
using Shopera.Features.Coupons.Models;

namespace Shopera.Tests;

public sealed class CouponsControllerConflictTests
{
    [Fact]
    public async Task Validate_MinimumNotMet_ReturnsControlled409ProblemDetails()
    {
        var service = new ThrowingCouponService(new RequestConflictException(
            CouponErrorCodes.MinimumNotMet,
            "The cart subtotal does not meet the coupon minimum purchase amount.",
            new Dictionary<string, object?>
            {
                ["couponCode"] = "SUMMER20",
                ["minimumPurchaseAmount"] = 1000m,
                ["subtotalAmount"] = 699m
            }));

        var controller = new CouponsController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = CreateBuyerContext()
            }
        };

        ActionResult<CouponValidationResponse> action = await controller.Validate(
            new ValidateCouponRequest { CouponCode = "SUMMER20" });

        var conflict = Assert.IsType<ConflictObjectResult>(action.Result);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal(CouponErrorCodes.MinimumNotMet, problem.Extensions["code"]);
        Assert.Equal(1000m, problem.Extensions["minimumPurchaseAmount"]);
        Assert.Equal(699m, problem.Extensions["subtotalAmount"]);
    }

    private static DefaultHttpContext CreateBuyerContext()
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/coupons/validate";
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "8"),
                new Claim(ClaimTypes.Role, "BUYER")
            },
            "Test"));
        return context;
    }

    private sealed class ThrowingCouponService : ICouponService
    {
        private readonly Exception _exception;

        public ThrowingCouponService(Exception exception)
        {
            _exception = exception;
        }

        public Task<IReadOnlyList<BuyerCouponResponse>> GetAvailableAsync(int buyerUserId) =>
            Task.FromResult<IReadOnlyList<BuyerCouponResponse>>(Array.Empty<BuyerCouponResponse>());

        public Task<CouponValidationResponse> ValidateForCartAsync(
            int buyerUserId,
            string couponCode) =>
            Task.FromException<CouponValidationResponse>(_exception);
    }
}
