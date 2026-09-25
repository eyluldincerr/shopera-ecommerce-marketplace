using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class OrderSellerFinancialConfiguration : IEntityTypeConfiguration<OrderSellerFinancial>
{
    public void Configure(EntityTypeBuilder<OrderSellerFinancial> builder)
    {
        builder.ToTable("ORDER_SELLER_FINANCIAL", "dbo");
        builder.HasKey(x => x.OrderSellerFinancialId);
        builder.Property(x => x.OrderSellerFinancialId).HasColumnName("OrderSellerFinancialID").ValueGeneratedOnAdd();
        builder.Property(x => x.OrderId).HasColumnName("OrderID").IsRequired();
        builder.Property(x => x.GrossSalesAmount).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.SellerDiscountAmount).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.CommissionAmount).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.RefundAmount).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.CostOfGoodsAmount).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.SellerNetAmount).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.EstimatedProfitAmount).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnType("char(3)").IsRequired();
        builder.Property(x => x.CalculatedDate).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.OrderId).IsUnique();
        builder.HasOne(x => x.CustomerOrder).WithOne(x => x.OrderSellerFinancial).HasForeignKey<OrderSellerFinancial>(x => x.OrderId).OnDelete(DeleteBehavior.NoAction);
    }
}
