using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Identity.Authentication.DTOs.Requests;

public sealed class ResetPasswordRequest
{
    [Required]
    [StringLength(500)]
    public string Token { get; init; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; init; } = string.Empty;
}
