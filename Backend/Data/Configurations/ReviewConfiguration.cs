using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shopera.Domain.Entities;

namespace Shopera.Data.Configurations
{
    public sealed class ReviewConfiguration
        : IEntityTypeConfiguration<Review>
    {
        public void Configure(EntityTypeBuilder<Review> builder)
        {
            builder.ToTable("REVIEW", "dbo");

            builder.HasKey(review => review.ReviewId);

            builder.Property(review => review.ReviewId)
                .HasColumnName("ReviewID")
                .ValueGeneratedOnAdd();

            builder.Property(review => review.BuyerUserId)
                .HasColumnName("BuyerUserID")
                .IsRequired();

            builder.Property(review => review.ProductId)
                .HasColumnName("ProductID")
                .IsRequired();

            builder.Property(review => review.Rating)
                .HasColumnName("Rating")
                .IsRequired();

            builder.Property(review => review.Comment)
                .HasColumnName("Comment")
                .HasMaxLength(2000);

            builder.Property(review => review.ReviewDate)
                .HasColumnName("ReviewDate")
                .HasColumnType("datetime2(0)")
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .ValueGeneratedOnAdd();

            builder.HasIndex(review => new
            {
                review.BuyerUserId,
                review.ProductId
            })
                .IsUnique()
                .HasDatabaseName("UQ_REVIEW_BuyerProduct");

            builder.HasIndex(review => review.ProductId)
                .HasDatabaseName("IX_REVIEW_Product");

            builder.HasOne<Product>()
                .WithMany()
                .HasForeignKey(review => review.ProductId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
