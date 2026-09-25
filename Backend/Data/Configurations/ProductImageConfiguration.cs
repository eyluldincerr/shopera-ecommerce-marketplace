using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class ProductImageConfiguration
        : IEntityTypeConfiguration<ProductImage>
    {
        public void Configure(
            EntityTypeBuilder<ProductImage> builder)
        {
            builder.ToTable("PRODUCT_IMAGE", "dbo");

            builder.HasKey(image => image.ImageId);

            builder.Property(image => image.ImageId)
                .HasColumnName("ImageID")
                .ValueGeneratedOnAdd();

            builder.Property(image => image.ProductId)
                .HasColumnName("ProductID")
                .IsRequired();

            builder.Property(image => image.ImageData)
                .HasColumnName("ImageData")
                .HasColumnType("varbinary(max)")
                .IsRequired();

            builder.Property(image => image.ContentType)
                .HasColumnName("ContentType")
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(image => image.OriginalFileName)
                .HasColumnName("OriginalFileName")
                .HasMaxLength(255);

            builder.Property(image => image.AltText)
                .HasColumnName("AltText")
                .HasMaxLength(255);

            builder.Property(image => image.DisplayOrder)
                .HasColumnName("DisplayOrder")
                .IsRequired();

            builder.Property(image => image.IsPrimary)
                .HasColumnName("IsPrimary")
                .HasDefaultValue(false)
                .IsRequired();

            builder.Property(image => image.CreatedDate)
                .HasColumnName("CreatedDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.HasOne<Product>()
                .WithMany(product => product.Images)
                .HasForeignKey(image => image.ProductId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(image => new
            {
                image.ProductId,
                image.DisplayOrder
            })
                .IsUnique()
                .HasDatabaseName(
                    "UQ_PRODUCT_IMAGE_Order");

            builder.HasIndex(
                    image => image.ProductId,
                    "IX_PRODUCT_IMAGE_Product")
                .HasDatabaseName(
                    "IX_PRODUCT_IMAGE_Product");

            builder.HasIndex(
                    image => image.ProductId,
                    "UX_PRODUCT_IMAGE_OnePrimary")
                .IsUnique()
                .HasFilter("[IsPrimary] = 1")
                .HasDatabaseName(
                    "UX_PRODUCT_IMAGE_OnePrimary");
        }
    }
}
