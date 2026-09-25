using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Features.Promotions.Models;

namespace Shopera.Features.Promotions.Configurations;

public class PromotionCampaignConfiguration : IEntityTypeConfiguration<PromotionCampaign>
{
    public void Configure(EntityTypeBuilder<PromotionCampaign> builder)
    {
        builder.ToTable("PROMOTION_CAMPAIGN");

        builder.HasKey(c => c.CampaignID);

        builder.Property(c => c.CampaignName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.CampaignDescription)
            .HasMaxLength(1000);

        builder.Property(c => c.BannerImage)
            .HasColumnType("varbinary(max)");

        builder.Property(c => c.BannerContentType)
            .HasMaxLength(50);

        builder.Property(c => c.BannerAltText)
            .HasMaxLength(255);

        builder.Property(c => c.LinkURL)
            .HasMaxLength(500);

        builder.Property(c => c.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("DRAFT");

        builder.Property(c => c.CreatedDate)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne(c => c.Plan)
            .WithMany(p => p.Campaigns)
            .HasForeignKey(c => c.PromotionPlanID)
            .OnDelete(DeleteBehavior.Restrict);
    }
}