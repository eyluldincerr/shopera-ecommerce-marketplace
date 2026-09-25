using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Identity.Authentication.DTOs.Requests;

public sealed class ChangePasswordRequest
{
    [Required]
    [StringLength(100)]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; init; } = string.Empty;
}
