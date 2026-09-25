using Microsoft.EntityFrameworkCore;
using Shopera.Domain.Constants;
using Shopera.Features.Seller.Stores.DTOs;
using Shopera.Features.Seller.Stores.Models;
using Shopera.Features.Seller.Stores.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests
{
    public sealed class SellerStoreServiceTests
    {

        [Fact]
        public async Task GetMine_ReturnsOnlyPubliclyVisibleProductCount()
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(30);
            var admin = TestData.ActiveAdmin(1);
            var store = TestData.ApprovedStore(40, seller.UserId);
            var category = TestData.Category(50, admin.UserId);

            database.Context.AddRange(
                seller,
                admin,
                store,
                category,
                TestData.Product(60, store.StoreId, category.CategoryId, ProductStatuses.Active),
                TestData.Product(61, store.StoreId, category.CategoryId, ProductStatuses.OutOfStock),
                TestData.Product(62, store.StoreId, category.CategoryId, ProductStatuses.Draft));
            await database.Context.SaveChangesAsync();

            var service = new SellerStoreService(
                database.Context,
                new FakeNotificationService());

            var result = await service.GetMineAsync(seller.UserId);

            Assert.True(result.Succeeded);
            Assert.Equal(2, result.Value!.VisibleProductCount);
        }

        [Fact]
        public async Task Create_SavesPendingStoreAndNotifiesAdmins()
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(30);
            var admin = TestData.ActiveAdmin(1);
            database.Context.UserAccounts.AddRange(
                seller,
                admin);
            await database.Context.SaveChangesAsync();

            var notifications =
                new FakeNotificationService();
            var service = new SellerStoreService(
                database.Context,
                notifications);

            var result = await service.CreateAsync(
                seller.UserId,
                new CreateSellerStoreRequest
                {
                    StoreName = "Cyprus Tech",
                    StoreSlug = "cyprus-tech",
                    SupportEmail = "support@cyprustech.test"
                });

            Assert.True(result.Succeeded);
            Assert.Equal(
                StoreApprovalStatuses.Pending,
                result.Value!.Store.ApprovalStatus);
            Assert.Equal(1, result.Value.AdminNotificationCount);
            Assert.Single(notifications.Created);
            Assert.Equal(
                "SellerApprovalRequested",
                notifications.Created[0].NotificationType);
            Assert.Equal(
                admin.UserId,
                notifications.Created[0].RecipientUserId);
            Assert.Single(notifications.Delivered);
        }

        [Fact]
        public async Task Create_RejectsSecondStoreForSeller()
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(30);
            database.Context.UserAccounts.Add(seller);
            await database.Context.SaveChangesAsync();

            var service = new SellerStoreService(
                database.Context,
                new FakeNotificationService());

            var first = await service.CreateAsync(
                seller.UserId,
                new CreateSellerStoreRequest
                {
                    StoreName = "First Store",
                    SupportEmail = "first@shopera.test"
                });
            var second = await service.CreateAsync(
                seller.UserId,
                new CreateSellerStoreRequest
                {
                    StoreName = "Second Store",
                    SupportEmail = "second@shopera.test"
                });

            Assert.True(first.Succeeded);
            Assert.False(second.Succeeded);
            Assert.Equal(
                SellerStoreErrorCodes.StoreAlreadyExists,
                second.ErrorCode);
        }

        [Fact]
        public async Task Resubmit_MovesRejectedStoreToPending()
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(30);
            var admin = TestData.ActiveAdmin(1);
            database.Context.UserAccounts.AddRange(
                seller,
                admin);
            await database.Context.SaveChangesAsync();

            var notifications =
                new FakeNotificationService();
            var service = new SellerStoreService(
                database.Context,
                notifications);
            var created = await service.CreateAsync(
                seller.UserId,
                new CreateSellerStoreRequest
                {
                    StoreName = "Retry Store",
                    SupportEmail = "retry@shopera.test"
                });

            var store = await database.Context.Stores
                .SingleAsync(item =>
                    item.StoreId ==
                        created.Value!.Store.StoreId);
            store.ApprovalStatus =
                StoreApprovalStatuses.Rejected;
            store.ApprovedByAdminUserId = admin.UserId;
            await database.Context.SaveChangesAsync();

            var result = await service.ResubmitAsync(
                seller.UserId);

            Assert.True(result.Succeeded);
            Assert.Equal(
                StoreApprovalStatuses.Pending,
                result.Value!.Store.ApprovalStatus);
            Assert.Null(store.ApprovedByAdminUserId);
            Assert.Equal(2, notifications.Created.Count);
        }

        [Fact]
        public async Task UpdateStatus_HidesApprovedStore()
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(30);
            database.Context.UserAccounts.Add(seller);
            database.Context.Stores.Add(
                TestData.ApprovedStore(40, seller.UserId));
            await database.Context.SaveChangesAsync();
            var service = new SellerStoreService(
                database.Context,
                new FakeNotificationService());

            var result = await service.UpdateStatusAsync(
                seller.UserId,
                new UpdateSellerStoreStatusRequest
                {
                    StoreStatus = StoreStatuses.Inactive
                });

            Assert.True(result.Succeeded);
            Assert.Equal(
                StoreStatuses.Inactive,
                result.Value!.StoreStatus);
        }

        [Fact]
        public async Task UpdateStatus_DoesNotReopenClosedStore()
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(30);
            var store =
                TestData.ApprovedStore(40, seller.UserId);
            store.StoreStatus = StoreStatuses.Closed;
            database.Context.UserAccounts.Add(seller);
            database.Context.Stores.Add(store);
            await database.Context.SaveChangesAsync();
            var service = new SellerStoreService(
                database.Context,
                new FakeNotificationService());

            var result = await service.UpdateStatusAsync(
                seller.UserId,
                new UpdateSellerStoreStatusRequest
                {
                    StoreStatus = StoreStatuses.Active
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                SellerStoreErrorCodes.InvalidStoreTransition,
                result.ErrorCode);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("not-an-email")]
        public async Task Create_RequiresValidSupportEmail(
            string supportEmail)
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(30);
            database.Context.UserAccounts.Add(seller);
            await database.Context.SaveChangesAsync();

            var service = new SellerStoreService(
                database.Context,
                new FakeNotificationService());

            var result = await service.CreateAsync(
                seller.UserId,
                new CreateSellerStoreRequest
                {
                    StoreName = "Email Required Store",
                    SupportEmail = supportEmail
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                SellerStoreErrorCodes.InvalidStore,
                result.ErrorCode);
            Assert.Empty(database.Context.Stores);
        }

        [Fact]
        public async Task Update_RequiresValidSupportEmail()
        {
            await using var database = new TestDatabase();
            var seller = TestData.ActiveSeller(30);
            var store = TestData.ApprovedStore(40, seller.UserId);
            store.SupportEmail = "old@shopera.test";
            database.Context.AddRange(seller, store);
            await database.Context.SaveChangesAsync();

            var service = new SellerStoreService(
                database.Context,
                new FakeNotificationService());

            var result = await service.UpdateAsync(
                seller.UserId,
                new UpdateSellerStoreRequest
                {
                    StoreName = "Changed Name",
                    SupportEmail = "invalid"
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                SellerStoreErrorCodes.InvalidStore,
                result.ErrorCode);
            Assert.Equal("old@shopera.test", store.SupportEmail);
        }
    }
}
