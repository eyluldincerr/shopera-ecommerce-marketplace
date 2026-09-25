using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Features.Promotions.Models;

namespace Shopera.Features.Promotions.Configurations;

public class PromotionPlanConfiguration : IEntityTypeConfiguration<PromotionPlan>
{
    public void Configure(EntityTypeBuilder<PromotionPlan> builder)
    {
        builder.ToTable("PROMOTION_PLAN");

        builder.HasKey(p => p.PromotionPlanID);

        builder.Property(p => p.PlanName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.PlanDescription)
            .HasMaxLength(500);

        builder.Property(p => p.PlanType)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(p => p.Config)
            .HasColumnType("nvarchar(max)");

        builder.Property(p => p.CreatedDate)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasMany(p => p.Campaigns)
            .WithOne(c => c.Plan)
            .HasForeignKey(c => c.PromotionPlanID)
            .OnDelete(DeleteBehavior.Restrict);
    }
}