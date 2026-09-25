using System.Security.Cryptography;
using System.Text;

namespace Shopera.Common.Security;

public static class JwtSecurityStamp
{
    public const string ClaimType = "shopera:security_stamp";

    public static string Create(string passwordHash, string signingKey)
    {
        using var hmac = new HMACSHA256(
            Encoding.UTF8.GetBytes(signingKey));

        byte[] stamp = hmac.ComputeHash(
            Encoding.UTF8.GetBytes(passwordHash ?? string.Empty));

        return Convert.ToHexString(stamp);
    }

    public static bool Matches(
        string? tokenStamp,
        string passwordHash,
        string signingKey)
    {
        if (string.IsNullOrWhiteSpace(tokenStamp))
        {
            return false;
        }

        byte[] provided;
        try
        {
            provided = Convert.FromHexString(tokenStamp);
        }
        catch (FormatException)
        {
            return false;
        }

        byte[] expected;
        using (var hmac = new HMACSHA256(
            Encoding.UTF8.GetBytes(signingKey)))
        {
            expected = hmac.ComputeHash(
                Encoding.UTF8.GetBytes(passwordHash ?? string.Empty));
        }

        return provided.Length == expected.Length &&
            CryptographicOperations.FixedTimeEquals(provided, expected);
    }
}
