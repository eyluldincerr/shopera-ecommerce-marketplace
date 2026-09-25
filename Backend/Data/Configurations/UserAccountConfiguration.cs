using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class UserAccountConfiguration
        : IEntityTypeConfiguration<UserAccount>
    {
        public void Configure(EntityTypeBuilder<UserAccount> builder)
        {
            builder.ToTable("USER_ACCOUNT", "dbo");

            builder.HasKey(user => user.UserId);

            builder.Property(user => user.UserId)
                .HasColumnName("UserID")
                .ValueGeneratedOnAdd();

            builder.Property(user => user.FullName)
                .HasColumnName("FullName")
                .HasMaxLength(150)
                .IsRequired();

            builder.Property(user => user.Email)
                .HasColumnName("Email")
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(user => user.PasswordHash)
                .HasColumnName("PasswordHash")
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(user => user.PhoneNumber)
                .HasColumnName("PhoneNumber")
                .HasMaxLength(30);

            builder.Property(user => user.RegistrationDate)
                .HasColumnName("RegistrationDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.Property(user => user.Role)
                .HasColumnName("Role")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(user => user.AccountStatus)
                .HasColumnName("AccountStatus")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(user => user.PermissionLevel)
                .HasColumnName("PermissionLevel")
                .HasMaxLength(50);

            builder.HasIndex(user => user.Email)
                .IsUnique();
        }
    }
}
