using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class WishlistConfiguration
    : IEntityTypeConfiguration<Wishlist>
{
    public void Configure(EntityTypeBuilder<Wishlist> builder)
    {
        builder.ToTable("WISHLIST", "dbo");

        builder.HasKey(wishlist => wishlist.WishlistId);

        builder.Property(wishlist => wishlist.WishlistId)
            .HasColumnName("WishlistID")
            .ValueGeneratedOnAdd();

        builder.Property(wishlist => wishlist.BuyerUserId)
            .HasColumnName("BuyerUserID")
            .IsRequired();

        builder.Property(wishlist => wishlist.CreatedDate)
            .HasColumnName("CreatedDate")
            .HasColumnType("datetime2(0)")
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAdd();

        builder.HasIndex(wishlist => wishlist.BuyerUserId)
            .IsUnique()
            .HasDatabaseName("UQ_WISHLIST_Buyer");

        builder.HasOne(wishlist => wishlist.BuyerUser)
            .WithMany()
            .HasForeignKey(wishlist => wishlist.BuyerUserId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
