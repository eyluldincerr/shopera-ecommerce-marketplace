using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;
using Shopera.Domain.Constants;

namespace Shopera.Data.Configurations
{
    public sealed class CustomerOrderConfiguration
        : IEntityTypeConfiguration<CustomerOrder>
    {
        public void Configure(
            EntityTypeBuilder<CustomerOrder> builder)
        {
            builder.ToTable("CUSTOMER_ORDER", "dbo");

            builder.HasKey(order => order.OrderId);

            builder.Property(order => order.OrderId)
                .HasColumnName("OrderID")
                .ValueGeneratedOnAdd();

            builder.Property(order => order.BuyerUserId)
                .HasColumnName("BuyerUserID")
                .IsRequired();

            builder.Property(order => order.OrderNumber).HasMaxLength(30).IsRequired();
            builder.Property(order => order.StoreId).HasColumnName("StoreID").IsRequired();
            builder.Property(order => order.CouponId).HasColumnName("CouponID");
            builder.Property(order => order.OrderDate).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()").ValueGeneratedOnAdd();

            builder.Property(order => order.OrderStatus)
                .HasColumnName("OrderStatus")
                .HasMaxLength(20)
                .HasDefaultValue(OrderStatuses.Pending)
                .IsRequired();

            builder.Property(order => order.SubtotalAmount).HasColumnType("decimal(12,2)").IsRequired();
            builder.Property(order => order.DiscountAmount).HasColumnType("decimal(12,2)").HasDefaultValue(0m).IsRequired();
            builder.Property(order => order.ShippingAmount).HasColumnType("decimal(12,2)").HasDefaultValue(0m).IsRequired();
            builder.Property(order => order.TotalAmount).HasColumnType("decimal(12,2)").IsRequired();
            builder.Property(order => order.CurrencyCode).HasColumnType("char(3)").HasDefaultValue("EUR").IsRequired();
            builder.Property(order => order.BuyerArchivedDate)
                .HasColumnName("BuyerArchivedDate")
                .HasColumnType("datetime2(0)");

            builder.HasIndex(order => order.OrderNumber).IsUnique().HasDatabaseName("UQ_ORDER_Number");
            builder.HasOne(order => order.BuyerUser).WithMany().HasForeignKey(order => order.BuyerUserId).OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(order => order.Coupon).WithMany(coupon => coupon.CustomerOrders).HasForeignKey(order => order.CouponId).OnDelete(DeleteBehavior.NoAction);
        }
    }
}
