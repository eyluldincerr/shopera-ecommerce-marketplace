using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class NotificationConfiguration
        : IEntityTypeConfiguration<Notification>
    {
        public void Configure(
            EntityTypeBuilder<Notification> builder)
        {
            builder.ToTable("NOTIFICATION", "dbo");

            builder.HasKey(notification =>
                notification.NotificationId);

            builder.Property(notification =>
                    notification.NotificationId)
                .HasColumnName("NotificationID")
                .ValueGeneratedOnAdd();

            builder.Property(notification =>
                    notification.RecipientUserId)
                .HasColumnName("RecipientUserID")
                .IsRequired();

            builder.Property(notification =>
                    notification.ActorUserId)
                .HasColumnName("ActorUserID");

            builder.Property(notification =>
                    notification.NotificationType)
                .HasColumnName("NotificationType")
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(notification =>
                    notification.Title)
                .HasColumnName("Title")
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(notification =>
                    notification.Message)
                .HasColumnName("Message")
                .HasMaxLength(1000)
                .IsRequired();

            builder.Property(notification =>
                    notification.RelatedEntityType)
                .HasColumnName("RelatedEntityType")
                .HasMaxLength(50);

            builder.Property(notification =>
                    notification.RelatedEntityId)
                .HasColumnName("RelatedEntityID");

            builder.Property(notification =>
                    notification.IsRead)
                .HasColumnName("IsRead")
                .HasDefaultValue(false)
                .IsRequired();

            builder.Property(notification =>
                    notification.CreatedDate)
                .HasColumnName("CreatedDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.Property(notification =>
                    notification.ReadDate)
                .HasColumnName("ReadDate")
                .HasColumnType("datetime2(0)");

            builder.HasOne<UserAccount>()
                .WithMany()
                .HasForeignKey(notification =>
                    notification.RecipientUserId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasOne<UserAccount>()
                .WithMany()
                .HasForeignKey(notification =>
                    notification.ActorUserId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(notification => new
            {
                notification.RecipientUserId,
                notification.CreatedDate
            })
                .HasDatabaseName(
                    "IX_NOTIFICATION_RecipientDate");

            builder.HasIndex(notification => new
            {
                notification.RecipientUserId,
                notification.IsRead
            })
                .HasDatabaseName("IX_NOTIFICATION_Unread");

            builder.HasIndex(notification => new
            {
                notification.RelatedEntityType,
                notification.RelatedEntityId
            })
                .HasDatabaseName("IX_NOTIFICATION_Entity")
                .HasFilter(
                    "[RelatedEntityType] IS NOT NULL");
        }
    }
}
