using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class BuyerAddressConfiguration
        : IEntityTypeConfiguration<BuyerAddress>
    {
        public void Configure(
            EntityTypeBuilder<BuyerAddress> builder)
        {
            builder.ToTable("BUYER_ADDRESS", "dbo");

            builder.HasKey(address => address.AddressId);

            builder.Property(address => address.AddressId)
                .HasColumnName("AddressID")
                .ValueGeneratedOnAdd();

            builder.Property(address => address.BuyerUserId)
                .HasColumnName("BuyerUserID")
                .IsRequired();

            builder.Property(address => address.AddressLabel)
                .HasColumnName("AddressLabel")
                .HasMaxLength(50);

            builder.Property(address => address.StreetAddress)
                .HasColumnName("StreetAddress")
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(address => address.City)
                .HasColumnName("City")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(address => address.StateProvince)
                .HasColumnName("StateProvince")
                .HasMaxLength(100);

            builder.Property(address => address.PostalCode)
                .HasColumnName("PostalCode")
                .HasMaxLength(30);

            builder.Property(address => address.Country)
                .HasColumnName("Country")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(address =>
                    address.IsDefaultShipping)
                .HasColumnName("IsDefaultShipping")
                .HasDefaultValue(false)
                .IsRequired();

            builder.Property(address =>
                    address.IsDefaultBilling)
                .HasColumnName("IsDefaultBilling")
                .HasDefaultValue(false)
                .IsRequired();

            builder.HasIndex(address => new
            {
                address.BuyerUserId,
                address.StreetAddress,
                address.City,
                address.PostalCode,
                address.Country
            })
                .IsUnique()
                .HasDatabaseName("UQ_ADDRESS_Duplicate");

            builder.HasIndex(
                    address => address.BuyerUserId,
                    "IX_ADDRESS_Buyer")
                .HasDatabaseName("IX_ADDRESS_Buyer");

            builder.HasIndex(
                    address => address.BuyerUserId,
                    "UX_ADDRESS_OneDefaultShipping")
                .IsUnique()
                .HasFilter("[IsDefaultShipping] = 1")
                .HasDatabaseName(
                    "UX_ADDRESS_OneDefaultShipping");

            builder.HasIndex(
                    address => address.BuyerUserId,
                    "UX_ADDRESS_OneDefaultBilling")
                .IsUnique()
                .HasFilter("[IsDefaultBilling] = 1")
                .HasDatabaseName(
                    "UX_ADDRESS_OneDefaultBilling");
        }
    }
}
