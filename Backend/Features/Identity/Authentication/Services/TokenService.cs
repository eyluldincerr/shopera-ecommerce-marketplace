using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Shopera.Configuration;
using Shopera.Common.Security;
using Shopera.Domain.Entities;
using Shopera.Features.Identity.Authentication.Contracts;

namespace Shopera.Features.Identity.Authentication.Services;

public sealed class TokenService : ITokenService
{
    private readonly JwtSettings _settings;

    public TokenService(IOptions<JwtSettings> options)
    {
        _settings = options.Value;
    }

    public (string Token, DateTime ExpiresAt) Create(UserAccount user)
    {
        if (_settings.Key.Length < 32)
        {
            throw new InvalidOperationException("Jwt:Key must contain at least 32 characters.");
        }

        DateTime expiresAt = DateTime.UtcNow.AddMinutes(_settings.DurationInMinutes);
        Claim[] claims =
        [
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
            new(
                JwtSecurityStamp.ClaimType,
                JwtSecurityStamp.Create(user.PasswordHash, _settings.Key)),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        ];

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            _settings.Issuer,
            _settings.Audience,
            claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
