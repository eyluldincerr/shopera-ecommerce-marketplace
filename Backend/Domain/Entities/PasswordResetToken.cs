namespace Shopera.Domain.Entities;

public sealed class PasswordResetToken
{
    public int PasswordResetTokenId { get; set; }

    public int UserId { get; set; }

    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? UsedAt { get; set; }

    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
