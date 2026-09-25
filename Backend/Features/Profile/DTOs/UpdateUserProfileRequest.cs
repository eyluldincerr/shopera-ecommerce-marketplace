using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Profile.DTOs;

public sealed class UpdateUserProfileRequest
{
    [Required]
    [StringLength(150, MinimumLength = 3)]
    public string FullName { get; init; } = string.Empty;

    [Phone]
    [StringLength(30)]
    public string? PhoneNumber { get; init; }
}
