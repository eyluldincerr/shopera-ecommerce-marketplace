using Shopera.Domain.Constants;
using Shopera.Domain.Entities;

namespace Shopera.Tests.Support
{
    internal static class TestData
    {
        public static UserAccount ActiveBuyer(
            int userId,
            string name = "Buyer Test")
        {
            return User(
                userId,
                name,
                AccountRoles.Buyer);
        }

        public static UserAccount ActiveSeller(
            int userId,
            string name = "Seller Test")
        {
            return User(
                userId,
                name,
                AccountRoles.Seller);
        }

        public static UserAccount ActiveAdmin(
            int userId,
            string name = "Admin Test")
        {
            return User(
                userId,
                name,
                AccountRoles.Admin);
        }

        public static Store ApprovedStore(
            int storeId,
            int sellerUserId,
            string name = "Approved Test Store")
        {
            return new Store
            {
                StoreId = storeId,
                SellerUserId = sellerUserId,
                StoreName = name,
                StoreSlug = $"store-{storeId}",
                StoreDescription = "Public test storefront",
                ApprovalStatus =
                    StoreApprovalStatuses.Approved,
                StoreStatus = StoreStatuses.Active,
                CreatedDate = DateTime.UtcNow
            };
        }

        public static Category Category(
            int categoryId,
            int adminUserId,
            string name = "Electronics",
            int? parentCategoryId = null)
        {
            return new Category
            {
                CategoryId = categoryId,
                CategoryName = name,
                ParentCategoryId = parentCategoryId,
                ManagedByAdminUserId = adminUserId
            };
        }

        public static Product Product(
            int productId,
            int storeId,
            int categoryId,
            string status = ProductStatuses.Active,
            string name = "Test Product")
        {
            return new Product
            {
                ProductId = productId,
                ProductName = name,
                ShortDescription = "Short description",
                Description = "Full product description",
                Brand = "Shopera Test",
                ModelNumber = $"MODEL-{productId}",
                ProductCondition =
                    ProductConditions.New,
                Status = status,
                CreatedDate = DateTime.UtcNow,
                StoreId = storeId,
                CategoryId = categoryId
            };
        }

        public static ProductImage PrimaryImage(
            int imageId,
            int productId)
        {
            return new ProductImage
            {
                ImageId = imageId,
                ProductId = productId,
                ImageData =
                    new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 },
                ContentType = "image/jpeg",
                OriginalFileName = $"{productId}.jpg",
                AltText = "Primary product image",
                DisplayOrder = 1,
                IsPrimary = true,
                CreatedDate = DateTime.UtcNow
            };
        }

        public static ProductVariant Variant(
            int variantId,
            int productId,
            string sku,
            int stock = 5,
            decimal price = 49.99m,
            decimal costPrice = 25m)
        {
            return new ProductVariant
            {
                VariantId = variantId,
                ProductId = productId,
                Sku = sku,
                VariantName = "Default",
                Price = price,
                CostPrice = costPrice,
                StockQuantity = stock,
                Status = stock > 0
                    ? ProductVariantStatuses.Active
                    : ProductVariantStatuses.OutOfStock,
                CreatedDate = DateTime.UtcNow,
                RowVersion = new byte[] { 1 }
            };
        }

        private static UserAccount User(
            int userId,
            string name,
            string role)
        {
            return new UserAccount
            {
                UserId = userId,
                FullName = name,
                Email = $"user{userId}@shopera.test",
                PasswordHash = "test-only-hash",
                RegistrationDate = DateTime.UtcNow,
                Role = role,
                AccountStatus = AccountStatuses.Active,
                PermissionLevel = role == AccountRoles.Admin
                    ? "MANAGER"
                    : null
            };
        }
    }
}
