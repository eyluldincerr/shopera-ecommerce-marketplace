using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;
using StoreMediaEntity = Shopera.Features.StoreMedia.Models.StoreMedia;

namespace Shopera.Features.StoreMedia.Configurations
{
    public sealed class StoreMediaConfiguration
        : IEntityTypeConfiguration<StoreMediaEntity>
    {
        public void Configure(EntityTypeBuilder<StoreMediaEntity> builder)
        {
            builder.ToTable("STORE_MEDIA", "dbo");

            builder.HasKey(item => item.StoreMediaId);

            builder.Property(item => item.StoreMediaId)
                .HasColumnName("StoreMediaID")
                .ValueGeneratedOnAdd();

            builder.Property(item => item.StoreId)
                .HasColumnName("StoreID")
                .IsRequired();

            builder.Property(item => item.Title)
                .HasColumnName("Title")
                .HasMaxLength(120)
                .IsRequired();

            builder.Property(item => item.Placement)
                .HasColumnName("Placement")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(item => item.Platform)
                .HasColumnName("Platform")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(item => item.ExternalUrl)
                .HasColumnName("ExternalURL")
                .HasMaxLength(1000)
                .IsRequired();

            builder.Property(item => item.ExternalVideoId)
                .HasColumnName("ExternalVideoID")
                .HasMaxLength(200);

            builder.Property(item => item.CreatedDate)
                .HasColumnName("CreatedDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.Property(item => item.ExpiresAt)
                .HasColumnName("ExpiresAt")
                .HasColumnType("datetime2(0)");

            builder.Property(item => item.IsActive)
                .HasColumnName("IsActive")
                .HasDefaultValue(true)
                .IsRequired();

            builder.Property(item => item.RemovedDate)
                .HasColumnName("RemovedDate")
                .HasColumnType("datetime2(0)");

            builder.HasOne<Store>()
                .WithMany()
                .HasForeignKey(item => item.StoreId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_STORE_MEDIA_STORE");

            builder.HasIndex(item => new
                {
                    item.StoreId,
                    item.Placement,
                    item.IsActive,
                    item.ExpiresAt
                })
                .HasDatabaseName("IX_STORE_MEDIA_PublicLookup");

            builder.HasIndex(item => item.CreatedDate)
                .HasDatabaseName("IX_STORE_MEDIA_CreatedDate");
        }
    }
}
