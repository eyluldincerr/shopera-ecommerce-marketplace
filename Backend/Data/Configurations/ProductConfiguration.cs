using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class ProductConfiguration
        : IEntityTypeConfiguration<Product>
    {
        public void Configure(EntityTypeBuilder<Product> builder)
        {
            builder.ToTable("PRODUCT", "dbo");

            builder.HasKey(product => product.ProductId);

            builder.Property(product => product.ProductId)
                .HasColumnName("ProductID")
                .ValueGeneratedOnAdd();

            builder.Property(product => product.ProductName)
                .HasColumnName("ProductName")
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(product =>
                    product.ShortDescription)
                .HasColumnName("ShortDescription")
                .HasMaxLength(500);

            builder.Property(product => product.Description)
                .HasColumnName("Description");

            builder.Property(product => product.Brand)
                .HasColumnName("Brand")
                .HasMaxLength(100);

            builder.Property(product => product.ModelNumber)
                .HasColumnName("ModelNumber")
                .HasMaxLength(100);

            builder.Property(product =>
                    product.ProductCondition)
                .HasColumnName("ProductCondition")
                .HasMaxLength(20)
                .HasDefaultValue("NEW")
                .IsRequired();

            builder.Property(product =>
                    product.ConditionDescription)
                .HasColumnName("ConditionDescription")
                .HasMaxLength(500);

            builder.Property(product => product.Status)
                .HasColumnName("Status")
                .HasMaxLength(20)
                .HasDefaultValue("DRAFT")
                .IsRequired();

            builder.Property(product => product.CreatedDate)
                .HasColumnName("CreatedDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.Property(product => product.StoreId)
                .HasColumnName("StoreID")
                .IsRequired();

            builder.Property(product => product.CategoryId)
                .HasColumnName("CategoryID")
                .IsRequired();

            builder.HasOne<Store>()
                .WithMany()
                .HasForeignKey(product => product.StoreId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasOne<Category>()
                .WithMany()
                .HasForeignKey(product => product.CategoryId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(product => new
            {
                product.StoreId,
                product.Status
            })
                .HasDatabaseName("IX_PRODUCT_StoreStatus");

            builder.HasIndex(product => new
            {
                product.CategoryId,
                product.Status
            })
                .HasDatabaseName(
                    "IX_PRODUCT_CategoryStatus");
        }
    }
}
