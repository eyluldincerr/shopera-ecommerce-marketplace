using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Identity.Authentication.DTOs.Requests;

public sealed class LoginRequest
{
    [Required, EmailAddress, StringLength(255)]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(100)]
    public string Password { get; init; } = string.Empty;
}
