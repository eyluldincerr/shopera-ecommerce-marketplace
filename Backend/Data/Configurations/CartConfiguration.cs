using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations;

public sealed class CartConfiguration : IEntityTypeConfiguration<Cart>
{
    public void Configure(EntityTypeBuilder<Cart> builder)
    {
        builder.ToTable("CART", "dbo");
        builder.HasKey(x => x.CartId);
        builder.Property(x => x.CartId).HasColumnName("CartID").ValueGeneratedOnAdd();
        builder.Property(x => x.BuyerUserId).HasColumnName("BuyerUserID").IsRequired();
        builder.Property(x => x.CreatedDate).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()").ValueGeneratedOnAdd();
        builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue(CartStatuses.Active).IsRequired();
        builder.HasIndex(x => x.BuyerUserId).IsUnique().HasDatabaseName("UX_CART_OneActiveCartPerBuyer").HasFilter("[Status] = N'ACTIVE'");
        builder.HasOne(x => x.BuyerUser).WithMany().HasForeignKey(x => x.BuyerUserId).OnDelete(DeleteBehavior.NoAction);
    }
}
