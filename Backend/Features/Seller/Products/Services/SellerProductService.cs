using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Shopera.Common.DTOs;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Seller.Products.Contracts;
using Shopera.Features.Seller.Products.DTOs;
using Shopera.Features.Seller.Products.Models;

namespace Shopera.Features.Seller.Products.Services
{
    public sealed class SellerProductService
        : ISellerProductService
    {
        private const int MaximumPageSize = 100;
        private const int MaximumImagesPerProduct = 25;
        private const int MaximumVariantsPerProduct = 100;

        private readonly ApplicationDbContext _dbContext;
        private readonly IProductImageService _imageService;
        private readonly IProductImageValidator _imageValidator;

        public SellerProductService(
            ApplicationDbContext dbContext,
            IProductImageService? imageService = null,
            IProductImageValidator? imageValidator = null)
        {
            _dbContext = dbContext;
            _imageService = imageService ??
                new ProductImageService();
            _imageValidator = imageValidator ??
                new ProductImageValidator();
        }

        public async Task<ServiceResult<PagedResponse<
            SellerProductListResponse>>> GetMineAsync(
            int sellerUserId,
            string? search,
            string? status,
            int page,
            int pageSize)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return Forbidden<PagedResponse<
                    SellerProductListResponse>>();
            }

            var normalizedStatus =
                NormalizeOptional(status)?.ToUpperInvariant();

            if (normalizedStatus is not null &&
                !ProductStatuses.All.Contains(normalizedStatus))
            {
                return Invalid<PagedResponse<
                    SellerProductListResponse>>(
                    "The product status is not supported.");
            }

            var storeId = await _dbContext.Stores
                .AsNoTracking()
                .Where(store =>
                    store.SellerUserId == sellerUserId)
                .Select(store => (int?)store.StoreId)
                .SingleOrDefaultAsync();

            if (!storeId.HasValue)
            {
                return StoreNotReady<PagedResponse<
                    SellerProductListResponse>>();
            }

            page = Math.Max(1, page);
            pageSize = Math.Clamp(
                pageSize,
                1,
                MaximumPageSize);
            search = NormalizeOptional(search);

            var query =
                from product in _dbContext.Products
                    .AsNoTracking()
                join category in _dbContext.Categories
                        .AsNoTracking()
                    on product.CategoryId equals
                        category.CategoryId
                where product.StoreId == storeId.Value
                select new
                {
                    Product = product,
                    Category = category
                };

            if (normalizedStatus is not null)
            {
                query = query.Where(item =>
                    item.Product.Status == normalizedStatus);
            }
            else
            {
                // Product deletion is status-based. Hide soft-deleted
                // products from the normal Seller Products list.
                query = query.Where(item =>
                    item.Product.Status != ProductStatuses.Deleted);
            }

            if (search is not null)
            {
                query = query.Where(item =>
                    item.Product.ProductName.Contains(search) ||
                    (item.Product.Brand != null &&
                     item.Product.Brand.Contains(search)) ||
                    (item.Product.ModelNumber != null &&
                     item.Product.ModelNumber.Contains(search)));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(item =>
                    item.Product.CreatedDate)
                .ThenByDescending(item =>
                    item.Product.ProductId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(item => new SellerProductListResponse
                {
                    ProductId = item.Product.ProductId,
                    ProductName = item.Product.ProductName,
                    ProductCondition =
                        item.Product.ProductCondition,
                    Status = item.Product.Status,
                    CategoryId = item.Category.CategoryId,
                    CategoryName =
                        item.Category.CategoryName,
                    PrimaryImageId =
                        _dbContext.ProductImages
                            .Where(image =>
                                image.ProductId ==
                                    item.Product.ProductId)
                            .OrderByDescending(image =>
                                image.IsPrimary)
                            .ThenBy(image =>
                                image.DisplayOrder)
                            .Select(image => (int?)image.ImageId)
                            .FirstOrDefault(),
                    VariantCount =
                        _dbContext.ProductVariants.Count(
                            variant =>
                                variant.ProductId ==
                                    item.Product.ProductId &&
                                variant.Status !=
                                    ProductVariantStatuses
                                        .Deleted),
                    TotalStock =
                        _dbContext.ProductVariants
                            .Where(variant =>
                                variant.ProductId ==
                                    item.Product.ProductId &&
                                variant.Status ==
                                    ProductVariantStatuses
                                        .Active)
                            .Select(variant =>
                                (int?)variant.StockQuantity)
                            .Sum() ?? 0,
                    MinimumPrice =
                        _dbContext.ProductVariants
                            .Where(variant =>
                                variant.ProductId ==
                                    item.Product.ProductId &&
                                variant.Status !=
                                    ProductVariantStatuses
                                        .Deleted)
                            .Select(variant =>
                                (decimal?)variant.Price)
                            .Min(),
                    AverageRating =
                        _dbContext.Reviews
                            .Where(review =>
                                review.ProductId ==
                                    item.Product.ProductId)
                            .Select(review =>
                                (decimal?)review.Rating)
                            .Average(),
                    ReviewCount =
                        _dbContext.Reviews.Count(review =>
                            review.ProductId ==
                                item.Product.ProductId),
                    CreatedDate =
                        item.Product.CreatedDate
                })
                .ToListAsync();

            foreach (var item in items)
            {
                item.PrimaryImageUrl = item.PrimaryImageId.HasValue
                    ? BuildSellerImageUrl(
                        item.ProductId,
                        item.PrimaryImageId.Value)
                    : null;
            }

            return ServiceResult<PagedResponse<
                SellerProductListResponse>>.Success(
                new PagedResponse<SellerProductListResponse>(
                    items,
                    page,
                    pageSize,
                    totalCount));
        }

        public async Task<ServiceResult<PagedResponse<
            SellerInventoryItemResponse>>> GetInventoryAsync(
            int sellerUserId,
            string? search,
            int? categoryId,
            string? stockStatus,
            int page,
            int pageSize)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return Forbidden<PagedResponse<
                    SellerInventoryItemResponse>>();
            }

            var storeId = await _dbContext.Stores
                .AsNoTracking()
                .Where(store =>
                    store.SellerUserId == sellerUserId)
                .Select(store => (int?)store.StoreId)
                .SingleOrDefaultAsync();

            if (!storeId.HasValue)
            {
                return StoreNotReady<PagedResponse<
                    SellerInventoryItemResponse>>();
            }

            if (categoryId is < 1)
            {
                return Invalid<PagedResponse<
                    SellerInventoryItemResponse>>(
                    "CategoryId must be positive.");
            }

            stockStatus =
                NormalizeOptional(stockStatus)?
                    .ToUpperInvariant();
            if (stockStatus is not null &&
                stockStatus != "IN_STOCK" &&
                stockStatus != "LOW_STOCK" &&
                stockStatus != "OUT_OF_STOCK")
            {
                return Invalid<PagedResponse<
                    SellerInventoryItemResponse>>(
                    "StockStatus must be IN_STOCK, " +
                    "LOW_STOCK, or OUT_OF_STOCK.");
            }

            page = Math.Max(1, page);
            pageSize = Math.Clamp(
                pageSize,
                1,
                MaximumPageSize);
            search = NormalizeOptional(search);

            var query =
                from variant in _dbContext.ProductVariants
                    .AsNoTracking()
                join product in _dbContext.Products
                        .AsNoTracking()
                    on variant.ProductId equals
                        product.ProductId
                join category in _dbContext.Categories
                        .AsNoTracking()
                    on product.CategoryId equals
                        category.CategoryId
                where product.StoreId == storeId.Value &&
                    variant.Status !=
                        ProductVariantStatuses.Deleted
                select new
                {
                    Product = product,
                    Category = category,
                    Variant = variant
                };

            if (search is not null)
            {
                query = query.Where(item =>
                    item.Product.ProductName.Contains(search) ||
                    item.Variant.Sku.Contains(search) ||
                    (item.Variant.VariantName != null &&
                     item.Variant.VariantName.Contains(search)));
            }

            if (categoryId.HasValue)
            {
                query = query.Where(item =>
                    item.Product.CategoryId ==
                        categoryId.Value);
            }

            query = stockStatus switch
            {
                "IN_STOCK" => query.Where(item =>
                    item.Variant.StockQuantity >= 10),
                "LOW_STOCK" => query.Where(item =>
                    item.Variant.StockQuantity > 0 &&
                    item.Variant.StockQuantity < 10),
                "OUT_OF_STOCK" => query.Where(item =>
                    item.Variant.StockQuantity == 0),
                _ => query
            };

            var totalCount = await query.CountAsync();
            var rows = await query
                .OrderBy(item => item.Product.ProductName)
                .ThenBy(item => item.Product.ProductId)
                .ThenBy(item => item.Variant.VariantId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(item => new
                {
                    item.Product.ProductId,
                    item.Product.ProductName,
                    item.Category.CategoryId,
                    item.Category.CategoryName,
                    PrimaryImageId =
                        _dbContext.ProductImages
                            .Where(image =>
                                image.ProductId ==
                                    item.Product.ProductId)
                            .OrderByDescending(image =>
                                image.IsPrimary)
                            .ThenBy(image =>
                                image.DisplayOrder)
                            .Select(image =>
                                (int?)image.ImageId)
                            .FirstOrDefault(),
                    item.Variant.VariantId,
                    item.Variant.Sku,
                    item.Variant.VariantName,
                    item.Variant.StockQuantity,
                    item.Variant.Status,
                    item.Variant.RowVersion
                })
                .ToListAsync();

            var items = rows
                .Select(item =>
                    new SellerInventoryItemResponse
                    {
                        ProductId = item.ProductId,
                        ProductName = item.ProductName,
                        CategoryId = item.CategoryId,
                        CategoryName = item.CategoryName,
                        PrimaryImageId =
                            item.PrimaryImageId,
                        PrimaryImageUrl =
                            item.PrimaryImageId.HasValue
                                ? BuildSellerImageUrl(
                                    item.ProductId,
                                    item.PrimaryImageId.Value)
                                : null,
                        VariantId = item.VariantId,
                        Sku = item.Sku,
                        VariantName = item.VariantName,
                        StockQuantity =
                            item.StockQuantity,
                        Status = item.Status,
                        RowVersion =
                            Convert.ToBase64String(
                                item.RowVersion)
                    })
                .ToList();

            return ServiceResult<PagedResponse<
                SellerInventoryItemResponse>>.Success(
                new PagedResponse<
                    SellerInventoryItemResponse>(
                    items,
                    page,
                    pageSize,
                    totalCount));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            GetAsync(int sellerUserId, int productId)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: false);

            if (!access.Succeeded)
            {
                return ServiceResult<
                    SellerProductResponse>.Failure(
                    access.ErrorCode!,
                    access.ErrorMessage!);
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            CreateAsync(
                int sellerUserId,
                CreateSellerProductRequest request)
        {
            var storeResult =
                await GetReadyStoreIdAsync(sellerUserId);

            if (!storeResult.Succeeded)
            {
                return ServiceResult<
                    SellerProductResponse>.Failure(
                    storeResult.ErrorCode!,
                    storeResult.ErrorMessage!);
            }

            var productName =
                NormalizeRequired(request.ProductName);
            var condition =
                NormalizeOptional(request.ProductCondition)?
                    .ToUpperInvariant();

            if (productName is null)
            {
                return Invalid<SellerProductResponse>(
                    "ProductName is required.");
            }

            if (condition is null ||
                !ProductConditions.All.Contains(condition))
            {
                return Invalid<SellerProductResponse>(
                    "ProductCondition must be NEW, " +
                    "USED_LIKE_NEW, USED_GOOD, USED_FAIR, " +
                    "or REFURBISHED.");
            }

            if (!await CategoryExistsAsync(request.CategoryId))
            {
                return CategoryNotFound();
            }

            if (request.Variants.Count >
                    MaximumVariantsPerProduct)
            {
                return Invalid<SellerProductResponse>(
                    $"A product supports at most " +
                    $"{MaximumVariantsPerProduct} variants.");
            }

            var variantValidation =
                await ValidateNewVariantsAsync(
                    request.Variants);
            if (variantValidation is not null)
            {
                return variantValidation;
            }

            var infoValidation =
                ValidateInformation(request.Information);
            if (infoValidation is not null)
            {
                return InvalidInformation(infoValidation);
            }

            var product = new Product
            {
                ProductName = productName,
                ShortDescription =
                    NormalizeOptional(
                        request.ShortDescription),
                Description =
                    NormalizeOptional(request.Description),
                Brand = NormalizeOptional(request.Brand),
                ModelNumber =
                    NormalizeOptional(request.ModelNumber),
                ProductCondition = condition,
                ConditionDescription =
                    NormalizeOptional(
                        request.ConditionDescription),
                Status = ProductStatuses.Draft,
                CreatedDate = DateTime.UtcNow,
                StoreId = storeResult.Value,
                CategoryId = request.CategoryId
            };

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync();

            _dbContext.Products.Add(product);
            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsReferenceConstraintViolation(exception))
            {
                await transaction.RollbackAsync();
                _dbContext.ChangeTracker.Clear();
                return CategoryNotFound();
            }

            if (request.Information is not null)
            {
                _dbContext.ProductInfos.Add(
                    CreateInformation(
                        product.ProductId,
                        request.Information));
            }

            foreach (var item in request.Variants)
            {
                _dbContext.ProductVariants.Add(
                    CreateVariant(product.ProductId, item));
            }

            try
            {
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                await transaction.RollbackAsync();
                _dbContext.ChangeTracker.Clear();

                return DatabaseExceptionClassifier.MentionsConstraint(exception, "UQ_VARIANT_SKU")
                    ? DuplicateSku()
                    : DuplicateVariantOptions();
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(product.ProductId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            UpdateAsync(
                int sellerUserId,
                int productId,
                UpdateSellerProductRequest request)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded)
            {
                return Forward(access);
            }

            var product = await _dbContext.Products
                .SingleAsync(item =>
                    item.ProductId == productId);

            if (product.Status == ProductStatuses.Deleted)
            {
                return ProductNotFound();
            }

            if (request.CategoryId.HasValue)
            {
                if (request.CategoryId.Value < 1 ||
                    !await CategoryExistsAsync(
                        request.CategoryId.Value))
                {
                    return CategoryNotFound();
                }

                product.CategoryId =
                    request.CategoryId.Value;
            }

            if (request.ProductName is not null)
            {
                var name =
                    NormalizeRequired(request.ProductName);
                if (name is null)
                {
                    return Invalid<SellerProductResponse>(
                        "ProductName cannot be empty.");
                }

                product.ProductName = name;
            }

            if (request.ProductCondition is not null)
            {
                var condition =
                    NormalizeOptional(
                        request.ProductCondition)?
                        .ToUpperInvariant();
                if (condition is null ||
                    !ProductConditions.All.Contains(condition))
                {
                    return Invalid<SellerProductResponse>(
                        "ProductCondition is not supported.");
                }

                product.ProductCondition = condition;
            }

            product.ShortDescription = ApplyOptional(
                request.ShortDescription,
                product.ShortDescription);
            product.Description = ApplyOptional(
                request.Description,
                product.Description);
            product.Brand = ApplyOptional(
                request.Brand,
                product.Brand);
            product.ModelNumber = ApplyOptional(
                request.ModelNumber,
                product.ModelNumber);
            product.ConditionDescription = ApplyOptional(
                request.ConditionDescription,
                product.ConditionDescription);

            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsReferenceConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return CategoryNotFound();
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            UpsertInfoAsync(
                int sellerUserId,
                int productId,
                UpsertProductInfoRequest request)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded) return Forward(access);

            var validation = ValidateInformation(request);
            if (validation is not null)
            {
                return InvalidInformation(validation);
            }

            var information =
                await _dbContext.ProductInfos
                    .SingleOrDefaultAsync(item =>
                        item.ProductId == productId);

            if (information is null)
            {
                information =
                    CreateInformation(productId, request);
                _dbContext.ProductInfos.Add(information);
            }
            else
            {
                ApplyInformation(information, request);
                information.UpdatedDate = DateTime.UtcNow;
            }

            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return ServiceResult<SellerProductResponse>.Failure(
                    SellerProductErrorCodes.ProductConcurrencyConflict,
                    "Product information changed at the same time. Refresh and try again.");
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            AddImageAsync(
                int sellerUserId,
                int productId,
                CreateProductImageRequest request)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded) return Forward(access);

            var count = await _dbContext.ProductImages
                .CountAsync(item =>
                    item.ProductId == productId);
            if (count >= MaximumImagesPerProduct)
            {
                return Invalid<SellerProductResponse>(
                    $"A product supports at most " +
                    $"{MaximumImagesPerProduct} images.");
            }

            if (count == 0)
            {
                request.IsPrimary = true;
            }

            var result = await _imageService.CreateImageAsync(
                productId,
                request,
                _imageValidator,
                _dbContext);

            if (!result.Succeeded)
            {
                return ForwardImage(result);
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            UpdateImageAsync(
                int sellerUserId,
                int productId,
                int imageId,
                UpdateProductImageRequest request)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded) return Forward(access);

            if (!await _dbContext.ProductImages.AnyAsync(item =>
                    item.ProductId == productId &&
                    item.ImageId == imageId))
            {
                return ImageNotFound();
            }

            var result = await _imageService.UpdateImageAsync(
                imageId,
                request,
                _imageValidator,
                _dbContext);

            if (!result.Succeeded)
            {
                return ForwardImage(result);
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            DeleteImageAsync(
                int sellerUserId,
                int productId,
                int imageId)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded) return Forward(access);

            var image = await _dbContext.ProductImages
                .SingleOrDefaultAsync(item =>
                    item.ProductId == productId &&
                    item.ImageId == imageId);
            if (image is null)
            {
                return ImageNotFound();
            }

            var wasPrimary = image.IsPrimary;
            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync();

            try
            {
                if (wasPrimary)
                {
                    image.IsPrimary = false;
                    await _dbContext.SaveChangesAsync();
                }

                _dbContext.ProductImages.Remove(image);
                await _dbContext.SaveChangesAsync();

                if (wasPrimary)
                {
                    var replacement =
                        await _dbContext.ProductImages
                            .Where(item =>
                                item.ProductId == productId)
                            .OrderBy(item => item.DisplayOrder)
                            .ThenBy(item => item.ImageId)
                            .FirstOrDefaultAsync();

                    if (replacement is not null)
                    {
                        replacement.IsPrimary = true;
                        await _dbContext.SaveChangesAsync();
                    }
                }

                await transaction.CommitAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                await transaction.RollbackAsync();
                _dbContext.ChangeTracker.Clear();
                return ServiceResult<SellerProductResponse>.Failure(
                    SellerProductErrorCodes.ImageConcurrencyConflict,
                    "Product images changed at the same time. Refresh and try again.");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<(byte[] ImageData,
            string ContentType)>> GetImageContentAsync(
                int sellerUserId,
                int productId,
                int imageId)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: false);

            if (!access.Succeeded)
            {
                return ServiceResult<(byte[], string)>.Failure(
                    access.ErrorCode!,
                    access.ErrorMessage!);
            }

            if (!await _dbContext.ProductImages
                    .AsNoTracking()
                    .AnyAsync(item =>
                        item.ProductId == productId &&
                        item.ImageId == imageId))
            {
                return ServiceResult<(byte[], string)>.Failure(
                    SellerProductErrorCodes.ImageNotFound,
                    "The product image was not found.");
            }

            return await _imageService.GetImageContentAsync(
                imageId,
                _dbContext);
        }

        public async Task<ServiceResult<SellerProductResponse>>
            AddVariantAsync(
                int sellerUserId,
                int productId,
                CreateProductVariantRequest request)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded) return Forward(access);

            if (await _dbContext.ProductVariants.CountAsync(item =>
                    item.ProductId == productId &&
                    item.Status !=
                        ProductVariantStatuses.Deleted) >=
                MaximumVariantsPerProduct)
            {
                return Invalid<SellerProductResponse>(
                    $"A product supports at most " +
                    $"{MaximumVariantsPerProduct} variants.");
            }

            var validation =
                await ValidateNewVariantsAsync(
                    new[] { request });
            if (validation is not null) return validation;

            if (await HasDuplicateOptionsAsync(
                    productId,
                    null,
                    request.Size,
                    request.Color,
                    request.StorageCapacity))
            {
                return DuplicateVariantOptions();
            }

            _dbContext.ProductVariants.Add(
                CreateVariant(productId, request));
            try
            {
                await _dbContext.SaveChangesAsync();
                await SynchronizeAvailabilityAsync(productId);
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return DatabaseExceptionClassifier.MentionsConstraint(exception, "UQ_VARIANT_SKU")
                    ? DuplicateSku()
                    : DuplicateVariantOptions();
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            UpdateVariantAsync(
                int sellerUserId,
                int productId,
                int variantId,
                UpdateProductVariantRequest request)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded) return Forward(access);

            var rowVersion = ParseRowVersion(request.RowVersion);
            if (rowVersion is null)
            {
                return Invalid<SellerProductResponse>(
                    "RowVersion must be valid Base64.");
            }

            var variant = await _dbContext.ProductVariants
                .SingleOrDefaultAsync(item =>
                    item.ProductId == productId &&
                    item.VariantId == variantId &&
                    item.Status !=
                        ProductVariantStatuses.Deleted);
            if (variant is null)
            {
                return VariantNotFound();
            }

            if (request.Sku is not null)
            {
                var sku = NormalizeRequired(request.Sku);
                if (sku is null)
                {
                    return Invalid<SellerProductResponse>(
                        "Sku cannot be empty.");
                }

                if (await _dbContext.ProductVariants.AnyAsync(
                        item =>
                            item.VariantId != variantId &&
                            item.Sku.ToUpper() ==
                                sku.ToUpper()))
                {
                    return DuplicateSku();
                }

                variant.Sku = sku;
            }

            if ((request.Price.HasValue &&
                 request.Price.Value < 0) ||
                (request.CostPrice.HasValue &&
                 request.CostPrice.Value < 0) ||
                (request.StockQuantity.HasValue &&
                 request.StockQuantity.Value < 0))
            {
                return Invalid<SellerProductResponse>(
                    "Price, CostPrice, and StockQuantity " +
                    "cannot be negative.");
            }

            if (request.Status is not null)
            {
                var status = NormalizeVariantStatus(
                    request.Status,
                    request.StockQuantity ??
                        variant.StockQuantity);
                if (status is null)
                {
                    return Invalid<SellerProductResponse>(
                        "The variant status is not supported.");
                }

                variant.Status = status;
            }

            var nextSize = request.Size is null
                ? variant.Size
                : NormalizeOptional(request.Size);
            var nextColor = request.Color is null
                ? variant.Color
                : NormalizeOptional(request.Color);
            var nextStorage =
                request.StorageCapacity is null
                    ? variant.StorageCapacity
                    : NormalizeOptional(
                        request.StorageCapacity);

            if (await HasDuplicateOptionsAsync(
                    productId,
                    variantId,
                    nextSize,
                    nextColor,
                    nextStorage))
            {
                return DuplicateVariantOptions();
            }

            variant.VariantName = ApplyOptional(
                request.VariantName,
                variant.VariantName);
            variant.Size = ApplyOptional(
                request.Size,
                variant.Size);
            variant.Color = ApplyOptional(
                request.Color,
                variant.Color);
            variant.StorageCapacity = ApplyOptional(
                request.StorageCapacity,
                variant.StorageCapacity);
            variant.Price = request.Price ?? variant.Price;
            variant.CostPrice =
                request.CostPrice ?? variant.CostPrice;
            variant.StockQuantity =
                request.StockQuantity ??
                variant.StockQuantity;

            if (variant.StockQuantity == 0 &&
                variant.Status ==
                    ProductVariantStatuses.Active)
            {
                variant.Status =
                    ProductVariantStatuses.OutOfStock;
            }
            else if (variant.StockQuantity > 0 &&
                variant.Status ==
                    ProductVariantStatuses.OutOfStock)
            {
                variant.Status =
                    ProductVariantStatuses.Active;
            }

            _dbContext.Entry(variant)
                .Property(item => item.RowVersion)
                .OriginalValue = rowVersion;

            try
            {
                await _dbContext.SaveChangesAsync();
                await SynchronizeAvailabilityAsync(productId);
            }
            catch (DbUpdateConcurrencyException)
            {
                return ConcurrencyConflict();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return DatabaseExceptionClassifier.MentionsConstraint(exception, "UQ_VARIANT_SKU")
                    ? DuplicateSku()
                    : DuplicateVariantOptions();
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            DeleteVariantAsync(
                int sellerUserId,
                int productId,
                int variantId,
                DeleteProductVariantRequest request)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded) return Forward(access);

            var rowVersion = ParseRowVersion(request.RowVersion);
            if (rowVersion is null)
            {
                return Invalid<SellerProductResponse>(
                    "RowVersion must be valid Base64.");
            }

            var variant = await _dbContext.ProductVariants
                .SingleOrDefaultAsync(item =>
                    item.ProductId == productId &&
                    item.VariantId == variantId &&
                    item.Status !=
                        ProductVariantStatuses.Deleted);
            if (variant is null)
            {
                return VariantNotFound();
            }

            variant.Status = ProductVariantStatuses.Deleted;
            variant.StockQuantity = 0;
            _dbContext.Entry(variant)
                .Property(item => item.RowVersion)
                .OriginalValue = rowVersion;

            try
            {
                await _dbContext.SaveChangesAsync();
                await SynchronizeAvailabilityAsync(productId);
            }
            catch (DbUpdateConcurrencyException)
            {
                return ConcurrencyConflict();
            }

            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<SellerProductResponse>>
            UpdateStatusAsync(
                int sellerUserId,
                int productId,
                UpdateProductStatusRequest request)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded) return Forward(access);

            var status =
                NormalizeOptional(request.Status)?
                    .ToUpperInvariant();

            if (status is null ||
                !ProductStatuses.SellerSelectable.Contains(status))
            {
                return InvalidTransition(
                    "Seller status must be DRAFT, ACTIVE, " +
                    "INACTIVE, or DELETED.");
            }

            if (status == ProductStatuses.Deleted)
            {
                var deleted = await DeleteAsync(
                    sellerUserId,
                    productId);
                return deleted.Succeeded
                    ? ServiceResult<
                        SellerProductResponse>.Success(
                        await MapAsync(productId))
                    : ServiceResult<
                        SellerProductResponse>.Failure(
                        deleted.ErrorCode!,
                        deleted.ErrorMessage!);
            }

            var product = await _dbContext.Products
                .SingleAsync(item =>
                    item.ProductId == productId);

            if (product.Status == ProductStatuses.Deleted)
            {
                return ProductNotFound();
            }

            if (status == ProductStatuses.Active)
            {
                var activationError =
                    await GetActivationErrorAsync(productId);
                if (activationError is not null)
                {
                    return InvalidTransition(activationError);
                }

                product.Status =
                    await HasSellableStockAsync(productId)
                        ? ProductStatuses.Active
                        : ProductStatuses.OutOfStock;
            }
            else
            {
                product.Status = status;
            }

            await _dbContext.SaveChangesAsync();
            return ServiceResult<SellerProductResponse>.Success(
                await MapAsync(productId));
        }

        public async Task<ServiceResult<bool>> DeleteAsync(
            int sellerUserId,
            int productId)
        {
            var access = await ValidateOwnedProductAsync(
                sellerUserId,
                productId,
                requireReadyStore: true);
            if (!access.Succeeded)
            {
                return ServiceResult<bool>.Failure(
                    access.ErrorCode!,
                    access.ErrorMessage!);
            }

            var product = await _dbContext.Products
                .SingleAsync(item =>
                    item.ProductId == productId);
            product.Status = ProductStatuses.Deleted;

            var variants = await _dbContext.ProductVariants
                .Where(item => item.ProductId == productId)
                .ToListAsync();
            foreach (var variant in variants)
            {
                variant.Status =
                    ProductVariantStatuses.Deleted;
                variant.StockQuantity = 0;
            }

            await _dbContext.SaveChangesAsync();
            return ServiceResult<bool>.Success(true);
        }

        private async Task<ServiceResult<int>>
            ValidateOwnedProductAsync(
                int sellerUserId,
                int productId,
                bool requireReadyStore)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return ServiceResult<int>.Failure(
                    SellerProductErrorCodes.SellerForbidden,
                    "An active SELLER account is required.");
            }

            var item = await (
                    from product in _dbContext.Products
                        .AsNoTracking()
                    join store in _dbContext.Stores.AsNoTracking()
                        on product.StoreId equals store.StoreId
                    where product.ProductId == productId &&
                        store.SellerUserId == sellerUserId
                    select new
                    {
                        product.Status,
                        store.StoreId,
                        store.ApprovalStatus,
                        store.StoreStatus
                    })
                .SingleOrDefaultAsync();

            if (item is null ||
                item.Status == ProductStatuses.Deleted)
            {
                return ServiceResult<int>.Failure(
                    SellerProductErrorCodes.ProductNotFound,
                    "The seller-owned product was not found.");
            }

            if (requireReadyStore &&
                (item.ApprovalStatus !=
                    StoreApprovalStatuses.Approved ||
                 item.StoreStatus != StoreStatuses.Active))
            {
                return ServiceResult<int>.Failure(
                    SellerProductErrorCodes.StoreNotReady,
                    "The seller's store must be approved and " +
                    "active.");
            }

            return ServiceResult<int>.Success(item.StoreId);
        }

        private async Task<ServiceResult<int>>
            GetReadyStoreIdAsync(int sellerUserId)
        {
            if (!await IsActiveSellerAsync(sellerUserId))
            {
                return ServiceResult<int>.Failure(
                    SellerProductErrorCodes.SellerForbidden,
                    "An active SELLER account is required.");
            }

            var storeId = await _dbContext.Stores
                .AsNoTracking()
                .Where(store =>
                    store.SellerUserId == sellerUserId &&
                    store.ApprovalStatus ==
                        StoreApprovalStatuses.Approved &&
                    store.StoreStatus ==
                        StoreStatuses.Active)
                .Select(store => (int?)store.StoreId)
                .SingleOrDefaultAsync();

            return storeId.HasValue
                ? ServiceResult<int>.Success(storeId.Value)
                : ServiceResult<int>.Failure(
                    SellerProductErrorCodes.StoreNotReady,
                    "The seller's store must be approved and " +
                    "active before products can be managed.");
        }

        private async Task<string?> GetActivationErrorAsync(
            int productId)
        {
            if (!await _dbContext.ProductImages.AnyAsync(item =>
                    item.ProductId == productId &&
                    item.IsPrimary))
            {
                return "Add one primary image before activation.";
            }

            if (!await _dbContext.ProductVariants.AnyAsync(item =>
                    item.ProductId == productId &&
                    (item.Status ==
                        ProductVariantStatuses.Active ||
                     item.Status ==
                        ProductVariantStatuses.OutOfStock)))
            {
                return "Add an active or out-of-stock variant " +
                    "before activation.";
            }

            return null;
        }

        private Task<bool> HasSellableStockAsync(int productId)
        {
            return _dbContext.ProductVariants.AnyAsync(item =>
                item.ProductId == productId &&
                item.Status ==
                    ProductVariantStatuses.Active &&
                item.StockQuantity > 0);
        }

        private async Task SynchronizeAvailabilityAsync(
            int productId)
        {
            var product = await _dbContext.Products
                .SingleAsync(item =>
                    item.ProductId == productId);

            if (product.Status != ProductStatuses.Active &&
                product.Status !=
                    ProductStatuses.OutOfStock)
            {
                return;
            }

            product.Status =
                await HasSellableStockAsync(productId)
                    ? ProductStatuses.Active
                    : ProductStatuses.OutOfStock;
            await _dbContext.SaveChangesAsync();
        }

        private async Task<ServiceResult<
            SellerProductResponse>?> ValidateNewVariantsAsync(
            IEnumerable<CreateProductVariantRequest> requests)
        {
            var items = requests.ToList();
            var skus = new HashSet<string>(
                StringComparer.OrdinalIgnoreCase);
            var optionKeys = new HashSet<string>(
                StringComparer.OrdinalIgnoreCase);

            foreach (var request in items)
            {
                var sku = NormalizeRequired(request.Sku);
                if (sku is null)
                {
                    return Invalid<SellerProductResponse>(
                        "Every variant requires an SKU.");
                }

                if (!skus.Add(sku))
                {
                    return DuplicateSku();
                }

                if (!optionKeys.Add(CreateOptionKey(
                        request.Size,
                        request.Color,
                        request.StorageCapacity)))
                {
                    return DuplicateVariantOptions();
                }

                if (request.Price < 0 ||
                    request.CostPrice < 0 ||
                    request.StockQuantity < 0)
                {
                    return Invalid<SellerProductResponse>(
                        "Price, CostPrice, and StockQuantity " +
                        "cannot be negative.");
                }

                if (NormalizeVariantStatus(
                        request.Status,
                        request.StockQuantity) is null)
                {
                    return Invalid<SellerProductResponse>(
                        "The variant status is not supported.");
                }
            }

            if (skus.Count > 0)
            {
                var normalizedSkus = skus
                    .Select(item => item.ToUpper())
                    .ToList();
                if (await _dbContext.ProductVariants.AnyAsync(
                        item =>
                            normalizedSkus.Contains(
                                item.Sku.ToUpper())))
                {
                    return DuplicateSku();
                }
            }

            return null;
        }

        private Task<bool> HasDuplicateOptionsAsync(
            int productId,
            int? excludedVariantId,
            string? size,
            string? color,
            string? storageCapacity)
        {
            size = NormalizeOptional(size);
            color = NormalizeOptional(color);
            storageCapacity =
                NormalizeOptional(storageCapacity);

            return _dbContext.ProductVariants.AnyAsync(item =>
                item.ProductId == productId &&
                (!excludedVariantId.HasValue ||
                 item.VariantId != excludedVariantId.Value) &&
                item.Size == size &&
                item.Color == color &&
                item.StorageCapacity == storageCapacity);
        }

        private static string CreateOptionKey(
            string? size,
            string? color,
            string? storageCapacity)
        {
            return string.Join(
                "|",
                NormalizeOptional(size) ?? "<NULL>",
                NormalizeOptional(color) ?? "<NULL>",
                NormalizeOptional(storageCapacity) ?? "<NULL>");
        }

        private static string? ValidateInformation(
            UpsertProductInfoRequest? request)
        {
            if (request is null)
            {
                return null;
            }

            return ValidateJsonEnvelope(
                    request.ProductDetails,
                    "items",
                    "ProductDetails") ??
                ValidateJsonEnvelope(
                    request.Specifications,
                    "groups",
                    "Specifications") ??
                ValidateJsonEnvelope(
                    request.WhatsInTheBox,
                    "items",
                    "WhatsInTheBox");
        }

        private static string? ValidateJsonEnvelope(
            JsonElement? element,
            string arrayProperty,
            string fieldName)
        {
            if (!element.HasValue ||
                element.Value.ValueKind ==
                    JsonValueKind.Null)
            {
                return null;
            }

            if (element.Value.ValueKind !=
                    JsonValueKind.Object ||
                !element.Value.TryGetProperty(
                    arrayProperty,
                    out var items) ||
                items.ValueKind != JsonValueKind.Array)
            {
                return $"{fieldName} must be a JSON object " +
                    $"containing an '{arrayProperty}' array.";
            }

            return null;
        }

        private static ProductInfo CreateInformation(
            int productId,
            UpsertProductInfoRequest request)
        {
            var information = new ProductInfo
            {
                ProductId = productId,
                CreatedDate = DateTime.UtcNow
            };
            ApplyInformation(information, request);
            return information;
        }

        private static void ApplyInformation(
            ProductInfo information,
            UpsertProductInfoRequest request)
        {
            information.ProductDetails =
                SerializeJson(request.ProductDetails);
            information.Specifications =
                SerializeJson(request.Specifications);
            information.WhatsInTheBox =
                SerializeJson(request.WhatsInTheBox);
            information.WarrantyInformation =
                NormalizeOptional(
                    request.WarrantyInformation);
            information.ReturnPolicy =
                NormalizeOptional(request.ReturnPolicy);
            information.CareInstructions =
                NormalizeOptional(
                    request.CareInstructions);
            information.AdditionalInformation =
                NormalizeOptional(
                    request.AdditionalInformation);
        }

        private static ProductVariant CreateVariant(
            int productId,
            CreateProductVariantRequest request)
        {
            return new ProductVariant
            {
                ProductId = productId,
                Sku = NormalizeRequired(request.Sku)!,
                VariantName =
                    NormalizeOptional(request.VariantName),
                Size = NormalizeOptional(request.Size),
                Color = NormalizeOptional(request.Color),
                StorageCapacity =
                    NormalizeOptional(
                        request.StorageCapacity),
                Price = request.Price,
                CostPrice = request.CostPrice,
                StockQuantity = request.StockQuantity,
                Status = NormalizeVariantStatus(
                    request.Status,
                    request.StockQuantity)!,
                CreatedDate = DateTime.UtcNow
            };
        }

        private async Task ClearPrimaryImagesAsync(int productId)
        {
            var primaries = await _dbContext.ProductImages
                .Where(item =>
                    item.ProductId == productId &&
                    item.IsPrimary)
                .ToListAsync();
            foreach (var primary in primaries)
            {
                primary.IsPrimary = false;
            }
        }

        private Task<bool> CategoryExistsAsync(int categoryId)
        {
            return _dbContext.Categories
                .AsNoTracking()
                .AnyAsync(item =>
                    item.CategoryId == categoryId);
        }

        private Task<bool> IsActiveSellerAsync(int userId)
        {
            return _dbContext.UserAccounts
                .AsNoTracking()
                .AnyAsync(user =>
                    user.UserId == userId &&
                    user.Role == AccountRoles.Seller &&
                    user.AccountStatus ==
                        AccountStatuses.Active);
        }

        private async Task<SellerProductResponse> MapAsync(
            int productId)
        {
            var response = await (
                    from product in _dbContext.Products
                        .AsNoTracking()
                    join category in _dbContext.Categories
                            .AsNoTracking()
                        on product.CategoryId equals
                            category.CategoryId
                    where product.ProductId == productId
                    select new SellerProductResponse
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
                        StoreId = product.StoreId,
                        CategoryId = category.CategoryId,
                        CategoryName =
                            category.CategoryName
                    })
                .SingleAsync();

            var information =
                await _dbContext.ProductInfos
                    .AsNoTracking()
                    .SingleOrDefaultAsync(item =>
                        item.ProductId == productId);

            response.Information = information is null
                ? null
                : new SellerProductInfoResponse
                {
                    ProductInfoId =
                        information.ProductInfoId,
                    ProductDetails =
                        ParseJson(
                            information.ProductDetails),
                    Specifications =
                        ParseJson(
                            information.Specifications),
                    WhatsInTheBox =
                        ParseJson(
                            information.WhatsInTheBox),
                    WarrantyInformation =
                        information.WarrantyInformation,
                    ReturnPolicy =
                        information.ReturnPolicy,
                    CareInstructions =
                        information.CareInstructions,
                    AdditionalInformation =
                        information.AdditionalInformation,
                    CreatedDate =
                        information.CreatedDate,
                    UpdatedDate =
                        information.UpdatedDate
                };

            var images = await _dbContext.ProductImages
                .AsNoTracking()
                .Where(item => item.ProductId == productId)
                .OrderByDescending(item => item.IsPrimary)
                .ThenBy(item => item.DisplayOrder)
                .ThenBy(item => item.ImageId)
                .Select(item => new SellerProductImageResponse
                {
                    ImageId = item.ImageId,
                    AltText = item.AltText,
                    DisplayOrder = item.DisplayOrder,
                    IsPrimary = item.IsPrimary,
                    CreatedDate = item.CreatedDate
                })
                .ToListAsync();

            foreach (var image in images)
            {
                image.ImageUrl = BuildSellerImageUrl(
                    productId,
                    image.ImageId);
            }

            response.Images = images;

            response.Variants = await _dbContext.ProductVariants
                .AsNoTracking()
                .Where(item =>
                    item.ProductId == productId &&
                    item.Status !=
                        ProductVariantStatuses.Deleted)
                .OrderBy(item => item.VariantId)
                .Select(item =>
                    new SellerProductVariantResponse
                    {
                        VariantId = item.VariantId,
                        Sku = item.Sku,
                        VariantName = item.VariantName,
                        Size = item.Size,
                        Color = item.Color,
                        StorageCapacity =
                            item.StorageCapacity,
                        Price = item.Price,
                        CostPrice = item.CostPrice,
                        StockQuantity =
                            item.StockQuantity,
                        Status = item.Status,
                        CreatedDate = item.CreatedDate,
                        RowVersion =
                            Convert.ToBase64String(
                                item.RowVersion)
                    })
                .ToListAsync();

            return response;
        }

        private static string BuildSellerImageUrl(
            int productId,
            int imageId)
        {
            return $"/api/seller/products/{productId}/images/" +
                $"{imageId}/content";
        }

        private static string? NormalizeVariantStatus(
            string? requestedStatus,
            int stockQuantity)
        {
            var status = NormalizeOptional(requestedStatus)?
                .ToUpperInvariant() ??
                ProductVariantStatuses.Active;

            if (!ProductVariantStatuses.All.Contains(status) ||
                status == ProductVariantStatuses.Deleted)
            {
                return null;
            }

            if (stockQuantity == 0 &&
                status == ProductVariantStatuses.Active)
            {
                return ProductVariantStatuses.OutOfStock;
            }

            if (stockQuantity > 0 &&
                status ==
                    ProductVariantStatuses.OutOfStock)
            {
                return ProductVariantStatuses.Active;
            }

            return status;
        }

        private static string? SerializeJson(JsonElement? value)
        {
            return !value.HasValue ||
                value.Value.ValueKind == JsonValueKind.Null
                    ? null
                    : value.Value.GetRawText();
        }

        private static JsonElement? ParseJson(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            try
            {
                using var document = JsonDocument.Parse(value);
                return document.RootElement.Clone();
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static byte[]? ParseRowVersion(string value)
        {
            try
            {
                var bytes = Convert.FromBase64String(value);
                return bytes.Length == 0 ? null : bytes;
            }
            catch (FormatException)
            {
                return null;
            }
        }

        private static string? NormalizeRequired(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static string? ApplyOptional(
            string? requested,
            string? current)
        {
            return requested is null
                ? current
                : NormalizeOptional(requested);
        }

        private static ServiceResult<SellerProductResponse>
            Forward(ServiceResult<int> result)
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                result.ErrorCode!,
                result.ErrorMessage!);
        }

        private static ServiceResult<SellerProductResponse>
            ForwardImage(ServiceResult<ProductImage> result)
        {
            return ServiceResult<SellerProductResponse>.Failure(
                result.ErrorCode!,
                result.ErrorMessage!);
        }

        private static ServiceResult<T> Forbidden<T>()
        {
            return ServiceResult<T>.Failure(
                SellerProductErrorCodes.SellerForbidden,
                "An active SELLER account is required.");
        }

        private static ServiceResult<T> StoreNotReady<T>()
        {
            return ServiceResult<T>.Failure(
                SellerProductErrorCodes.StoreNotReady,
                "The seller's store must exist and be approved " +
                "and active.");
        }

        private static ServiceResult<SellerProductResponse>
            ProductNotFound()
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes.ProductNotFound,
                "The seller-owned product was not found.");
        }

        private static ServiceResult<SellerProductResponse>
            CategoryNotFound()
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes.CategoryNotFound,
                "The selected category was not found.");
        }

        private static ServiceResult<SellerProductResponse>
            ImageNotFound()
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes.ImageNotFound,
                "The product image was not found.");
        }

        private static ServiceResult<SellerProductResponse>
            VariantNotFound()
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes.VariantNotFound,
                "The active product variant was not found.");
        }

        private static ServiceResult<SellerProductResponse>
            DuplicateSku()
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes.DuplicateSku,
                "SKU values must be globally unique.");
        }

        private static ServiceResult<SellerProductResponse>
            DuplicateVariantOptions()
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes
                    .DuplicateVariantOptions,
                "Size, Color, and StorageCapacity must be " +
                "unique within a product.");
        }

        private static ServiceResult<SellerProductResponse>
            DuplicateDisplayOrder()
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes
                    .DuplicateDisplayOrder,
                "Image DisplayOrder must be unique within a " +
                "product.");
        }

        private static ServiceResult<SellerProductResponse>
            InvalidInformation(string message)
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes.InvalidInformation,
                message);
        }

        private static ServiceResult<SellerProductResponse>
            InvalidTransition(string message)
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes.InvalidTransition,
                message);
        }

        private static ServiceResult<SellerProductResponse>
            ConcurrencyConflict()
        {
            return ServiceResult<
                SellerProductResponse>.Failure(
                SellerProductErrorCodes.ConcurrencyConflict,
                "The variant changed after it was loaded. " +
                "Reload it and retry with the new RowVersion.");
        }

        private static ServiceResult<T> Invalid<T>(
            string message)
        {
            return ServiceResult<T>.Failure(
                SellerProductErrorCodes.InvalidProduct,
                message);
        }
    }
}
