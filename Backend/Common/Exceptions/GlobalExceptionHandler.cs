using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Shopera.Common.Exceptions;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        int status = exception switch
        {
            RequestConflictException => StatusCodes.Status409Conflict,
            DbUpdateConcurrencyException => StatusCodes.Status409Conflict,
            DbUpdateException dbUpdateException
                when DatabaseExceptionClassifier.IsUniqueConstraintViolation(dbUpdateException)
                    => StatusCodes.Status409Conflict,
            ArgumentException => StatusCodes.Status400BadRequest,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            KeyNotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status500InternalServerError
        };

        if (status >= 500)
        {
            _logger.LogError(exception, "Unhandled request failure for {Path}", context.Request.Path);
        }
        else
        {
            _logger.LogInformation(exception, "Request rejected with {Status} for {Path}", status, context.Request.Path);
        }

        string detail = exception switch
        {
            RequestConflictException conflict => conflict.PublicMessage,
            DbUpdateConcurrencyException =>
                "The record changed while this request was being processed. Refresh and try again.",
            DbUpdateException dbUpdateException
                when DatabaseExceptionClassifier.IsUniqueConstraintViolation(dbUpdateException)
                    => "The request conflicts with data that was saved at the same time. Refresh and try again.",
            ArgumentException or UnauthorizedAccessException or KeyNotFoundException => exception.Message,
            _ => "An unexpected error occurred."
        };

        var problem = new ProblemDetails
        {
            Status = status,
            Title = status switch
            {
                StatusCodes.Status400BadRequest => "Invalid request",
                StatusCodes.Status401Unauthorized => "Authentication failed",
                StatusCodes.Status404NotFound => "Resource not found",
                StatusCodes.Status409Conflict => "Request conflict",
                _ => "Unexpected server error"
            },
            Detail = detail,
            Instance = context.Request.Path
        };

        if (exception is RequestConflictException conflictException)
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
        else if (exception is DbUpdateConcurrencyException)
        {
            problem.Extensions["code"] = "DATA_CONCURRENCY_CONFLICT";
        }
        else if (exception is DbUpdateException dbUpdateException &&
                 DatabaseExceptionClassifier.IsUniqueConstraintViolation(dbUpdateException))
        {
            problem.Extensions["code"] = "DATA_UNIQUE_CONFLICT";
        }

        problem.Extensions["traceId"] = context.TraceIdentifier;

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
