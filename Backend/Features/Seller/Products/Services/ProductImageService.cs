using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Entities;
using Shopera.Features.Seller.Products.DTOs;
using Shopera.Features.Seller.Products.Models;

namespace Shopera.Features.Seller.Products.Services
{
    public interface IProductImageService
    {
        Task<ServiceResult<ProductImage>> CreateImageAsync(
            int productId,
            CreateProductImageRequest request,
            IProductImageValidator validator,
            ApplicationDbContext dbContext,
            CancellationToken cancellationToken = default);

        Task<ServiceResult<ProductImage>> UpdateImageAsync(
            int imageId,
            UpdateProductImageRequest request,
            IProductImageValidator validator,
            ApplicationDbContext dbContext,
            CancellationToken cancellationToken = default);

        Task<ServiceResult<(byte[] ImageData, string ContentType)>>
            GetImageContentAsync(
                int imageId,
                ApplicationDbContext dbContext,
                CancellationToken cancellationToken = default);
    }

    public sealed class ProductImageService
        : IProductImageService
    {
        public async Task<ServiceResult<ProductImage>>
            CreateImageAsync(
                int productId,
                CreateProductImageRequest request,
                IProductImageValidator validator,
                ApplicationDbContext dbContext,
                CancellationToken cancellationToken = default)
        {
            if (request.File is null)
            {
                return Failure(
                    SellerProductErrorCodes.ImageFileRequired,
                    "An image file is required.");
            }

            if (request.DisplayOrder < 1)
            {
                return Failure(
                    SellerProductErrorCodes.InvalidProduct,
                    "DisplayOrder must be greater than zero.");
            }

            if (await dbContext.ProductImages.AnyAsync(
                    image =>
                        image.ProductId == productId &&
                        image.DisplayOrder ==
                            request.DisplayOrder,
                    cancellationToken))
            {
                return Failure(
                    SellerProductErrorCodes.DuplicateDisplayOrder,
                    "Image DisplayOrder must be unique within " +
                    "the product.");
            }

            var validation =
                await validator.ValidateAndGetContentTypeAsync(
                    request.File,
                    cancellationToken);

            if (!validation.IsValid)
            {
                return Failure(
                    MapValidationError(validation.Error),
                    validation.Error ??
                    "The image file is invalid.");
            }

            var imageData = await ReadBytesAsync(
                request.File,
                cancellationToken);
            if (imageData is null)
            {
                return Failure(
                    SellerProductErrorCodes.ImageFileInvalid,
                    "The image file could not be read.");
            }

            await using var transaction =
                await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                if (request.IsPrimary)
                {
                    var currentPrimaries = await dbContext.ProductImages
                        .Where(image =>
                            image.ProductId == productId &&
                            image.IsPrimary)
                        .ToListAsync(cancellationToken);

                    foreach (var currentPrimary in currentPrimaries)
                    {
                        currentPrimary.IsPrimary = false;
                    }

                    if (currentPrimaries.Count > 0)
                    {
                        await dbContext.SaveChangesAsync(
                            cancellationToken);
                    }
                }

                var image = new ProductImage
                {
                    ProductId = productId,
                    ImageData = imageData,
                    ContentType = validation.ContentType!,
                    OriginalFileName = Path.GetFileName(
                        request.File.FileName),
                    AltText = NormalizeOptional(request.AltText),
                    DisplayOrder = request.DisplayOrder,
                    IsPrimary = request.IsPrimary,
                    CreatedDate = DateTime.UtcNow
                };

                dbContext.ProductImages.Add(image);
                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return ServiceResult<ProductImage>.Success(image);
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                await transaction.RollbackAsync(cancellationToken);
                dbContext.ChangeTracker.Clear();

                return DatabaseExceptionClassifier.MentionsConstraint(
                        exception,
                        "UQ_PRODUCT_IMAGE_Order")
                    ? Failure(
                        SellerProductErrorCodes.DuplicateDisplayOrder,
                        "Image DisplayOrder must be unique within the product.")
                    : Failure(
                        SellerProductErrorCodes.ImageConcurrencyConflict,
                        "Product images changed at the same time. Refresh and try again.");
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        public async Task<ServiceResult<ProductImage>>
            UpdateImageAsync(
                int imageId,
                UpdateProductImageRequest request,
                IProductImageValidator validator,
                ApplicationDbContext dbContext,
                CancellationToken cancellationToken = default)
        {
            var image = await dbContext.ProductImages
                .SingleOrDefaultAsync(
                    item => item.ImageId == imageId,
                    cancellationToken);

            if (image is null)
            {
                return Failure(
                    SellerProductErrorCodes.ImageNotFound,
                    "The product image was not found.");
            }

            if (request.DisplayOrder.HasValue)
            {
                if (request.DisplayOrder.Value < 1)
                {
                    return Failure(
                        SellerProductErrorCodes.InvalidProduct,
                        "DisplayOrder must be greater than zero.");
                }

                if (await dbContext.ProductImages.AnyAsync(
                        item =>
                            item.ProductId == image.ProductId &&
                            item.ImageId != imageId &&
                            item.DisplayOrder ==
                                request.DisplayOrder.Value,
                        cancellationToken))
                {
                    return Failure(
                        SellerProductErrorCodes
                            .DuplicateDisplayOrder,
                        "Image DisplayOrder must be unique " +
                        "within the product.");
                }
            }

            if (request.File is not null)
            {
                var validation =
                    await validator.ValidateAndGetContentTypeAsync(
                        request.File,
                        cancellationToken);

                if (!validation.IsValid)
                {
                    return Failure(
                        MapValidationError(validation.Error),
                        validation.Error ??
                        "The image file is invalid.");
                }

                var imageData = await ReadBytesAsync(
                    request.File,
                    cancellationToken);
                if (imageData is null)
                {
                    return Failure(
                        SellerProductErrorCodes.ImageFileInvalid,
                        "The image file could not be read.");
                }

                image.ImageData = imageData;
                image.ContentType = validation.ContentType!;
                image.OriginalFileName = Path.GetFileName(
                    request.File.FileName);
            }

            if (request.AltText is not null)
            {
                image.AltText =
                    NormalizeOptional(request.AltText);
            }

            if (request.DisplayOrder.HasValue)
            {
                image.DisplayOrder = request.DisplayOrder.Value;
            }

            await using var transaction =
                await dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                if (request.IsPrimary == true)
                {
                    var currentPrimaries = await dbContext.ProductImages
                        .Where(item =>
                            item.ProductId == image.ProductId &&
                            item.ImageId != imageId &&
                            item.IsPrimary)
                        .ToListAsync(cancellationToken);

                    foreach (var currentPrimary in currentPrimaries)
                    {
                        currentPrimary.IsPrimary = false;
                    }

                    if (currentPrimaries.Count > 0)
                    {
                        await dbContext.SaveChangesAsync(
                            cancellationToken);
                    }

                    image.IsPrimary = true;
                }
                else if (request.IsPrimary == false)
                {
                    image.IsPrimary = false;
                }

                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return ServiceResult<ProductImage>.Success(image);
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                await transaction.RollbackAsync(cancellationToken);
                dbContext.ChangeTracker.Clear();

                return DatabaseExceptionClassifier.MentionsConstraint(
                        exception,
                        "UQ_PRODUCT_IMAGE_Order")
                    ? Failure(
                        SellerProductErrorCodes.DuplicateDisplayOrder,
                        "Image DisplayOrder must be unique within the product.")
                    : Failure(
                        SellerProductErrorCodes.ImageConcurrencyConflict,
                        "Product images changed at the same time. Refresh and try again.");
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        public async Task<ServiceResult<(byte[] ImageData,
            string ContentType)>> GetImageContentAsync(
                int imageId,
                ApplicationDbContext dbContext,
                CancellationToken cancellationToken = default)
        {
            var image = await dbContext.ProductImages
                .AsNoTracking()
                .Where(item => item.ImageId == imageId)
                .Select(item => new
                {
                    item.ImageData,
                    item.ContentType
                })
                .SingleOrDefaultAsync(cancellationToken);

            if (image is null)
            {
                return ServiceResult<(byte[], string)>.Failure(
                    SellerProductErrorCodes.ImageNotFound,
                    "The product image was not found.");
            }

            return ServiceResult<(byte[], string)>.Success(
                (image.ImageData, image.ContentType));
        }

        private static async Task<byte[]?> ReadBytesAsync(
            IFormFile file,
            CancellationToken cancellationToken)
        {
            try
            {
                await using var stream = file.OpenReadStream();
                using var memory = new MemoryStream(
                    checked((int)file.Length));
                await stream.CopyToAsync(
                    memory,
                    cancellationToken);
                return memory.ToArray();
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch
            {
                return null;
            }
        }

        private static string MapValidationError(
            string? error)
        {
            if (error?.Contains(
                    "5 MB",
                    StringComparison.OrdinalIgnoreCase) == true)
            {
                return SellerProductErrorCodes.ImageFileTooLarge;
            }

            if (error?.Contains(
                    "empty",
                    StringComparison.OrdinalIgnoreCase) == true)
            {
                return SellerProductErrorCodes.ImageFileEmpty;
            }

            if (error?.Contains(
                    "not supported",
                    StringComparison.OrdinalIgnoreCase) == true)
            {
                return SellerProductErrorCodes
                    .ImageTypeNotSupported;
            }

            return SellerProductErrorCodes.ImageFileInvalid;
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static ServiceResult<ProductImage> Failure(
            string code,
            string message)
        {
            return ServiceResult<ProductImage>.Failure(
                code,
                message);
        }
    }
}
