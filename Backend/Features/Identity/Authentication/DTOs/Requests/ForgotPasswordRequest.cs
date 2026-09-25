using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Identity.Authentication.DTOs.Requests;

public sealed class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; init; } = string.Empty;
}
