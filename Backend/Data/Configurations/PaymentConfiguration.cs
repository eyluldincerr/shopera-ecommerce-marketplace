using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("PAYMENT", "dbo");
        builder.HasKey(x => x.PaymentId);
        builder.Property(x => x.PaymentId).HasColumnName("PaymentID").ValueGeneratedOnAdd();
        builder.Property(x => x.OrderId).HasColumnName("OrderID").IsRequired();
        builder.Property(x => x.PaymentDate).HasColumnType("datetime2(0)");
        builder.Property(x => x.CreatedDate).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()").ValueGeneratedOnAdd();
        builder.Property(x => x.Amount).HasColumnType("decimal(12,2)").IsRequired();
        builder.Property(x => x.PaymentMethod).HasMaxLength(30).IsRequired();
        builder.Property(x => x.PaymentStatus).HasMaxLength(30).IsRequired();
        builder.Property(x => x.TransactionReference).HasMaxLength(150);
        builder.HasIndex(x => x.TransactionReference).IsUnique().HasFilter("[TransactionReference] IS NOT NULL");
        builder.HasOne(x => x.CustomerOrder).WithMany(x => x.Payments).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.NoAction);
    }
}
