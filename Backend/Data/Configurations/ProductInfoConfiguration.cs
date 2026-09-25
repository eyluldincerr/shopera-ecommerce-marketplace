using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class ProductInfoConfiguration
        : IEntityTypeConfiguration<ProductInfo>
    {
        public void Configure(
            EntityTypeBuilder<ProductInfo> builder)
        {
            builder.ToTable("PRODUCT_INFO", "dbo");

            builder.HasKey(info => info.ProductInfoId);

            builder.Property(info => info.ProductInfoId)
                .HasColumnName("ProductInfoID")
                .ValueGeneratedOnAdd();

            builder.Property(info => info.ProductId)
                .HasColumnName("ProductID")
                .IsRequired();

            builder.Property(info => info.ProductDetails)
                .HasColumnName("ProductDetails");

            builder.Property(info => info.Specifications)
                .HasColumnName("Specifications");

            builder.Property(info => info.WhatsInTheBox)
                .HasColumnName("WhatsInTheBox");

            builder.Property(info =>
                    info.WarrantyInformation)
                .HasColumnName("WarrantyInformation");

            builder.Property(info => info.ReturnPolicy)
                .HasColumnName("ReturnPolicy");

            builder.Property(info => info.CareInstructions)
                .HasColumnName("CareInstructions");

            builder.Property(info =>
                    info.AdditionalInformation)
                .HasColumnName("AdditionalInformation");

            builder.Property(info => info.CreatedDate)
                .HasColumnName("CreatedDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.Property(info => info.UpdatedDate)
                .HasColumnName("UpdatedDate")
                .HasColumnType("datetime2(0)");

            builder.HasOne<Product>()
                .WithOne()
                .HasForeignKey<ProductInfo>(
                    info => info.ProductId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(info => info.ProductId)
                .IsUnique()
                .HasDatabaseName(
                    "UQ_PRODUCT_INFO_Product");
        }
    }
}
