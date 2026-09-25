namespace Shopera.Features.Profile.DTOs;

public sealed class UserProfileResponse
{
    public int UserId { get; init; }

    public string FullName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public string Role { get; init; } = string.Empty;

    public string AccountStatus { get; init; } = string.Empty;
}
