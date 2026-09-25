using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class CouponConfiguration : IEntityTypeConfiguration<Coupon>
{
    public void Configure(EntityTypeBuilder<Coupon> builder)
    {
        builder.ToTable("COUPON", "dbo");
        builder.HasKey(x => x.CouponId);
        builder.Property(x => x.CouponId).HasColumnName("CouponID").ValueGeneratedOnAdd();
        builder.Property(x => x.CouponCode).HasMaxLength(50).IsRequired();
        builder.Property(x => x.DiscountType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.DiscountValue).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.ExpiryDate).HasColumnType("datetime2(0)").IsRequired();
        builder.Property(x => x.MinPurchaseAmount).HasColumnType("decimal(12,2)").HasDefaultValue(0m).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue(CouponStatuses.Active).IsRequired();
        builder.HasIndex(x => x.CouponCode).IsUnique().HasDatabaseName("UQ_COUPON_CouponCode");
    }
}
