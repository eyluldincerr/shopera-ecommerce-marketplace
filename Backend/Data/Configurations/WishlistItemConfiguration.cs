using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class WishlistItemConfiguration
    : IEntityTypeConfiguration<WishlistItem>
{
    public void Configure(EntityTypeBuilder<WishlistItem> builder)
    {
        builder.ToTable("WISHLIST_ITEM", "dbo");

        builder.HasKey(item => item.WishlistItemId);

        builder.Property(item => item.WishlistItemId)
            .HasColumnName("WishlistItemID")
            .ValueGeneratedOnAdd();

        builder.Property(item => item.WishlistId)
            .HasColumnName("WishlistID")
            .IsRequired();

        builder.Property(item => item.VariantId)
            .HasColumnName("VariantID")
            .IsRequired();

        builder.Property(item => item.AddedDate)
            .HasColumnName("AddedDate")
            .HasColumnType("datetime2(0)")
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAdd();

        builder.HasIndex(item => new
        {
            item.WishlistId,
            item.VariantId
        })
            .IsUnique()
            .HasDatabaseName("UQ_WISHLIST_ITEM_Variant");

        builder.HasOne(item => item.Wishlist)
            .WithMany(wishlist => wishlist.WishlistItems)
            .HasForeignKey(item => item.WishlistId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(item => item.ProductVariant)
            .WithMany()
            .HasForeignKey(item => item.VariantId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
