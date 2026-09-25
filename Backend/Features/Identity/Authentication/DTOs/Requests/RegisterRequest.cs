using System.ComponentModel.DataAnnotations;

namespace Shopera.Features.Identity.Authentication.DTOs.Requests;

public sealed class RegisterRequest
{
    [Required, StringLength(150, MinimumLength = 3)]
    public string FullName { get; init; } = string.Empty;

    [Required, EmailAddress, StringLength(255)]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8)]
    public string Password { get; init; } = string.Empty;

    [Required, StringLength(20)]
    public string Role { get; init; } = string.Empty;

    [Required, Phone, StringLength(30)]
    public string PhoneNumber { get; init; } = string.Empty;
}
