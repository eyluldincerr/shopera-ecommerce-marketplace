using Microsoft.EntityFrameworkCore;
using Shopera.Domain.Entities;
using Shopera.Features.Promotions.Models;

namespace Shopera.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<PromotionPlan> PromotionPlans { get; set; }
        public DbSet<PromotionCampaign> PromotionCampaigns { get; set; }

        public DbSet<UserAccount> UserAccounts { get; set; } = null!;

        public DbSet<PasswordResetToken> PasswordResetTokens
        {
            get;
            set;
        } = null!;

        public DbSet<Store> Stores { get; set; } = null!;

        public DbSet<BuyerAddress> BuyerAddresses { get; set; } =
            null!;

        public DbSet<Category> Categories { get; set; } = null!;

        public DbSet<Product> Products { get; set; } = null!;

        public DbSet<ProductInfo> ProductInfos { get; set; } =
            null!;

        public DbSet<ProductImage> ProductImages { get; set; } =
            null!;

        public DbSet<ProductVariant> ProductVariants { get; set; } =
            null!;

        public DbSet<Cart> Carts { get; set; } = null!;

        public DbSet<CartItem> CartItems { get; set; } = null!;

        public DbSet<Wishlist> Wishlists { get; set; } = null!;

        public DbSet<WishlistItem> WishlistItems { get; set; } = null!;

        public DbSet<Coupon> Coupons { get; set; } = null!;

        public DbSet<CustomerOrder> CustomerOrders { get; set; } =
            null!;

        public DbSet<OrderItem> OrderItems { get; set; } = null!;

        public DbSet<OrderAddress> OrderAddresses { get; set; } = null!;

        public DbSet<OrderSellerFinancial> OrderSellerFinancials { get; set; } = null!;

        public DbSet<OrderStatusHistory> OrderStatusHistories { get; set; } = null!;

        public DbSet<Payment> Payments { get; set; } = null!;

        public DbSet<Shipment> Shipments { get; set; } = null!;

        public DbSet<Review> Reviews { get; set; } = null!;

        public DbSet<StoreApprovalHistory> StoreApprovalHistories
        {
            get;
            set;
        } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.ApplyConfigurationsFromAssembly(
                typeof(ApplicationDbContext).Assembly);
        }
    }
}
