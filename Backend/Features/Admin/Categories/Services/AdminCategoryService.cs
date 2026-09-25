using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Shopera.Common.Exceptions;
using Shopera.Common.Models;
using Shopera.Data;
using Shopera.Domain.Constants;
using Shopera.Domain.Entities;
using Shopera.Features.Admin.Categories.Contracts;
using Shopera.Features.Admin.Categories.DTOs;
using Shopera.Features.Admin.Categories.Models;
using Shopera.Features.Seller.Products.Services;

namespace Shopera.Features.Admin.Categories.Services
{
    public sealed class AdminCategoryService
        : IAdminCategoryService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IProductImageValidator _imageValidator;

        public AdminCategoryService(
            ApplicationDbContext dbContext,
            IProductImageValidator? imageValidator = null)
        {
            _dbContext = dbContext;
            _imageValidator = imageValidator ??
                new ProductImageValidator();
        }

        public async Task<ServiceResult<IReadOnlyList<
            AdminCategoryResponse>>> GetAllAsync(int adminUserId)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<IReadOnlyList<
                    AdminCategoryResponse>>();
            }

            var items = await (
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
                    select new AdminCategoryResponse
                    {
                        CategoryId = category.CategoryId,
                        CategoryName = category.CategoryName,
                        Description = category.Description,
                        ParentCategoryId =
                            category.ParentCategoryId,
                        ParentCategoryName = parent == null
                            ? null
                            : parent.CategoryName,
                        ManagedByAdminUserId =
                            category.ManagedByAdminUserId,
                        ChildCategoryCount =
                            _dbContext.Categories.Count(item =>
                                item.ParentCategoryId ==
                                    category.CategoryId),
                        ProductCount =
                            _dbContext.Products.Count(item =>
                                item.CategoryId ==
                                    category.CategoryId),
                        HasImage =
                            category.CategoryImageData != null
                    })
                .ToListAsync();

            return ServiceResult<IReadOnlyList<
                AdminCategoryResponse>>.Success(items);
        }

        public async Task<ServiceResult<AdminCategoryResponse>>
            GetByIdAsync(int adminUserId, int categoryId)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<AdminCategoryResponse>();
            }

            if (categoryId <= 0)
            {
                return Invalid("Category ID must be greater than zero.");
            }

            if (!await _dbContext.Categories.AsNoTracking().AnyAsync(item =>
                    item.CategoryId == categoryId))
            {
                return NotFound<AdminCategoryResponse>();
            }

            return ServiceResult<AdminCategoryResponse>.Success(
                await MapAsync(categoryId));
        }

        public async Task<ServiceResult<AdminCategoryResponse>>
            CreateAsync(
                int adminUserId,
                CreateAdminCategoryRequest request)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<AdminCategoryResponse>();
            }

            var name = NormalizeRequired(request.CategoryName);

            if (name is null)
            {
                return Invalid("CategoryName is required.");
            }

            if (request.ParentCategoryId is < 1)
            {
                return Invalid(
                    "ParentCategoryId must be positive.");
            }

            if (request.ParentCategoryId.HasValue &&
                !await _dbContext.Categories.AnyAsync(item =>
                    item.CategoryId ==
                        request.ParentCategoryId.Value))
            {
                return ParentNotFound();
            }

            if (await IsDuplicateAsync(
                    null,
                    name,
                    request.ParentCategoryId))
            {
                return Duplicate();
            }

            var category = new Category
            {
                CategoryName = name,
                Description =
                    NormalizeOptional(request.Description),
                ParentCategoryId =
                    request.ParentCategoryId,
                ManagedByAdminUserId = adminUserId
            };

            _dbContext.Categories.Add(category);
            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return Duplicate();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsReferenceConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return ParentNotFound();
            }

            return ServiceResult<AdminCategoryResponse>.Success(
                await MapAsync(category.CategoryId));
        }

        public async Task<ServiceResult<AdminCategoryResponse>>
            UpdateAsync(
                int adminUserId,
                int categoryId,
                UpdateAdminCategoryRequest request)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<AdminCategoryResponse>();
            }

            var category = await _dbContext.Categories
                .SingleOrDefaultAsync(item =>
                    item.CategoryId == categoryId);

            if (category is null)
            {
                return NotFound<AdminCategoryResponse>();
            }

            var name = request.CategoryName is null
                ? category.CategoryName
                : NormalizeRequired(request.CategoryName);

            if (name is null)
            {
                return Invalid(
                    "CategoryName cannot be empty.");
            }

            var parentId = request.UpdateParentCategory ||
                request.ParentCategoryProvided
                ? request.ParentCategoryId
                : category.ParentCategoryId;

            if (parentId is < 1)
            {
                return Invalid(
                    "ParentCategoryId must be positive.");
            }

            if (parentId == categoryId)
            {
                return Cycle();
            }

            if (parentId.HasValue &&
                !await _dbContext.Categories.AnyAsync(item =>
                    item.CategoryId == parentId.Value))
            {
                return ParentNotFound();
            }

            if (parentId.HasValue &&
                await WouldCreateCycleAsync(
                    categoryId,
                    parentId.Value))
            {
                return Cycle();
            }

            if (await IsDuplicateAsync(
                    categoryId,
                    name,
                    parentId))
            {
                return Duplicate();
            }

            category.CategoryName = name;
            category.Description = request.Description is null
                ? category.Description
                : NormalizeOptional(request.Description);
            category.ParentCategoryId = parentId;
            category.ManagedByAdminUserId = adminUserId;

            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsUniqueConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return Duplicate();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsReferenceConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return ParentNotFound();
            }

            return ServiceResult<AdminCategoryResponse>.Success(
                await MapAsync(categoryId));
        }

        public async Task<ServiceResult<bool>> DeleteAsync(
            int adminUserId,
            int categoryId)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<bool>();
            }

            var category = await _dbContext.Categories
                .SingleOrDefaultAsync(item =>
                    item.CategoryId == categoryId);

            if (category is null)
            {
                return NotFound<bool>();
            }

            if (await _dbContext.Categories.AnyAsync(item =>
                    item.ParentCategoryId == categoryId) ||
                await _dbContext.Products.AnyAsync(item =>
                    item.CategoryId == categoryId))
            {
                return ServiceResult<bool>.Failure(
                    AdminCategoryErrorCodes.CategoryInUse,
                    "Move child categories and products before " +
                    "deleting this category.");
            }

            _dbContext.Categories.Remove(category);
            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException exception)
                when (DatabaseExceptionClassifier.IsReferenceConstraintViolation(exception))
            {
                _dbContext.ChangeTracker.Clear();
                return ServiceResult<bool>.Failure(
                    AdminCategoryErrorCodes.CategoryInUse,
                    "Move child categories and products before deleting this category.");
            }

            return ServiceResult<bool>.Success(true);
        }

        public async Task<ServiceResult<AdminCategoryResponse>>
            UploadImageAsync(
                int adminUserId,
                int categoryId,
                IFormFile image,
                CancellationToken cancellationToken = default)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<AdminCategoryResponse>();
            }

            var category = await _dbContext.Categories
                .SingleOrDefaultAsync(
                    item => item.CategoryId == categoryId,
                    cancellationToken);

            if (category is null)
            {
                return NotFound<AdminCategoryResponse>();
            }

            var validation =
                await _imageValidator.ValidateAndGetContentTypeAsync(
                    image,
                    cancellationToken);

            if (!validation.IsValid ||
                string.IsNullOrWhiteSpace(validation.ContentType))
            {
                return Invalid(
                    validation.Error ??
                    "The category image is not valid.");
            }

            await using var input = image.OpenReadStream();
            await using var buffer = new MemoryStream();
            await input.CopyToAsync(buffer, cancellationToken);

            category.CategoryImageData = buffer.ToArray();
            category.CategoryImageContentType =
                validation.ContentType;
            category.ManagedByAdminUserId = adminUserId;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return ServiceResult<AdminCategoryResponse>.Success(
                await MapAsync(categoryId));
        }

        public async Task<ServiceResult<AdminCategoryResponse>>
            DeleteImageAsync(
                int adminUserId,
                int categoryId,
                CancellationToken cancellationToken = default)
        {
            if (!await IsActiveAdminAsync(adminUserId))
            {
                return Forbidden<AdminCategoryResponse>();
            }

            var category = await _dbContext.Categories
                .SingleOrDefaultAsync(
                    item => item.CategoryId == categoryId,
                    cancellationToken);

            if (category is null)
            {
                return NotFound<AdminCategoryResponse>();
            }

            category.CategoryImageData = null;
            category.CategoryImageContentType = null;
            category.ManagedByAdminUserId = adminUserId;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return ServiceResult<AdminCategoryResponse>.Success(
                await MapAsync(categoryId));
        }

        private async Task<bool> WouldCreateCycleAsync(
            int categoryId,
            int proposedParentId)
        {
            var parents = await _dbContext.Categories
                .AsNoTracking()
                .Select(item => new
                {
                    item.CategoryId,
                    item.ParentCategoryId
                })
                .ToDictionaryAsync(
                    item => item.CategoryId,
                    item => item.ParentCategoryId);

            var currentId = (int?)proposedParentId;
            var visited = new HashSet<int>();

            while (currentId.HasValue &&
                visited.Add(currentId.Value))
            {
                if (currentId.Value == categoryId)
                {
                    return true;
                }

                currentId = parents.TryGetValue(
                    currentId.Value,
                    out var parentId)
                        ? parentId
                        : null;
            }

            return false;
        }

        private Task<bool> IsDuplicateAsync(
            int? categoryId,
            string name,
            int? parentId)
        {
            var normalizedName = name.ToUpper();

            return _dbContext.Categories.AnyAsync(item =>
                (!categoryId.HasValue ||
                 item.CategoryId != categoryId.Value) &&
                item.ParentCategoryId == parentId &&
                item.CategoryName.ToUpper() == normalizedName);
        }

        private async Task<AdminCategoryResponse> MapAsync(
            int categoryId)
        {
            return await (
                    from category in _dbContext.Categories
                    join parent in _dbContext.Categories
                        on category.ParentCategoryId equals
                            (int?)parent.CategoryId
                        into parentGroup
                    from parent in parentGroup.DefaultIfEmpty()
                    where category.CategoryId == categoryId
                    select new AdminCategoryResponse
                    {
                        CategoryId = category.CategoryId,
                        CategoryName = category.CategoryName,
                        Description = category.Description,
                        ParentCategoryId =
                            category.ParentCategoryId,
                        ParentCategoryName = parent == null
                            ? null
                            : parent.CategoryName,
                        ManagedByAdminUserId =
                            category.ManagedByAdminUserId,
                        ChildCategoryCount =
                            _dbContext.Categories.Count(item =>
                                item.ParentCategoryId ==
                                    category.CategoryId),
                        ProductCount =
                            _dbContext.Products.Count(item =>
                                item.CategoryId ==
                                    category.CategoryId),
                        HasImage =
                            category.CategoryImageData != null
                    })
                .SingleAsync();
        }

        private Task<bool> IsActiveAdminAsync(int userId)
        {
            return _dbContext.UserAccounts
                .AsNoTracking()
                .AnyAsync(user =>
                    user.UserId == userId &&
                    user.Role == AccountRoles.Admin &&
                    user.AccountStatus ==
                        AccountStatuses.Active);
        }

        private static string? NormalizeRequired(string value)
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

        private static ServiceResult<T> Forbidden<T>()
        {
            return ServiceResult<T>.Failure(
                AdminCategoryErrorCodes.AdminForbidden,
                "An active ADMIN account is required.");
        }

        private static ServiceResult<T> NotFound<T>()
        {
            return ServiceResult<T>.Failure(
                AdminCategoryErrorCodes.CategoryNotFound,
                "The category was not found.");
        }

        private static ServiceResult<AdminCategoryResponse>
            ParentNotFound()
        {
            return ServiceResult<
                AdminCategoryResponse>.Failure(
                AdminCategoryErrorCodes.ParentNotFound,
                "The parent category was not found.");
        }

        private static ServiceResult<AdminCategoryResponse>
            Duplicate()
        {
            return ServiceResult<
                AdminCategoryResponse>.Failure(
                AdminCategoryErrorCodes.DuplicateCategory,
                "A category with this name and parent already " +
                "exists.");
        }

        private static ServiceResult<AdminCategoryResponse>
            Cycle()
        {
            return ServiceResult<
                AdminCategoryResponse>.Failure(
                AdminCategoryErrorCodes.CategoryCycle,
                "The proposed parent would create a category " +
                "cycle.");
        }

        private static ServiceResult<AdminCategoryResponse>
            Invalid(string message)
        {
            return ServiceResult<
                AdminCategoryResponse>.Failure(
                AdminCategoryErrorCodes.InvalidCategory,
                message);
        }
    }
}
