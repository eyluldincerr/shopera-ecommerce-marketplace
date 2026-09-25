using Shopera.Domain.Entities;

namespace Shopera.Features.Identity.Authentication.Contracts;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) Create(UserAccount user);
}
