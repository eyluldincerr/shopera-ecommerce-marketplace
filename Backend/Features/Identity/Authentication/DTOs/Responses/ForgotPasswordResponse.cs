using System.Text.Json.Serialization;

namespace Shopera.Features.Identity.Authentication.DTOs.Responses;

public sealed class ForgotPasswordResponse
{
    public string Message { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DevelopmentResetToken { get; init; }
}
