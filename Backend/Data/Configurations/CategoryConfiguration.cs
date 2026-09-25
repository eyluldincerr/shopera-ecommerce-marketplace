using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class CategoryConfiguration
        : IEntityTypeConfiguration<Category>
    {
        public void Configure(
            EntityTypeBuilder<Category> builder)
        {
            builder.ToTable("CATEGORY", "dbo");

            builder.HasKey(category => category.CategoryId);

            builder.Property(category => category.CategoryId)
                .HasColumnName("CategoryID")
                .ValueGeneratedOnAdd();

            builder.Property(category => category.CategoryName)
                .HasColumnName("CategoryName")
                .HasMaxLength(150)
                .IsRequired();

            builder.Property(category => category.Description)
                .HasColumnName("Description")
                .HasMaxLength(1000);

            builder.Property(category =>
                    category.ParentCategoryId)
                .HasColumnName("ParentCategoryID");

            builder.Property(category =>
                    category.ManagedByAdminUserId)
                .HasColumnName("ManagedByAdminUserID")
                .IsRequired();

            builder.Property(category =>
                    category.CategoryImageData)
                .HasColumnName("CategoryImageData")
                .HasColumnType("varbinary(max)");

            builder.Property(category =>
                    category.CategoryImageContentType)
                .HasColumnName("CategoryImageContentType")
                .HasMaxLength(50);

            builder.HasOne<Category>()
                .WithMany()
                .HasForeignKey(category =>
                    category.ParentCategoryId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(category => new
            {
                category.ParentCategoryId,
                category.CategoryName
            })
                .IsUnique()
                .HasDatabaseName(
                    "UQ_CATEGORY_ParentName");

            builder.HasIndex(category =>
                    category.ParentCategoryId)
                .HasDatabaseName("IX_CATEGORY_Parent");
        }
    }
}
