using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class OrderAddressConfiguration : IEntityTypeConfiguration<OrderAddress>
{
    public void Configure(EntityTypeBuilder<OrderAddress> builder)
    {
        builder.ToTable("ORDER_ADDRESS", "dbo");
        builder.HasKey(x => x.OrderAddressId);
        builder.Property(x => x.OrderAddressId).HasColumnName("OrderAddressID").ValueGeneratedOnAdd();
        builder.Property(x => x.OrderId).HasColumnName("OrderID").IsRequired();
        builder.Property(x => x.AddressType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.RecipientName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.RecipientPhone).HasMaxLength(30);
        builder.Property(x => x.StreetAddress).HasMaxLength(255).IsRequired();
        builder.Property(x => x.City).HasMaxLength(100).IsRequired();
        builder.Property(x => x.StateProvince).HasMaxLength(100);
        builder.Property(x => x.PostalCode).HasMaxLength(30);
        builder.Property(x => x.Country).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => new { x.OrderId, x.AddressType }).IsUnique().HasDatabaseName("UQ_ORDER_ADDRESS_Order_AddressType");
        builder.HasOne(x => x.CustomerOrder).WithMany(x => x.OrderAddresses).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.NoAction);
    }
}
