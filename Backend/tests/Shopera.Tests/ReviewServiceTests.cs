using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Buyer.Reviews.DTOs;
using Shopera.Features.Buyer.Reviews.Models;
using Shopera.Features.Buyer.Reviews.Services;
using Shopera.Tests.Support;

namespace Shopera.Tests
{
    public sealed class ReviewServiceTests
    {
        [Fact]
        public async Task
            Create_AllowsOneReviewPerDeliveredBuyerProduct()
        {
            await using var database = new TestDatabase();
            var buyer = TestData.ActiveBuyer(20);
            database.Context.UserAccounts.Add(buyer);
            database.Context.Products.Add(
                new Product
                {
                    ProductId = 100,
                    Status = ProductStatuses.Active
                });
            database.Context.ProductVariants.Add(
                new ProductVariant
                {
                    VariantId = 1000,
                    ProductId = 100
                });
            database.Context.CustomerOrders.Add(
                new CustomerOrder
                {
                    OrderId = 500,
                    BuyerUserId = buyer.UserId,
                    OrderStatus = OrderStatuses.Delivered
                });
            database.Context.OrderItems.Add(
                new OrderItem
                {
                    OrderItemId = 700,
                    OrderId = 500,
                    VariantId = 1000
                });
            await database.Context.SaveChangesAsync();

            var service = new ReviewService(database.Context);
            var request = new CreateReviewRequest
            {
                Rating = 5,
                Comment = "Excellent product."
            };

            var first = await service.CreateAsync(
                buyer.UserId,
                100,
                request);
            var duplicate = await service.CreateAsync(
                buyer.UserId,
                100,
                request);

            Assert.True(first.Succeeded);
            Assert.False(duplicate.Succeeded);
            Assert.Equal(
                ReviewErrorCodes.ReviewAlreadyExists,
                duplicate.ErrorCode);
        }

        [Fact]
        public async Task
            Create_RejectsReviewBeforeOrderIsDelivered()
        {
            await using var database = new TestDatabase();
            var buyer = TestData.ActiveBuyer(20);
            database.Context.UserAccounts.Add(buyer);
            database.Context.Products.Add(
                new Product
                {
                    ProductId = 100,
                    Status = ProductStatuses.Active
                });
            database.Context.ProductVariants.Add(
                new ProductVariant
                {
                    VariantId = 1000,
                    ProductId = 100
                });
            database.Context.CustomerOrders.Add(
                new CustomerOrder
                {
                    OrderId = 500,
                    BuyerUserId = buyer.UserId,
                    OrderStatus = "SHIPPED"
                });
            database.Context.OrderItems.Add(
                new OrderItem
                {
                    OrderItemId = 700,
                    OrderId = 500,
                    VariantId = 1000
                });
            await database.Context.SaveChangesAsync();

            var service = new ReviewService(database.Context);
            var result = await service.CreateAsync(
                buyer.UserId,
                100,
                new CreateReviewRequest
                {
                    Rating = 5,
                    Comment = "The parcel is not delivered yet."
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                ReviewErrorCodes.DeliveredOrderRequired,
                result.ErrorCode);
            Assert.Empty(database.Context.Reviews);
        }

        [Fact]
        public async Task UpdateMine_DoesNotChangeOtherBuyerReview()
        {
            await using var database = new TestDatabase();
            var firstBuyer = TestData.ActiveBuyer(20);
            var secondBuyer = TestData.ActiveBuyer(
                21,
                "Second Buyer");
            database.Context.UserAccounts.AddRange(
                firstBuyer,
                secondBuyer);
            database.Context.Products.Add(
                new Product
                {
                    ProductId = 100,
                    Status = ProductStatuses.Active
                });
            database.Context.Reviews.Add(
                new Review
                {
                    BuyerUserId = firstBuyer.UserId,
                    ProductId = 100,
                    Rating = 4,
                    ReviewDate = DateTime.UtcNow
                });
            await database.Context.SaveChangesAsync();

            var service = new ReviewService(database.Context);
            var result = await service.UpdateMineAsync(
                secondBuyer.UserId,
                100,
                new UpdateReviewRequest
                {
                    Rating = 1
                });

            Assert.False(result.Succeeded);
            Assert.Equal(
                ReviewErrorCodes.ReviewNotFound,
                result.ErrorCode);
        }

        [Fact]
        public async Task
            GetMineState_ReportsEligibilityAndOwnReview()
        {
            await using var database = new TestDatabase();
            var buyer = TestData.ActiveBuyer(20);
            database.Context.UserAccounts.Add(buyer);
            database.Context.Products.Add(
                new Product
                {
                    ProductId = 100,
                    Status = ProductStatuses.Active
                });
            database.Context.ProductVariants.Add(
                new ProductVariant
                {
                    VariantId = 1000,
                    ProductId = 100
                });
            database.Context.CustomerOrders.Add(
                new CustomerOrder
                {
                    OrderId = 500,
                    BuyerUserId = buyer.UserId,
                    OrderStatus = OrderStatuses.Delivered
                });
            database.Context.OrderItems.Add(
                new OrderItem
                {
                    OrderItemId = 700,
                    OrderId = 500,
                    VariantId = 1000
                });
            await database.Context.SaveChangesAsync();

            var service = new ReviewService(database.Context);
            var eligible = await service.GetMineStateAsync(
                buyer.UserId,
                100);

            Assert.True(eligible.Succeeded);
            Assert.True(eligible.Value!.CanCreate);
            Assert.Null(eligible.Value.ReasonCode);
            Assert.Null(eligible.Value.Review);

            var created = await service.CreateAsync(
                buyer.UserId,
                100,
                new CreateReviewRequest
                {
                    Rating = 4,
                    Comment = "Works as expected."
                });

            Assert.True(created.Succeeded);

            var existing = await service.GetMineStateAsync(
                buyer.UserId,
                100);

            Assert.True(existing.Succeeded);
            Assert.False(existing.Value!.CanCreate);
            Assert.Equal(
                ReviewErrorCodes.ReviewAlreadyExists,
                existing.Value.ReasonCode);
            Assert.NotNull(existing.Value.Review);
            Assert.Equal(4, existing.Value.Review!.Rating);
        }

        [Fact]
        public async Task
            Create_AllowsDeliveredOutOfStockProduct()
        {
            await using var database = new TestDatabase();
            var buyer = TestData.ActiveBuyer(20);
            database.Context.UserAccounts.Add(buyer);
            database.Context.Products.Add(
                new Product
                {
                    ProductId = 100,
                    Status = ProductStatuses.OutOfStock
                });
            database.Context.ProductVariants.Add(
                new ProductVariant
                {
                    VariantId = 1000,
                    ProductId = 100
                });
            database.Context.CustomerOrders.Add(
                new CustomerOrder
                {
                    OrderId = 500,
                    BuyerUserId = buyer.UserId,
                    OrderStatus = OrderStatuses.Delivered
                });
            database.Context.OrderItems.Add(
                new OrderItem
                {
                    OrderItemId = 700,
                    OrderId = 500,
                    VariantId = 1000
                });
            await database.Context.SaveChangesAsync();

            var service = new ReviewService(database.Context);
            var result = await service.CreateAsync(
                buyer.UserId,
                100,
                new CreateReviewRequest
                {
                    Rating = 5,
                    Comment = "Still reviewable after stock sold out."
                });

            Assert.True(result.Succeeded);
            Assert.Single(database.Context.Reviews);
        }

        [Fact]
        public async Task GetForProduct_ReturnsAverageRating()
        {
            await using var database = new TestDatabase();
            var firstBuyer = TestData.ActiveBuyer(20);
            var secondBuyer = TestData.ActiveBuyer(
                21,
                "Second Buyer");
            database.Context.UserAccounts.AddRange(
                firstBuyer,
                secondBuyer);
            database.Context.Products.Add(
                new Product
                {
                    ProductId = 100,
                    Status = ProductStatuses.Active
                });
            database.Context.Reviews.AddRange(
                new Review
                {
                    BuyerUserId = firstBuyer.UserId,
                    ProductId = 100,
                    Rating = 5,
                    ReviewDate = DateTime.UtcNow
                },
                new Review
                {
                    BuyerUserId = secondBuyer.UserId,
                    ProductId = 100,
                    Rating = 3,
                    ReviewDate = DateTime.UtcNow
                });
            await database.Context.SaveChangesAsync();

            var service = new ReviewService(database.Context);
            var result = await service.GetForProductAsync(
                100,
                1,
                20);

            Assert.True(result.Succeeded);
            Assert.Equal(4, result.Value!.AverageRating);
            Assert.Equal(2, result.Value.TotalCount);
        }
    }
}
