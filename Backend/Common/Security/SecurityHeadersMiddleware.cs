namespace Shopera.Common.Security;

public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            IHeaderDictionary headers = context.Response.Headers;

            headers.TryAdd("X-Content-Type-Options", "nosniff");
            headers.TryAdd("X-Frame-Options", "DENY");
            headers.TryAdd("Referrer-Policy", "no-referrer");
            headers.TryAdd(
                "Permissions-Policy",
                "camera=(), microphone=(), geolocation=()");

            bool isSensitiveResponse =
                context.Request.Headers.ContainsKey("Authorization") ||
                context.Request.Path.StartsWithSegments("/api/auth");

            if (isSensitiveResponse)
            {
                headers["Cache-Control"] = "no-store";
                headers["Pragma"] = "no-cache";
            }

            return Task.CompletedTask;
        });

        await _next(context);
    }
}
