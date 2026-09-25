using Shopera.Features.Admin.Categories.DTOs;
using Shopera.Features.Admin.Categories.Models;
using Shopera.Features.Admin.Categories.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests
{
    public sealed class AdminCategoryServiceTests
    {
        [Fact]
        public async Task Create_SavesAdminManagedChildCategory()
        {
            await using var database = new TestDatabase();
            var admin = TestData.ActiveAdmin(1);
            database.Context.UserAccounts.Add(admin);
            database.Context.Categories.Add(
                TestData.Category(10, admin.UserId));
            await database.Context.SaveChangesAsync();

            var service =
                new AdminCategoryService(database.Context);
            var result = await service.CreateAsync(
                admin.UserId,
                new CreateAdminCategoryRequest
                {
                    CategoryName = "Laptops",
                    ParentCategoryId = 10
                });

            Assert.True(result.Succeeded);
            Assert.Equal("Laptops", result.Value!.CategoryName);
            Assert.Equal(10, result.Value.ParentCategoryId);
            Assert.Equal(
                admin.UserId,
                result.Value.ManagedByAdminUserId);
        }

        [Fact]
        public async Task Update_RejectsParentCycle()
        {
            await using var database = new TestDatabase();
            var admin = TestData.ActiveAdmin(1);
            database.Context.UserAccounts.Add(admin);
            database.Context.Categories.AddRange(
                TestData.Category(10, 1, "Electronics"),
                TestData.Category(11, 1, "Laptops", 10));
            await database.Context.SaveChangesAsync();

            var service =
                new AdminCategoryService(database.Context);
            var result = await service.UpdateAsync(
                admin.UserId,
                10,
                new UpdateAdminCategoryRequest
                {
                    UpdateParentCategory = true,
                    ParentCategoryId = 11
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                AdminCategoryErrorCodes.CategoryCycle,
                result.ErrorCode);
        }

        [Fact]
        public async Task Delete_RejectsCategoryContainingProduct()
        {
            await using var database = new TestDatabase();
            var admin = TestData.ActiveAdmin(1);
            var seller = TestData.ActiveSeller(2);
            database.Context.UserAccounts.AddRange(admin, seller);
            database.Context.Stores.Add(
                TestData.ApprovedStore(20, seller.UserId));
            database.Context.Categories.Add(
                TestData.Category(10, admin.UserId));
            database.Context.Products.Add(
                TestData.Product(30, 20, 10));
            await database.Context.SaveChangesAsync();

            var service =
                new AdminCategoryService(database.Context);
            var result = await service.DeleteAsync(
                admin.UserId,
                10);

            Assert.False(result.Succeeded);
            Assert.Equal(
                AdminCategoryErrorCodes.CategoryInUse,
                result.ErrorCode);
        }
    }
}
