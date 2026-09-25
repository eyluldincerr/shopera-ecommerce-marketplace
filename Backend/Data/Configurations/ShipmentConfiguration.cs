using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("SHIPMENT", "dbo");
        builder.HasKey(x => x.ShipmentId);
        builder.Property(x => x.ShipmentId).HasColumnName("ShipmentID").ValueGeneratedOnAdd();
        builder.Property(x => x.OrderId).HasColumnName("OrderID").IsRequired();
        builder.Property(x => x.CourierName).HasMaxLength(150);
        builder.Property(x => x.TrackingNumber).HasMaxLength(150);
        builder.Property(x => x.ShipmentStatus).HasMaxLength(30).IsRequired();
        builder.Property(x => x.ShippedDate).HasColumnType("datetime2(0)");
        builder.Property(x => x.DeliveredDate).HasColumnType("datetime2(0)");
        builder.Property(x => x.ShippingCost).HasColumnType("decimal(12,2)").HasDefaultValue(0m).IsRequired();
        builder.HasIndex(x => x.TrackingNumber).IsUnique().HasFilter("[TrackingNumber] IS NOT NULL");
        builder.HasOne(x => x.CustomerOrder).WithMany(x => x.Shipments).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.NoAction);
    }
}
