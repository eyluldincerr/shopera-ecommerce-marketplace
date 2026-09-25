using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class StoreConfiguration
        : IEntityTypeConfiguration<Store>
    {
        public void Configure(EntityTypeBuilder<Store> builder)
        {
            builder.ToTable("STORE", "dbo");

            builder.HasKey(store => store.StoreId);

            builder.Property(store => store.StoreId)
                .HasColumnName("StoreID")
                .ValueGeneratedOnAdd();

            builder.Property(store => store.SellerUserId)
                .HasColumnName("SellerUserID")
                .IsRequired();

            builder.Property(store => store.StoreName)
                .HasColumnName("StoreName")
                .HasMaxLength(150)
                .IsRequired();

            builder.Property(store => store.StoreSlug)
                .HasColumnName("StoreSlug")
                .HasMaxLength(150);

            builder.Property(store => store.StoreDescription)
                .HasColumnName("StoreDescription")
                .HasMaxLength(1000);

            builder.Property(store => store.StoreLogoUrl)
                .HasColumnName("StoreLogoURL")
                .HasMaxLength(1000);

            builder.Property(store => store.StoreBannerUrl)
                .HasColumnName("StoreBannerURL")
                .HasMaxLength(1000);

            builder.Property(store => store.SupportEmail)
                .HasColumnName("SupportEmail")
                .HasMaxLength(255);

            builder.Property(store => store.SupportPhone)
                .HasColumnName("SupportPhone")
                .HasMaxLength(30);

            builder.Property(store => store.ReturnPolicy)
                .HasColumnName("ReturnPolicy");

            builder.Property(store => store.SupportPolicy)
                .HasColumnName("SupportPolicy");

            builder.Property(store => store.ApprovalStatus)
                .HasColumnName("ApprovalStatus")
                .HasMaxLength(20)
                .HasDefaultValue("PENDING")
                .IsRequired();

            builder.Property(store => store.ApprovedByAdminUserId)
                .HasColumnName("ApprovedByAdminUserID");

            builder.Property(store => store.CreatedDate)
                .HasColumnName("CreatedDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.Property(store => store.UpdatedDate)
                .HasColumnName("UpdatedDate")
                .HasColumnType("datetime2(0)");

            builder.Property(store => store.StoreStatus)
                .HasColumnName("StoreStatus")
                .HasMaxLength(20)
                .HasDefaultValue("ACTIVE")
                .IsRequired();

            builder.HasIndex(store => store.SellerUserId)
                .IsUnique()
                .HasDatabaseName("UQ_STORE_Seller");

            builder.HasIndex(store => store.StoreName)
                .IsUnique()
                .HasDatabaseName("UQ_STORE_Name");

            builder.HasIndex(store => store.StoreSlug)
                .IsUnique()
                .HasFilter("[StoreSlug] IS NOT NULL")
                .HasDatabaseName("UX_STORE_Slug_NotNull");

            builder.HasIndex(store =>
                    store.ApprovedByAdminUserId)
                .HasDatabaseName("IX_STORE_Admin");
        }
    }
}
