namespace Shopera.Features.Identity.Authentication.DTOs.Responses;

public sealed class CurrentUserResponse
{
    public int UserId { get; init; }

    public string FullName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public string Role { get; init; } = string.Empty;
}
