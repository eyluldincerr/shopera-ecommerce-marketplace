using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Shopera.Common.Exceptions;

/// <summary>
/// Handles request/business exceptions inside the MVC action pipeline so
/// expected validation/conflict outcomes do not bubble to the outer ASP.NET
/// exception middleware (which Visual Studio can report as "User-Unhandled").
/// Unexpected exceptions are deliberately left untouched for
/// GlobalExceptionHandler to log and convert to a safe 500 response.
/// </summary>
public sealed class SafeRequestExceptionFilter : IExceptionFilter
{
    private readonly ILogger<SafeRequestExceptionFilter> _logger;

    public SafeRequestExceptionFilter(ILogger<SafeRequestExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        int? status = context.Exception switch
        {
            RequestConflictException => StatusCodes.Status409Conflict,
            DbUpdateConcurrencyException => StatusCodes.Status409Conflict,
            DbUpdateException dbUpdateException
                when DatabaseExceptionClassifier.IsUniqueConstraintViolation(dbUpdateException)
                    => StatusCodes.Status409Conflict,
            ArgumentException => StatusCodes.Status400BadRequest,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            KeyNotFoundException => StatusCodes.Status404NotFound,
            _ => null
        };

        if (!status.HasValue)
        {
            // Do not hide real programming/infrastructure failures.
            return;
        }

        _logger.LogInformation(
            "Request rejected with {Status} for {Path}",
            status.Value,
            context.HttpContext.Request.Path);

        string detail = context.Exception switch
        {
            RequestConflictException conflict => conflict.PublicMessage,
            DbUpdateConcurrencyException =>
                "The record changed while this request was being processed. Refresh and try again.",
            DbUpdateException =>
                "The request conflicts with data that was saved at the same time. Refresh and try again.",
            _ => context.Exception.Message
        };

        var problem = new ProblemDetails
        {
            Status = status.Value,
            Title = status.Value switch
            {
                StatusCodes.Status400BadRequest => "Invalid request",
                StatusCodes.Status401Unauthorized => "Authentication failed",
                StatusCodes.Status404NotFound => "Resource not found",
                StatusCodes.Status409Conflict => "Request conflict",
                _ => "Request failed"
            },
            Detail = detail,
            Instance = context.HttpContext.Request.Path
        };

        if (context.Exception is RequestConflictException conflictException)
        {
            problem.Extensions["code"] = conflictException.Code;

            foreach ((string key, object? value) in conflictException.Extensions)
            {
                if (value is not null)
                {
                    problem.Extensions[key] = value;
                }
            }
        }
        else if (context.Exception is DbUpdateConcurrencyException)
        {
            problem.Extensions["code"] = "DATA_CONCURRENCY_CONFLICT";
        }
        else if (context.Exception is DbUpdateException)
        {
            problem.Extensions["code"] = "DATA_UNIQUE_CONFLICT";
        }

        problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

        context.Result = new JsonResult(problem)
        {
            StatusCode = status.Value,
            ContentType = "application/problem+json"
        };
        context.ExceptionHandled = true;
    }
}
