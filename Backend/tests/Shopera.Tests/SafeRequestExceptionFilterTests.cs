using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Shopera.Common.Exceptions;
using Shopera.Features.Coupons.Models;

namespace Shopera.Tests;

public sealed class SafeRequestExceptionFilterTests
{
    [Fact]
    public void CouponMinimumConflict_IsHandledInsideMvcPipeline()
    {
        var exception = new RequestConflictException(
            CouponErrorCodes.MinimumNotMet,
            "The cart subtotal does not meet the coupon minimum purchase amount.",
            new Dictionary<string, object?>
            {
                ["couponCode"] = "SUMMER20",
                ["minimumPurchaseAmount"] = 1000m,
                ["subtotalAmount"] = 699m
            });

        ExceptionContext context = CreateContext(exception, "/api/coupons/validate");
        var filter = new SafeRequestExceptionFilter(
            NullLogger<SafeRequestExceptionFilter>.Instance);

        filter.OnException(context);

        Assert.True(context.ExceptionHandled);
        var result = Assert.IsType<JsonResult>(context.Result);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
        Assert.Equal("application/problem+json", result.ContentType);

        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal(CouponErrorCodes.MinimumNotMet, problem.Extensions["code"]);
        Assert.Equal(1000m, problem.Extensions["minimumPurchaseAmount"]);
        Assert.Equal(699m, problem.Extensions["subtotalAmount"]);
    }

    [Theory]
    [InlineData(typeof(ArgumentException), StatusCodes.Status400BadRequest)]
    [InlineData(typeof(UnauthorizedAccessException), StatusCodes.Status401Unauthorized)]
    [InlineData(typeof(KeyNotFoundException), StatusCodes.Status404NotFound)]
    public void KnownSafeRequestExceptions_AreHandled(Type exceptionType, int expectedStatus)
    {
        Exception exception = (Exception)Activator.CreateInstance(exceptionType, "safe message")!;
        ExceptionContext context = CreateContext(exception, "/api/test");
        var filter = new SafeRequestExceptionFilter(
            NullLogger<SafeRequestExceptionFilter>.Instance);

        filter.OnException(context);

        Assert.True(context.ExceptionHandled);
        var result = Assert.IsType<JsonResult>(context.Result);
        Assert.Equal(expectedStatus, result.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal(expectedStatus, problem.Status);
        Assert.Equal("safe message", problem.Detail);
    }

    [Fact]
    public void EfConcurrencyConflict_IsHandledAsSafe409()
    {
        ExceptionContext context = CreateContext(
            new DbUpdateConcurrencyException("internal EF concurrency detail"),
            "/api/test");
        var filter = new SafeRequestExceptionFilter(
            NullLogger<SafeRequestExceptionFilter>.Instance);

        filter.OnException(context);

        Assert.True(context.ExceptionHandled);
        var result = Assert.IsType<JsonResult>(context.Result);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal("DATA_CONCURRENCY_CONFLICT", problem.Extensions["code"]);
        Assert.DoesNotContain("internal EF", problem.Detail);
    }

    [Fact]
    public void UnexpectedException_IsLeftForGlobalHandler()
    {
        ExceptionContext context = CreateContext(
            new InvalidOperationException("internal detail"),
            "/api/test");
        var filter = new SafeRequestExceptionFilter(
            NullLogger<SafeRequestExceptionFilter>.Instance);

        filter.OnException(context);

        Assert.False(context.ExceptionHandled);
        Assert.Null(context.Result);
    }

    private static ExceptionContext CreateContext(Exception exception, string path)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = path;
        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor());

        return new ExceptionContext(actionContext, new List<IFilterMetadata>())
        {
            Exception = exception
        };
    }
}
