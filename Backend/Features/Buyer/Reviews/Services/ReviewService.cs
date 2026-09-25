using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Buyer.Reviews.Contracts;
using Shopera.Features.Buyer.Reviews.DTOs;
using Shopera.Features.Buyer.Reviews.Models;

namespace Shopera.Features.Buyer.Reviews.Services
{
    public sealed class ReviewService : IReviewService
    {
        private const int MaximumPageSize = 100;

        private readonly ApplicationDbContext _dbContext;

        public ReviewService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<ServiceResult<ProductReviewsResponse>>
            GetForProductAsync(
                int productId,
                int page,
                int pageSize)
        {
            if (!await _dbContext.Products
                    .AsNoTracking()
                    .AnyAsync(product =>
                        product.ProductId == productId))
            {
                return ProductNotFound<
                    ProductReviewsResponse>();
            }

            page = page < 1 ? 1 : page;
            pageSize = Math.Clamp(
                pageSize,
                1,
                MaximumPageSize);

            var reviewQuery = _dbContext.Reviews
                .AsNoTracking()
                .Where(review =>
                    review.ProductId == productId);

            var totalCount = await reviewQuery.CountAsync();
            var averageRating = totalCount == 0
                ? 0
                : await reviewQuery.AverageAsync(
                    review => (double)review.Rating);

            var items = await (
                    from review in reviewQuery
                    join buyer in _dbContext.UserAccounts
                            .AsNoTracking()
                        on review.BuyerUserId equals buyer.UserId
                    orderby review.ReviewDate descending,
                        review.ReviewId descending
                    select new ReviewResponse
                    {
                        ReviewId = review.ReviewId,
                        ProductId = review.ProductId,
                        BuyerName = buyer.FullName,
                        Rating = review.Rating,
                        Comment = review.Comment,
                        ReviewDate = review.ReviewDate
                    })
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return ServiceResult<
                ProductReviewsResponse>.Success(
                new ProductReviewsResponse
                {
                    ProductId = productId,
                    AverageRating =
                        Math.Round(averageRating, 2),
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = totalCount == 0
                        ? 0
                        : (int)Math.Ceiling(
                            totalCount /
                            (double)pageSize),
                    Items = items
                });
        }

        public async Task<ServiceResult<MyReviewStateResponse>>
            GetMineStateAsync(
                int buyerUserId,
                int productId)
        {
            var buyer = await GetActiveBuyerAsync(buyerUserId);

            if (buyer is null)
            {
                return Forbidden<MyReviewStateResponse>();
            }

            var productStatus = await _dbContext.Products
                .AsNoTracking()
                .Where(product =>
                    product.ProductId == productId)
                .Select(product => product.Status)
                .SingleOrDefaultAsync();

            if (productStatus is null)
            {
                return ProductNotFound<MyReviewStateResponse>();
            }

            var ownReview = await _dbContext.Reviews
                .AsNoTracking()
                .SingleOrDefaultAsync(review =>
                    review.BuyerUserId == buyerUserId &&
                    review.ProductId == productId);

            if (ownReview is not null)
            {
                return ServiceResult<MyReviewStateResponse>.Success(
                    new MyReviewStateResponse
                    {
                        ProductId = productId,
                        CanCreate = false,
                        ReasonCode =
                            ReviewErrorCodes.ReviewAlreadyExists,
                        Review = MapToResponse(
                            ownReview,
                            buyer.FullName)
                    });
            }

            if (!IsReviewableProductStatus(productStatus))
            {
                return ServiceResult<MyReviewStateResponse>.Success(
                    new MyReviewStateResponse
                    {
                        ProductId = productId,
                        CanCreate = false,
                        ReasonCode =
                            ReviewErrorCodes.ProductNotReviewable
                    });
            }

            var hasDeliveredPurchase =
                await HasDeliveredPurchaseAsync(
                    buyerUserId,
                    productId);

            return ServiceResult<MyReviewStateResponse>.Success(
                new MyReviewStateResponse
                {
                    ProductId = productId,
                    CanCreate = hasDeliveredPurchase,
                    ReasonCode = hasDeliveredPurchase
                        ? null
                        : ReviewErrorCodes
                            .DeliveredOrderRequired
                });
        }

        public async Task<ServiceResult<ReviewResponse>>
            CreateAsync(
                int buyerUserId,
                int productId,
                CreateReviewRequest request)
        {
            var buyer = await GetActiveBuyerAsync(buyerUserId);

            if (buyer is null)
            {
                return Forbidden<ReviewResponse>();
            }

            var productStatus = await _dbContext.Products
                .AsNoTracking()
                .Where(product =>
                    product.ProductId == productId)
                .Select(product => product.Status)
                .SingleOrDefaultAsync();

            if (productStatus is null)
            {
                return ProductNotFound<ReviewResponse>();
            }

            if (!IsReviewableProductStatus(productStatus))
            {
                return ServiceResult<ReviewResponse>.Failure(
                    ReviewErrorCodes.ProductNotReviewable,
                    "Only a public ACTIVE or OUT_OF_STOCK product " +
                    "can receive a new review.");
            }

            if (request.Rating is < 1 or > 5)
            {
                return Invalid(
                    "Rating must be an integer from 1 through 5.");
            }

            var hasDeliveredPurchase =
                await HasDeliveredPurchaseAsync(
                    buyerUserId,
                    productId);

            if (!hasDeliveredPurchase)
            {
                return ServiceResult<ReviewResponse>.Failure(
                    ReviewErrorCodes.DeliveredOrderRequired,
                    "A review can be created only after this " +
                    "buyer receives the product in a DELIVERED " +
                    "order.");
            }

            if (await _dbContext.Reviews.AnyAsync(review =>
                    review.BuyerUserId == buyerUserId &&
                    review.ProductId == productId))
            {
                return ServiceResult<ReviewResponse>.Failure(
                    ReviewErrorCodes.ReviewAlreadyExists,
                    "This buyer has already reviewed the product.");
            }

            var review = new Review
            {
                BuyerUserId = buyerUserId,
                ProductId = productId,
                Rating = (byte)request.Rating,
                Comment = NormalizeOptional(request.Comment),
                ReviewDate = DateTime.UtcNow
            };

            _dbContext.Reviews.Add(review);
            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return ServiceResult<ReviewResponse>.Failure(
                    ReviewErrorCodes.ReviewAlreadyExists,
                    "This buyer has already reviewed the product.");
            }

            return ServiceResult<ReviewResponse>.Success(
                MapToResponse(review, buyer.FullName));
        }

        public async Task<ServiceResult<ReviewResponse>>
            UpdateMineAsync(
                int buyerUserId,
                int productId,
                UpdateReviewRequest request)
        {
            var buyer = await GetActiveBuyerAsync(buyerUserId);

            if (buyer is null)
            {
                return Forbidden<ReviewResponse>();
            }

            var review = await _dbContext.Reviews
                .SingleOrDefaultAsync(item =>
                    item.BuyerUserId == buyerUserId &&
                    item.ProductId == productId);

            if (review is null)
            {
                return ReviewNotFound<ReviewResponse>();
            }

            if (request.Rating.HasValue)
            {
                if (request.Rating.Value is < 1 or > 5)
                {
                    return Invalid(
                        "Rating must be an integer from 1 " +
                        "through 5.");
                }

                review.Rating =
                    (byte)request.Rating.Value;
            }

            if (request.Comment is not null)
            {
                review.Comment =
                    NormalizeOptional(request.Comment);
            }

            await _dbContext.SaveChangesAsync();

            return ServiceResult<ReviewResponse>.Success(
                MapToResponse(review, buyer.FullName));
        }

        public async Task<ServiceResult<bool>> DeleteMineAsync(
            int buyerUserId,
            int productId)
        {
            if (await GetActiveBuyerAsync(buyerUserId) is null)
            {
                return Forbidden<bool>();
            }

            var review = await _dbContext.Reviews
                .SingleOrDefaultAsync(item =>
                    item.BuyerUserId == buyerUserId &&
                    item.ProductId == productId);

            if (review is null)
            {
                return ReviewNotFound<bool>();
            }

            _dbContext.Reviews.Remove(review);
            await _dbContext.SaveChangesAsync();

            return ServiceResult<bool>.Success(true);
        }

        private async Task<bool> HasDeliveredPurchaseAsync(
            int buyerUserId,
            int productId)
        {
            return await (
                    from order in _dbContext.CustomerOrders
                        .AsNoTracking()
                    join item in _dbContext.OrderItems
                            .AsNoTracking()
                        on order.OrderId equals item.OrderId
                    join variant in _dbContext.ProductVariants
                            .AsNoTracking()
                        on item.VariantId equals variant.VariantId
                    where order.BuyerUserId == buyerUserId &&
                        order.OrderStatus ==
                            OrderStatuses.Delivered &&
                        variant.ProductId == productId
                    select order.OrderId)
                .AnyAsync();
        }

        private static bool IsReviewableProductStatus(
            string productStatus)
        {
            return string.Equals(
                       productStatus,
                       ProductStatuses.Active,
                       StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(
                       productStatus,
                       ProductStatuses.OutOfStock,
                       StringComparison.OrdinalIgnoreCase);
        }

        private async Task<UserAccount?> GetActiveBuyerAsync(
            int buyerUserId)
        {
            return buyerUserId < 1
                ? null
                : await _dbContext.UserAccounts
                    .AsNoTracking()
                    .SingleOrDefaultAsync(user =>
                        user.UserId == buyerUserId &&
                        user.Role == AccountRoles.Buyer &&
                        user.AccountStatus ==
                            AccountStatuses.Active);
        }

        private static ReviewResponse MapToResponse(
            Review review,
            string buyerName)
        {
            return new ReviewResponse
            {
                ReviewId = review.ReviewId,
                ProductId = review.ProductId,
                BuyerName = buyerName,
                Rating = review.Rating,
                Comment = review.Comment,
                ReviewDate = review.ReviewDate
            };
        }

        private static string? NormalizeOptional(
            string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static ServiceResult<T> Forbidden<T>()
        {
            return ServiceResult<T>.Failure(
                ReviewErrorCodes.BuyerForbidden,
                "The supplied user is not an active buyer.");
        }

        private static ServiceResult<T> ProductNotFound<T>()
        {
            return ServiceResult<T>.Failure(
                ReviewErrorCodes.ProductNotFound,
                "The selected product was not found.");
        }

        private static ServiceResult<T> ReviewNotFound<T>()
        {
            return ServiceResult<T>.Failure(
                ReviewErrorCodes.ReviewNotFound,
                "The buyer's review for this product was not " +
                "found.");
        }

        private static ServiceResult<ReviewResponse> Invalid(
            string message)
        {
            return ServiceResult<ReviewResponse>.Failure(
                ReviewErrorCodes.InvalidReview,
                message);
        }
    }
}
