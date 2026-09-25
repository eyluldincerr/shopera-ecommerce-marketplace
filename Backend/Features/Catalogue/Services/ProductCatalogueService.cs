using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Shopera.Common.DTOs;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Features.Catalogue.Contracts;
using Shopera.Features.Catalogue.DTOs;
using Shopera.Features.Catalogue.Models;

namespace Shopera.Features.Catalogue.Services
{
    public sealed class ProductCatalogueService
        : IProductCatalogueService
    {
        private const int MaximumPageSize = 100;

        private readonly ApplicationDbContext _dbContext;

        public ProductCatalogueService(
            ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<ServiceResult<PagedResponse<
            PublicProductCardResponse>>> GetProductsAsync(
            ProductCatalogueQuery query)
        {
            var validationError = ValidateQuery(query);

            if (validationError is not null)
            {
                return ServiceResult<PagedResponse<
                    PublicProductCardResponse>>.Failure(
                    CatalogueErrorCodes.InvalidQuery,
                    validationError);
            }

            var page = query.Page < 1 ? 1 : query.Page;
            var pageSize = Math.Clamp(
                query.PageSize,
                1,
                MaximumPageSize);
            var search = NormalizeOptional(query.Search);
            var brand = NormalizeOptional(query.Brand);
            var condition =
                NormalizeOptional(query.Condition)?
                    .ToUpperInvariant();
            var sort = NormalizeOptional(query.Sort)?
                .ToLowerInvariant() ??
                CatalogueSorts.Newest;

            var baseQuery =
                from product in _dbContext.Products
                    .AsNoTracking()
                join store in _dbContext.Stores
                        .AsNoTracking()
                    on product.StoreId equals store.StoreId
                join category in _dbContext.Categories
                        .AsNoTracking()
                    on product.CategoryId equals
                        category.CategoryId
                where store.ApprovalStatus ==
                        StoreApprovalStatuses.Approved &&
                    store.StoreStatus ==
                        StoreStatuses.Active &&
                    (product.Status == ProductStatuses.Active ||
                     product.Status ==
                        ProductStatuses.OutOfStock)
                select new
                {
                    Product = product,
                    Store = store,
                    Category = category
                };

            if (search is not null)
            {
                baseQuery = baseQuery.Where(row =>
                    row.Product.ProductName.Contains(search) ||
                    (row.Product.Brand != null &&
                     row.Product.Brand.Contains(search)) ||
                    (row.Product.ModelNumber != null &&
                     row.Product.ModelNumber.Contains(search)) ||
                    row.Store.StoreName.Contains(search) ||
                    row.Category.CategoryName.Contains(search));
            }

            if (query.CategoryId.HasValue)
            {
                baseQuery = baseQuery.Where(row =>
                    row.Product.CategoryId ==
                        query.CategoryId.Value);
            }

            if (query.StoreId.HasValue)
            {
                baseQuery = baseQuery.Where(row =>
                    row.Product.StoreId ==
                        query.StoreId.Value);
            }

            if (brand is not null)
            {
                baseQuery = baseQuery.Where(row =>
                    row.Product.Brand != null &&
                    row.Product.Brand == brand);
            }

            if (query.ExcludeProductId.HasValue)
            {
                baseQuery = baseQuery.Where(row =>
                    row.Product.ProductId !=
                        query.ExcludeProductId.Value);
            }

            if (condition is not null)
            {
                baseQuery = baseQuery.Where(row =>
                    row.Product.ProductCondition ==
                        condition);
            }

            if (query.NewArrivalsOnly)
            {
                var newArrivalCutoff =
                    DateTime.UtcNow.AddDays(-30);

                baseQuery = baseQuery.Where(row =>
                    row.Product.CreatedDate >= newArrivalCutoff);
            }

            if (query.MinimumRating.HasValue)
            {
                var minimumRating = query.MinimumRating.Value;

                baseQuery = baseQuery.Where(row =>
                    (_dbContext.Reviews
                        .Where(review =>
                            review.ProductId ==
                                row.Product.ProductId)
                        .Select(review =>
                            (double?)review.Rating)
                        .Average() ?? 0) >= minimumRating);
            }

            if (query.MinimumPrice.HasValue ||
                query.MaximumPrice.HasValue ||
                query.InStockOnly)
            {
                baseQuery = baseQuery.Where(row =>
                    _dbContext.ProductVariants.Any(variant =>
                        variant.ProductId ==
                            row.Product.ProductId &&
                        (variant.Status ==
                            ProductVariantStatuses.Active ||
                         variant.Status ==
                            ProductVariantStatuses
                                .OutOfStock) &&
                        (!query.MinimumPrice.HasValue ||
                         variant.Price >=
                            query.MinimumPrice.Value) &&
                        (!query.MaximumPrice.HasValue ||
                         variant.Price <=
                            query.MaximumPrice.Value) &&
                        (!query.InStockOnly ||
                         (variant.Status ==
                            ProductVariantStatuses.Active &&
                          variant.StockQuantity > 0))));
            }

            if (sort == CatalogueSorts.BestSelling)
            {
                baseQuery = baseQuery.Where(row =>
                    _dbContext.OrderItems.Any(orderItem =>
                        orderItem.ProductVariant.ProductId ==
                            row.Product.ProductId &&
                        orderItem.CustomerOrder.OrderStatus ==
                            OrderStatuses.Delivered));
            }

            var totalCount = await baseQuery.CountAsync();

            var projected = baseQuery.Select(row =>
                new PublicProductCardResponse
                {
                    ProductId = row.Product.ProductId,
                    ProductName = row.Product.ProductName,
                    ShortDescription =
                        row.Product.ShortDescription,
                    Brand = row.Product.Brand,
                    ProductCondition =
                        row.Product.ProductCondition,
                    Status = row.Product.Status,
                    StoreId = row.Store.StoreId,
                    StoreName = row.Store.StoreName,
                    StoreSlug = row.Store.StoreSlug,
                    CategoryId = row.Category.CategoryId,
                    CategoryName =
                        row.Category.CategoryName,
                    PrimaryImageId =
                        _dbContext.ProductImages
                            .Where(image =>
                                image.ProductId ==
                                    row.Product.ProductId)
                            .OrderByDescending(image =>
                                image.IsPrimary)
                            .ThenBy(image =>
                                image.DisplayOrder)
                            .Select(image => (int?)image.ImageId)
                            .FirstOrDefault(),
                    PrimaryImageAltText =
                        _dbContext.ProductImages
                            .Where(image =>
                                image.ProductId ==
                                    row.Product.ProductId)
                            .OrderByDescending(image =>
                                image.IsPrimary)
                            .ThenBy(image =>
                                image.DisplayOrder)
                            .Select(image => image.AltText)
                            .FirstOrDefault(),
                    DefaultVariantId =
                        _dbContext.ProductVariants
                            .Where(variant =>
                                variant.ProductId ==
                                    row.Product.ProductId &&
                                (variant.Status ==
                                    ProductVariantStatuses.Active ||
                                 variant.Status ==
                                    ProductVariantStatuses.OutOfStock))
                            .OrderByDescending(variant =>
                                variant.Status ==
                                    ProductVariantStatuses.Active &&
                                variant.StockQuantity > 0)
                            .ThenByDescending(variant =>
                                variant.Status ==
                                    ProductVariantStatuses.Active)
                            .ThenBy(variant => variant.Price)
                            .ThenBy(variant => variant.VariantId)
                            .Select(variant => (int?)variant.VariantId)
                            .FirstOrDefault(),
                    MinimumPrice =
                        _dbContext.ProductVariants
                            .Where(variant =>
                                variant.ProductId ==
                                    row.Product.ProductId &&
                                (variant.Status ==
                                    ProductVariantStatuses
                                        .Active ||
                                 variant.Status ==
                                    ProductVariantStatuses
                                        .OutOfStock))
                            .Select(variant =>
                                (decimal?)variant.Price)
                            .Min() ?? 0,
                    MaximumPrice =
                        _dbContext.ProductVariants
                            .Where(variant =>
                                variant.ProductId ==
                                    row.Product.ProductId &&
                                (variant.Status ==
                                    ProductVariantStatuses
                                        .Active ||
                                 variant.Status ==
                                    ProductVariantStatuses
                                        .OutOfStock))
                            .Select(variant =>
                                (decimal?)variant.Price)
                            .Max() ?? 0,
                    TotalStock =
                        _dbContext.ProductVariants
                            .Where(variant =>
                                variant.ProductId ==
                                    row.Product.ProductId &&
                                variant.Status ==
                                    ProductVariantStatuses
                                        .Active)
                            .Select(variant =>
                                (int?)variant.StockQuantity)
                            .Sum() ?? 0,
                    AverageRating =
                        _dbContext.Reviews
                            .Where(review =>
                                review.ProductId ==
                                    row.Product.ProductId)
                            .Select(review =>
                                (double?)review.Rating)
                            .Average() ?? 0,
                    ReviewCount =
                        _dbContext.Reviews.Count(review =>
                            review.ProductId ==
                                row.Product.ProductId),
                    CreatedDate = row.Product.CreatedDate
                });

            projected = sort switch
            {
                CatalogueSorts.PriceAscending =>
                    projected
                        .OrderBy(item => item.MinimumPrice)
                        .ThenBy(item => item.ProductId),
                CatalogueSorts.PriceDescending =>
                    projected
                        .OrderByDescending(item =>
                            item.MaximumPrice)
                        .ThenByDescending(item =>
                            item.ProductId),
                CatalogueSorts.RatingDescending =>
                    projected
                        .OrderByDescending(item =>
                            item.AverageRating)
                        .ThenByDescending(item =>
                            item.ReviewCount)
                        .ThenByDescending(item =>
                            item.ProductId),
                CatalogueSorts.BestSelling =>
                    projected
                        .OrderByDescending(item =>
                            _dbContext.OrderItems
                                .Where(orderItem =>
                                    orderItem.ProductVariant.ProductId ==
                                        item.ProductId &&
                                    orderItem.CustomerOrder.OrderStatus ==
                                        OrderStatuses.Delivered)
                                .Select(orderItem =>
                                    (int?)orderItem.Quantity)
                                .Sum() ?? 0)
                        .ThenByDescending(item =>
                            item.ReviewCount)
                        .ThenByDescending(item =>
                            item.ProductId),
                CatalogueSorts.NameAscending =>
                    projected
                        .OrderBy(item => item.ProductName)
                        .ThenBy(item => item.ProductId),
                CatalogueSorts.NameDescending =>
                    projected
                        .OrderByDescending(item =>
                            item.ProductName)
                        .ThenByDescending(item =>
                            item.ProductId),
                _ => projected
                    .OrderByDescending(item =>
                        item.CreatedDate)
                    .ThenByDescending(item =>
                        item.ProductId)
            };

            var items = await projected
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            foreach (var item in items)
            {
                item.AverageRating =
                    Math.Round(item.AverageRating, 2);
                item.PrimaryImageUrl =
                    item.PrimaryImageId.HasValue
                        ? BuildPublicImageUrl(
                            item.PrimaryImageId.Value)
                        : null;
            }

            return ServiceResult<PagedResponse<
                PublicProductCardResponse>>.Success(
                new PagedResponse<PublicProductCardResponse>(
                    items,
                    page,
                    pageSize,
                    totalCount));
        }

        public async Task<ServiceResult<
            PublicProductDetailResponse>> GetProductAsync(
            int productId)
        {
            var seed = await (
                    from product in _dbContext.Products
                        .AsNoTracking()
                    join store in _dbContext.Stores
                            .AsNoTracking()
                        on product.StoreId equals store.StoreId
                    join category in _dbContext.Categories
                            .AsNoTracking()
                        on product.CategoryId equals
                            category.CategoryId
                    where product.ProductId == productId &&
                        store.ApprovalStatus ==
                            StoreApprovalStatuses.Approved &&
                        store.StoreStatus ==
                            StoreStatuses.Active &&
                        (product.Status ==
                            ProductStatuses.Active ||
                         product.Status ==
                            ProductStatuses.OutOfStock)
                    select new ProductDetailSeed
                    {
                        ProductId = product.ProductId,
                        ProductName = product.ProductName,
                        ShortDescription =
                            product.ShortDescription,
                        Description = product.Description,
                        Brand = product.Brand,
                        ModelNumber = product.ModelNumber,
                        ProductCondition =
                            product.ProductCondition,
                        ConditionDescription =
                            product.ConditionDescription,
                        Status = product.Status,
                        CreatedDate = product.CreatedDate,
                        StoreId = store.StoreId,
                        StoreName = store.StoreName,
                        StoreSlug = store.StoreSlug,
                        StoreDescription =
                            store.StoreDescription,
                        StoreLogoUrl = store.StoreLogoUrl,
                        StoreBannerUrl =
                            store.StoreBannerUrl,
                        SupportEmail = store.SupportEmail,
                        SupportPhone = store.SupportPhone,
                        StoreReturnPolicy =
                            store.ReturnPolicy,
                        SupportPolicy =
                            store.SupportPolicy,
                        StoreCreatedDate =
                            store.CreatedDate,
                        CategoryId = category.CategoryId,
                        CategoryName =
                            category.CategoryName,
                        CategoryDescription =
                            category.Description,
                        ParentCategoryId =
                            category.ParentCategoryId,
                        ParentCategoryName =
                            _dbContext.Categories
                                .Where(parent =>
                                    parent.CategoryId ==
                                        category
                                            .ParentCategoryId)
                                .Select(parent =>
                                    parent.CategoryName)
                                .FirstOrDefault()
                    })
                .SingleOrDefaultAsync();

            if (seed is null)
            {
                return ServiceResult<
                    PublicProductDetailResponse>.Failure(
                    CatalogueErrorCodes.ProductNotFound,
                    "The public product was not found.");
            }

            var information =
                await _dbContext.ProductInfos
                    .AsNoTracking()
                    .SingleOrDefaultAsync(info =>
                        info.ProductId == productId);

            var images = await _dbContext.ProductImages
                .AsNoTracking()
                .Where(image => image.ProductId == productId)
                .OrderByDescending(image => image.IsPrimary)
                .ThenBy(image => image.DisplayOrder)
                .ThenBy(image => image.ImageId)
                .Select(image =>
                    new PublicProductImageResponse
                    {
                        ImageId = image.ImageId,
                        AltText = image.AltText,
                        DisplayOrder = image.DisplayOrder,
                        IsPrimary = image.IsPrimary
                    })
                .ToListAsync();

            foreach (var image in images)
            {
                image.ImageUrl = BuildPublicImageUrl(
                    image.ImageId);
            }

            var variants = await _dbContext.ProductVariants
                .AsNoTracking()
                .Where(variant =>
                    variant.ProductId == productId &&
                    (variant.Status ==
                        ProductVariantStatuses.Active ||
                     variant.Status ==
                        ProductVariantStatuses.OutOfStock))
                .OrderBy(variant => variant.Price)
                .ThenBy(variant => variant.VariantId)
                .Select(variant =>
                    new PublicProductVariantResponse
                    {
                        VariantId = variant.VariantId,
                        Sku = variant.Sku,
                        VariantName = variant.VariantName,
                        Size = variant.Size,
                        Color = variant.Color,
                        StorageCapacity =
                            variant.StorageCapacity,
                        Price = variant.Price,
                        StockQuantity =
                            variant.StockQuantity,
                        Status = variant.Status,
                        IsAvailable =
                            variant.Status ==
                                ProductVariantStatuses
                                    .Active &&
                            variant.StockQuantity > 0
                    })
                .ToListAsync();

            var reviewCount = await _dbContext.Reviews
                .CountAsync(review =>
                    review.ProductId == productId);
            var averageRating = reviewCount == 0
                ? 0
                : await _dbContext.Reviews
                    .Where(review =>
                        review.ProductId == productId)
                    .AverageAsync(review =>
                        (double)review.Rating);

            var storeProductCount =
                await CountVisibleProductsAsync(seed.StoreId);

            return ServiceResult<
                PublicProductDetailResponse>.Success(
                new PublicProductDetailResponse
                {
                    ProductId = seed.ProductId,
                    ProductName = seed.ProductName,
                    ShortDescription =
                        seed.ShortDescription,
                    Description = seed.Description,
                    Brand = seed.Brand,
                    ModelNumber = seed.ModelNumber,
                    ProductCondition =
                        seed.ProductCondition,
                    ConditionDescription =
                        seed.ConditionDescription,
                    Status = seed.Status,
                    CreatedDate = seed.CreatedDate,
                    Store = new PublicStoreDetailResponse
                    {
                        StoreId = seed.StoreId,
                        StoreName = seed.StoreName,
                        StoreSlug = seed.StoreSlug,
                        StoreDescription =
                            seed.StoreDescription,
                        StoreLogoUrl =
                            seed.StoreLogoUrl,
                        StoreBannerUrl =
                            seed.StoreBannerUrl,
                        SupportEmail =
                            seed.SupportEmail,
                        SupportPhone =
                            seed.SupportPhone,
                        ReturnPolicy =
                            seed.StoreReturnPolicy,
                        SupportPolicy =
                            seed.SupportPolicy,
                        CreatedDate =
                            seed.StoreCreatedDate,
                        VisibleProductCount =
                            storeProductCount
                    },
                    Category = new PublicCategoryResponse
                    {
                        CategoryId = seed.CategoryId,
                        CategoryName =
                            seed.CategoryName,
                        Description =
                            seed.CategoryDescription,
                        ParentCategoryId =
                            seed.ParentCategoryId,
                        ParentCategoryName =
                            seed.ParentCategoryName
                    },
                    Information = information is null
                        ? null
                        : MapInformation(information),
                    Images = images,
                    Variants = variants,
                    AverageRating =
                        Math.Round(averageRating, 2),
                    ReviewCount = reviewCount
                });
        }

        public async Task<ServiceResult<PagedResponse<
            PublicProductCardResponse>>> GetRelatedProductsAsync(
            int productId,
            int page,
            int pageSize)
        {
            var source = await (
                    from product in _dbContext.Products
                        .AsNoTracking()
                    join store in _dbContext.Stores
                            .AsNoTracking()
                        on product.StoreId equals store.StoreId
                    where product.ProductId == productId &&
                        store.ApprovalStatus ==
                            StoreApprovalStatuses.Approved &&
                        store.StoreStatus ==
                            StoreStatuses.Active &&
                        (product.Status ==
                            ProductStatuses.Active ||
                         product.Status ==
                            ProductStatuses.OutOfStock)
                    select new
                    {
                        product.CategoryId
                    })
                .SingleOrDefaultAsync();

            if (source is null)
            {
                return ServiceResult<PagedResponse<
                    PublicProductCardResponse>>.Failure(
                    CatalogueErrorCodes.ProductNotFound,
                    "The public product was not found.");
            }

            return await GetProductsAsync(
                new ProductCatalogueQuery
                {
                    CategoryId = source.CategoryId,
                    ExcludeProductId = productId,
                    Sort = CatalogueSorts.RatingDescending,
                    Page = page,
                    PageSize = pageSize
                });
        }

        public async Task<IReadOnlyList<
            PublicCategoryResponse>> GetCategoriesAsync()
        {
            return await (
                    from category in _dbContext.Categories
                        .AsNoTracking()
                    join parent in _dbContext.Categories
                            .AsNoTracking()
                        on category.ParentCategoryId equals
                            (int?)parent.CategoryId
                        into parentGroup
                    from parent in parentGroup.DefaultIfEmpty()
                    orderby parent.CategoryName,
                        category.CategoryName
                    select new PublicCategoryResponse
                    {
                        CategoryId = category.CategoryId,
                        CategoryName =
                            category.CategoryName,
                        Description = category.Description,
                        ParentCategoryId =
                            category.ParentCategoryId,
                        ParentCategoryName = parent == null
                            ? null
                            : parent.CategoryName,
                        VisibleProductCount =
                            _dbContext.Products.Count(
                                product =>
                                    product.CategoryId ==
                                        category.CategoryId &&
                                    (product.Status ==
                                        ProductStatuses
                                            .Active ||
                                     product.Status ==
                                        ProductStatuses
                                            .OutOfStock) &&
                                    _dbContext.Stores.Any(
                                        store =>
                                            store.StoreId ==
                                                product.StoreId &&
                                            store.ApprovalStatus ==
                                                StoreApprovalStatuses
                                                    .Approved &&
                                            store.StoreStatus ==
                                                StoreStatuses
                                                    .Active)),
                        HasImage =
                            category.CategoryImageData != null
                    })
                .ToListAsync();
        }

        public async Task<ServiceResult<(byte[] ImageData,
            string ContentType)>> GetCategoryImageAsync(int categoryId)
        {
            if (categoryId <= 0)
            {
                return ServiceResult<(byte[] ImageData,
                    string ContentType)>.Failure(
                    CatalogueErrorCodes.CategoryNotFound,
                    "The category image was not found.");
            }

            var image = await _dbContext.Categories
                .AsNoTracking()
                .Where(category =>
                    category.CategoryId == categoryId &&
                    category.CategoryImageData != null &&
                    category.CategoryImageContentType != null)
                .Select(category => new
                {
                    category.CategoryImageData,
                    category.CategoryImageContentType
                })
                .SingleOrDefaultAsync();

            if (image is null || image.CategoryImageData is null ||
                string.IsNullOrWhiteSpace(
                    image.CategoryImageContentType))
            {
                return ServiceResult<(byte[] ImageData,
                    string ContentType)>.Failure(
                    CatalogueErrorCodes.CategoryNotFound,
                    "The category image was not found.");
            }

            return ServiceResult<(byte[] ImageData,
                string ContentType)>.Success((
                    image.CategoryImageData,
                    image.CategoryImageContentType));
        }

        public async Task<IReadOnlyList<
            PublicBrandResponse>> GetBrandsAsync(int limit)
        {
            limit = Math.Clamp(limit, 1, 100);

            return await (
                    from product in _dbContext.Products
                        .AsNoTracking()
                    join store in _dbContext.Stores
                            .AsNoTracking()
                        on product.StoreId equals store.StoreId
                    where product.Brand != null &&
                        product.Brand != string.Empty &&
                        store.ApprovalStatus ==
                            StoreApprovalStatuses.Approved &&
                        store.StoreStatus ==
                            StoreStatuses.Active &&
                        (product.Status ==
                            ProductStatuses.Active ||
                         product.Status ==
                            ProductStatuses.OutOfStock)
                    group product by product.Brand into brandGroup
                    orderby brandGroup.Count() descending,
                        brandGroup.Key
                    select new PublicBrandResponse
                    {
                        Brand = brandGroup.Key!,
                        VisibleProductCount =
                            brandGroup.Count()
                    })
                .Take(limit)
                .ToListAsync();
        }

        public async Task<PagedResponse<
            PublicStoreCardResponse>> GetStoresAsync(
            string? search,
            int page,
            int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = Math.Clamp(
                pageSize,
                1,
                MaximumPageSize);
            search = NormalizeOptional(search);

            var query = _dbContext.Stores
                .AsNoTracking()
                .Where(store =>
                    store.ApprovalStatus ==
                        StoreApprovalStatuses.Approved &&
                    store.StoreStatus ==
                        StoreStatuses.Active);

            if (search is not null)
            {
                query = query.Where(store =>
                    store.StoreName.Contains(search) ||
                    (store.StoreDescription != null &&
                     store.StoreDescription.Contains(search)));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(store => store.StoreName)
                .ThenBy(store => store.StoreId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(store =>
                    new PublicStoreCardResponse
                    {
                        StoreId = store.StoreId,
                        StoreName = store.StoreName,
                        StoreSlug = store.StoreSlug,
                        StoreDescription =
                            store.StoreDescription,
                        StoreLogoUrl = store.StoreLogoUrl,
                        StoreBannerUrl =
                            store.StoreBannerUrl,
                        VisibleProductCount =
                            _dbContext.Products.Count(
                                product =>
                                    product.StoreId ==
                                        store.StoreId &&
                                    (product.Status ==
                                        ProductStatuses
                                            .Active ||
                                     product.Status ==
                                        ProductStatuses
                                            .OutOfStock))
                    })
                .ToListAsync();

            return new PagedResponse<PublicStoreCardResponse>(
                items,
                page,
                pageSize,
                totalCount);
        }

        public Task<ServiceResult<
            PublicStoreDetailResponse>> GetStoreAsync(
            int storeId)
        {
            return GetStoreInternalAsync(storeId, null);
        }

        public Task<ServiceResult<
            PublicStoreDetailResponse>> GetStoreBySlugAsync(
            string storeSlug)
        {
            return GetStoreInternalAsync(
                null,
                NormalizeOptional(storeSlug)?
                    .ToLowerInvariant());
        }

        private async Task<ServiceResult<
            PublicStoreDetailResponse>> GetStoreInternalAsync(
            int? storeId,
            string? storeSlug)
        {
            var response = await _dbContext.Stores
                .AsNoTracking()
                .Where(store =>
                    store.ApprovalStatus ==
                        StoreApprovalStatuses.Approved &&
                    store.StoreStatus ==
                        StoreStatuses.Active &&
                    (!storeId.HasValue ||
                     store.StoreId == storeId.Value) &&
                    (storeSlug == null ||
                     store.StoreSlug == storeSlug))
                .Select(store =>
                    new PublicStoreDetailResponse
                    {
                        StoreId = store.StoreId,
                        StoreName = store.StoreName,
                        StoreSlug = store.StoreSlug,
                        StoreDescription =
                            store.StoreDescription,
                        StoreLogoUrl = store.StoreLogoUrl,
                        StoreBannerUrl =
                            store.StoreBannerUrl,
                        SupportEmail = store.SupportEmail,
                        SupportPhone = store.SupportPhone,
                        ReturnPolicy = store.ReturnPolicy,
                        SupportPolicy =
                            store.SupportPolicy,
                        CreatedDate = store.CreatedDate,
                        VisibleProductCount =
                            _dbContext.Products.Count(
                                product =>
                                    product.StoreId ==
                                        store.StoreId &&
                                    (product.Status ==
                                        ProductStatuses
                                            .Active ||
                                     product.Status ==
                                        ProductStatuses
                                            .OutOfStock))
                    })
                .SingleOrDefaultAsync();

            return response is null
                ? ServiceResult<
                    PublicStoreDetailResponse>.Failure(
                    CatalogueErrorCodes.StoreNotFound,
                    "The public store was not found.")
                : ServiceResult<
                    PublicStoreDetailResponse>.Success(
                    response);
        }

        private async Task<int> CountVisibleProductsAsync(
            int storeId)
        {
            return await _dbContext.Products.CountAsync(
                product =>
                    product.StoreId == storeId &&
                    (product.Status ==
                        ProductStatuses.Active ||
                     product.Status ==
                        ProductStatuses.OutOfStock));
        }

        private static string? ValidateQuery(
            ProductCatalogueQuery query)
        {
            if (query.CategoryId is < 1 ||
                query.StoreId is < 1)
            {
                return "CategoryId and StoreId must be positive.";
            }

            if (query.MinimumPrice is < 0 ||
                query.MaximumPrice is < 0)
            {
                return "Price filters cannot be negative.";
            }

            if (query.MinimumRating is < 1 or > 5)
            {
                return "MinimumRating must be between 1 and 5.";
            }

            if (query.MinimumPrice.HasValue &&
                query.MaximumPrice.HasValue &&
                query.MinimumPrice.Value >
                    query.MaximumPrice.Value)
            {
                return "MinimumPrice cannot exceed MaximumPrice.";
            }

            var condition =
                NormalizeOptional(query.Condition)?
                    .ToUpperInvariant();

            if (condition is not null &&
                !ProductConditions.All.Contains(condition))
            {
                return "Product condition is not supported.";
            }

            var sort = NormalizeOptional(query.Sort);

            if (sort is not null &&
                !CatalogueSorts.All.Contains(sort))
            {
                return "Sort must be newest, price_asc, " +
                    "price_desc, rating_desc, best_selling, " +
                    "name_asc, or name_desc.";
            }

            return null;
        }

        private static PublicProductInfoResponse MapInformation(
            Shopera.Domain.Entities.ProductInfo information)
        {
            return new PublicProductInfoResponse
            {
                ProductDetails =
                    ParseJson(information.ProductDetails),
                Specifications =
                    ParseJson(information.Specifications),
                WhatsInTheBox =
                    ParseJson(information.WhatsInTheBox),
                WarrantyInformation =
                    information.WarrantyInformation,
                ReturnPolicy = information.ReturnPolicy,
                CareInstructions =
                    information.CareInstructions,
                AdditionalInformation =
                    information.AdditionalInformation
            };
        }

        private static JsonElement? ParseJson(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            try
            {
                using var document =
                    JsonDocument.Parse(value);

                return document.RootElement.Clone();
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static string BuildPublicImageUrl(int imageId)
        {
            return $"/api/product-images/{imageId}/content";
        }

        private static string? NormalizeOptional(
            string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private sealed class ProductDetailSeed
        {
            public int ProductId { get; set; }

            public string ProductName { get; set; } =
                string.Empty;

            public string? ShortDescription { get; set; }

            public string? Description { get; set; }

            public string? Brand { get; set; }

            public string? ModelNumber { get; set; }

            public string ProductCondition { get; set; } =
                string.Empty;

            public string? ConditionDescription { get; set; }

            public string Status { get; set; } = string.Empty;

            public DateTime CreatedDate { get; set; }

            public int StoreId { get; set; }

            public string StoreName { get; set; } =
                string.Empty;

            public string? StoreSlug { get; set; }

            public string? StoreDescription { get; set; }

            public string? StoreLogoUrl { get; set; }

            public string? StoreBannerUrl { get; set; }

            public string? SupportEmail { get; set; }

            public string? SupportPhone { get; set; }

            public string? StoreReturnPolicy { get; set; }

            public string? SupportPolicy { get; set; }

            public DateTime StoreCreatedDate { get; set; }

            public int CategoryId { get; set; }

            public string CategoryName { get; set; } =
                string.Empty;

            public string? CategoryDescription { get; set; }

            public int? ParentCategoryId { get; set; }

            public string? ParentCategoryName { get; set; }
        }
    }
}
