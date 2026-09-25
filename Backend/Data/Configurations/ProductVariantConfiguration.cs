using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class ProductVariantConfiguration
        : IEntityTypeConfiguration<ProductVariant>
    {
        public void Configure(
            EntityTypeBuilder<ProductVariant> builder)
        {
            builder.ToTable("PRODUCT_VARIANT", "dbo");

            builder.HasKey(variant => variant.VariantId);

            builder.Property(variant => variant.VariantId)
                .HasColumnName("VariantID")
                .ValueGeneratedOnAdd();

            builder.Property(variant => variant.ProductId)
                .HasColumnName("ProductID")
                .IsRequired();

            builder.Property(variant => variant.Sku)
                .HasColumnName("SKU")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(variant => variant.VariantName)
                .HasColumnName("VariantName")
                .HasMaxLength(150);

            builder.Property(variant => variant.Size)
                .HasColumnName("Size")
                .HasMaxLength(50);

            builder.Property(variant => variant.Color)
                .HasColumnName("Color")
                .HasMaxLength(50);

            builder.Property(variant =>
                    variant.StorageCapacity)
                .HasColumnName("StorageCapacity")
                .HasMaxLength(50);

            builder.Property(variant => variant.Price)
                .HasColumnName("Price")
                .HasColumnType("decimal(12,2)")
                .IsRequired();

            builder.Property(variant => variant.CostPrice)
                .HasColumnName("CostPrice")
                .HasColumnType("decimal(12,2)")
                .IsRequired();

            builder.Property(variant =>
                    variant.StockQuantity)
                .HasColumnName("StockQuantity")
                .HasDefaultValue(0)
                .IsRequired();

            builder.Property(variant => variant.Status)
                .HasColumnName("Status")
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE")
                .IsRequired();

            builder.Property(variant => variant.CreatedDate)
                .HasColumnName("CreatedDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.Property(variant => variant.RowVersion)
                .HasColumnName("RowVersion")
                .IsRowVersion()
                .IsConcurrencyToken()
                .ValueGeneratedOnAddOrUpdate();

            builder.HasOne(variant => variant.Product)
                .WithMany()
                .HasForeignKey(variant => variant.ProductId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(variant => variant.Sku)
                .IsUnique()
                .HasDatabaseName("UQ_VARIANT_SKU");

            builder.HasIndex(variant => new
            {
                variant.ProductId,
                variant.Size,
                variant.Color,
                variant.StorageCapacity
            })
                .IsUnique()
                .HasDatabaseName("UQ_VARIANT_Options");

            builder.HasIndex(variant => new
            {
                variant.ProductId,
                variant.Status
            })
                .HasDatabaseName(
                    "IX_VARIANT_ProductStatus");
        }
    }
}
