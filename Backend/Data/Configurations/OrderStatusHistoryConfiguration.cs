using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class OrderStatusHistoryConfiguration : IEntityTypeConfiguration<OrderStatusHistory>
{
    public void Configure(EntityTypeBuilder<OrderStatusHistory> builder)
    {
        builder.ToTable("ORDER_STATUS_HISTORY", "dbo");
        builder.HasKey(x => x.OrderStatusHistoryId);
        builder.Property(x => x.OrderStatusHistoryId).HasColumnName("OrderStatusHistoryID").ValueGeneratedOnAdd();
        builder.Property(x => x.OrderId).HasColumnName("OrderID").IsRequired();
        builder.Property(x => x.OldStatus).HasMaxLength(20);
        builder.Property(x => x.NewStatus).HasMaxLength(20).IsRequired();
        builder.Property(x => x.ChangedDate).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()").ValueGeneratedOnAdd();
        builder.Property(x => x.ChangedByUserId).HasColumnName("ChangedByUserID");
        builder.Property(x => x.ChangeNote).HasMaxLength(500);
        builder.HasOne(x => x.CustomerOrder).WithMany(x => x.OrderStatusHistories).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne(x => x.ChangedByUser).WithMany().HasForeignKey(x => x.ChangedByUserId).OnDelete(DeleteBehavior.NoAction);
    }
}
