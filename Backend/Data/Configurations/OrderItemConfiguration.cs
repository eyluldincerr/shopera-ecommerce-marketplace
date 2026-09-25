using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class OrderItemConfiguration
        : IEntityTypeConfiguration<OrderItem>
    {
        public void Configure(EntityTypeBuilder<OrderItem> builder)
        {
            builder.ToTable("ORDER_ITEM", "dbo");

            builder.HasKey(item => item.OrderItemId);

            builder.Property(item => item.OrderItemId)
                .HasColumnName("OrderItemID")
                .ValueGeneratedOnAdd();

            builder.Property(item => item.OrderId)
                .HasColumnName("OrderID")
                .IsRequired();

            builder.Property(item => item.VariantId)
                .HasColumnName("VariantID")
                .IsRequired();

            builder.Property(item => item.ProductNameAtPurchase).HasMaxLength(200).IsRequired();
            builder.Property(item => item.SkuAtPurchase).HasColumnName("SKUAtPurchase").HasMaxLength(100).IsRequired();
            builder.Property(item => item.VariantNameAtPurchase).HasMaxLength(150);
            builder.Property(item => item.Quantity).IsRequired();
            builder.Property(item => item.UnitPriceAtPurchase).HasColumnType("decimal(12,2)").IsRequired();
            builder.Property(item => item.UnitCostAtPurchase).HasColumnType("decimal(12,2)").IsRequired();
            builder.HasIndex(item => new { item.OrderId, item.VariantId }).IsUnique().HasDatabaseName("UQ_ORDER_ITEM_Order_Variant");

            builder.HasOne(item => item.CustomerOrder)
                .WithMany(order => order.OrderItems)
                .HasForeignKey(item => item.OrderId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasOne(item => item.ProductVariant)
                .WithMany(variant => variant.OrderItems)
                .HasForeignKey(item => item.VariantId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
