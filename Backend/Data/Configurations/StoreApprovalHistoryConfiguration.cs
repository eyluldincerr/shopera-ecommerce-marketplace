using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class StoreApprovalHistoryConfiguration
        : IEntityTypeConfiguration<StoreApprovalHistory>
    {
        public void Configure(
            EntityTypeBuilder<StoreApprovalHistory> builder)
        {
            builder.ToTable("STORE_APPROVAL_HISTORY", "dbo");

            builder.HasKey(history =>
                history.StoreApprovalHistoryId);

            builder.Property(history =>
                    history.StoreApprovalHistoryId)
                .HasColumnName("StoreApprovalHistoryID")
                .ValueGeneratedOnAdd();

            builder.Property(history => history.StoreId)
                .HasColumnName("StoreID")
                .IsRequired();

            builder.Property(history => history.OldStatus)
                .HasColumnName("OldStatus")
                .HasMaxLength(20);

            builder.Property(history => history.NewStatus)
                .HasColumnName("NewStatus")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(history =>
                    history.ChangedByAdminUserId)
                .HasColumnName("ChangedByAdminUserID")
                .IsRequired();

            builder.Property(history => history.ChangedDate)
                .HasColumnName("ChangedDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.Property(history => history.DecisionNote)
                .HasColumnName("DecisionNote")
                .HasMaxLength(500);

            builder.HasIndex(history => new
            {
                history.StoreId,
                history.ChangedDate
            })
                .HasDatabaseName(
                    "IX_STORE_APPROVAL_StoreDate");
        }
    }
}
