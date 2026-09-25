using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class CartItemConfiguration : IEntityTypeConfiguration<CartItem>
{
    public void Configure(EntityTypeBuilder<CartItem> builder)
    {
        builder.ToTable("CART_ITEM", "dbo");
        builder.HasKey(x => x.CartItemId);
        builder.Property(x => x.CartItemId).HasColumnName("CartItemID").ValueGeneratedOnAdd();
        builder.Property(x => x.CartId).HasColumnName("CartID").IsRequired();
        builder.Property(x => x.VariantId).HasColumnName("VariantID").IsRequired();
        builder.Property(x => x.Quantity).IsRequired();
        builder.Property(x => x.UnitPriceAtAdd).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.AddedDate).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()").ValueGeneratedOnAdd();
        builder.HasIndex(x => new { x.CartId, x.VariantId }).IsUnique().HasDatabaseName("UQ_CART_ITEM_Cart_Variant");
        builder.HasOne(x => x.Cart).WithMany(x => x.CartItems).HasForeignKey(x => x.CartId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne(x => x.ProductVariant).WithMany(x => x.CartItems).HasForeignKey(x => x.VariantId).OnDelete(DeleteBehavior.NoAction);
    }
}
