using Microsoft.AspNetCore.Http;
using Shopera.Common.Models;
using Shopera.Features.Admin.Categories.DTOs;

namespace Shopera.Features.Admin.Categories.Contracts
{
    public interface IAdminCategoryService
    {
        Task<ServiceResult<IReadOnlyList<AdminCategoryResponse>>>
            GetAllAsync(int adminUserId);

        Task<ServiceResult<AdminCategoryResponse>> GetByIdAsync(
            int adminUserId,
            int categoryId);

        Task<ServiceResult<AdminCategoryResponse>> CreateAsync(
            int adminUserId,
            CreateAdminCategoryRequest request);

        Task<ServiceResult<AdminCategoryResponse>> UpdateAsync(
            int adminUserId,
            int categoryId,
            UpdateAdminCategoryRequest request);

        Task<ServiceResult<bool>> DeleteAsync(
            int adminUserId,
            int categoryId);

        Task<ServiceResult<AdminCategoryResponse>> UploadImageAsync(
            int adminUserId,
            int categoryId,
            IFormFile image,
            CancellationToken cancellationToken = default);

        Task<ServiceResult<AdminCategoryResponse>> DeleteImageAsync(
            int adminUserId,
            int categoryId,
            CancellationToken cancellationToken = default);
    }
}
