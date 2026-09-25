using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class PasswordResetTokenConfiguration
    : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(
        EntityTypeBuilder<PasswordResetToken> builder)
    {
        builder.ToTable("PASSWORD_RESET_TOKEN", "dbo");

        builder.HasKey(token => token.PasswordResetTokenId);

        builder.Property(token => token.PasswordResetTokenId)
            .HasColumnName("PasswordResetTokenID")
            .ValueGeneratedOnAdd();

        builder.Property(token => token.UserId)
            .HasColumnName("UserID")
            .IsRequired();

        builder.Property(token => token.TokenHash)
            .HasColumnName("TokenHash")
            .HasMaxLength(64)
            .IsUnicode(false)
            .IsRequired();

        builder.Property(token => token.CreatedAt)
            .HasColumnName("CreatedAt")
            .HasColumnType("datetime2(0)")
            .IsRequired();

        builder.Property(token => token.ExpiresAt)
            .HasColumnName("ExpiresAt")
            .HasColumnType("datetime2(0)")
            .IsRequired();

        builder.Property(token => token.UsedAt)
            .HasColumnName("UsedAt")
            .HasColumnType("datetime2(0)");

        builder.Property(token => token.RowVersion)
            .HasColumnName("RowVersion")
            .IsRowVersion();

        builder.HasIndex(token => token.TokenHash)
            .IsUnique();

        builder.HasIndex(token => new
        {
            token.UserId,
            token.ExpiresAt
        });

        builder.HasOne<UserAccount>()
            .WithMany()
            .HasForeignKey(token => token.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
