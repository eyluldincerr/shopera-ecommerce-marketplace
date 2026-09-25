using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Features.Cart.Exceptions;

namespace Shopera.Tests;

public sealed class GlobalExceptionHandlerTests
{
    [Fact]
    public async Task InsufficientStock_ReturnsSafe409ProblemDetails()
    {
        var context = CreateHttpContext("/api/cart/items");
        var handler = new GlobalExceptionHandler(
            NullLogger<GlobalExceptionHandler>.Instance);

        bool handled = await handler.TryHandleAsync(
            context,
            new InsufficientStockException(44, 3, 1),
            CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status409Conflict, context.Response.StatusCode);
        Assert.StartsWith("application/problem+json", context.Response.ContentType);

        using JsonDocument json = await ReadResponseAsync(context);
        JsonElement root = json.RootElement;
        Assert.Equal("INSUFFICIENT_STOCK", root.GetProperty("code").GetString());
        Assert.Equal(44, root.GetProperty("variantId").GetInt32());
        Assert.Equal(3, root.GetProperty("requestedQuantity").GetInt32());
        Assert.Equal(1, root.GetProperty("availableStock").GetInt32());
        Assert.DoesNotContain("InvalidOperationException", root.GetRawText());
        Assert.DoesNotContain("System.", root.GetRawText());
    }

    [Fact]
    public async Task EfConcurrency_ReturnsSafe409WithoutInternalDetail()
    {
        var context = CreateHttpContext("/api/test");
        var handler = new GlobalExceptionHandler(
            NullLogger<GlobalExceptionHandler>.Instance);

        await handler.TryHandleAsync(
            context,
            new DbUpdateConcurrencyException("internal EF concurrency detail"),
            CancellationToken.None);

        Assert.Equal(StatusCodes.Status409Conflict, context.Response.StatusCode);
        using JsonDocument json = await ReadResponseAsync(context);
        Assert.Equal(
            "DATA_CONCURRENCY_CONFLICT",
            json.RootElement.GetProperty("code").GetString());
        Assert.DoesNotContain("internal EF concurrency detail", json.RootElement.GetRawText());
    }

    [Fact]
    public async Task GenericInvalidOperation_IsNotGloballyConvertedTo409()
    {
        var context = CreateHttpContext("/api/test");
        var handler = new GlobalExceptionHandler(
            NullLogger<GlobalExceptionHandler>.Instance);

        await handler.TryHandleAsync(
            context,
            new InvalidOperationException("internal implementation detail"),
            CancellationToken.None);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        using JsonDocument json = await ReadResponseAsync(context);
        Assert.Equal(
            "An unexpected error occurred.",
            json.RootElement.GetProperty("detail").GetString());
        Assert.DoesNotContain("internal implementation detail", json.RootElement.GetRawText());
    }

    private static DefaultHttpContext CreateHttpContext(string path)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static async Task<JsonDocument> ReadResponseAsync(HttpContext context)
    {
        context.Response.Body.Position = 0;
        return await JsonDocument.ParseAsync(context.Response.Body);
    }
}
