using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shopera.Common.Extensions;
using Shopera.Common.Models;
using Shopera.Domain.Constants;
using Shopera.Features.Admin.Categories.Contracts;
using Shopera.Features.Admin.Categories.DTOs;
using Shopera.Features.Admin.Categories.Models;

namespace Shopera.Features.Admin.Categories.Controllers
{
    [ApiController]
    [Authorize(Roles = AccountRoles.Admin)]
    [Route("api/admin/categories")]
    public sealed class AdminCategoriesController
        : ControllerBase
    {
        private readonly IAdminCategoryService _service;

        public AdminCategoriesController(IAdminCategoryService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<
            AdminCategoryResponse>>> GetAll()
        {
            var result = await _service.GetAllAsync(
                User.GetRequiredUserId());
            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpGet("{categoryId:int}")]
        public async Task<ActionResult<AdminCategoryResponse>>
            GetById(int categoryId)
        {
            var result = await _service.GetByIdAsync(
                User.GetRequiredUserId(),
                categoryId);
            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPost]
        public async Task<ActionResult<AdminCategoryResponse>>
            Create(
                [FromBody] CreateAdminCategoryRequest request)
        {
            var result = await _service.CreateAsync(
                User.GetRequiredUserId(),
                request);

            return result.Succeeded
                ? Created(
                    $"/api/admin/categories/" +
                    $"{result.Value!.CategoryId}",
                    result.Value)
                : Failure(result);
        }

        [HttpPatch("{categoryId:int}")]
        public async Task<ActionResult<AdminCategoryResponse>>
            Update(
                int categoryId,
                [FromBody] UpdateAdminCategoryRequest request)
        {
            var result = await _service.UpdateAsync(
                User.GetRequiredUserId(),
                categoryId,
                request);
            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpPut("{categoryId:int}/image")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<AdminCategoryResponse>> UploadImage(
            int categoryId,
            [FromForm] IFormFile image,
            CancellationToken cancellationToken)
        {
            var result = await _service.UploadImageAsync(
                User.GetRequiredUserId(),
                categoryId,
                image,
                cancellationToken);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpDelete("{categoryId:int}/image")]
        public async Task<ActionResult<AdminCategoryResponse>> DeleteImage(
            int categoryId,
            CancellationToken cancellationToken)
        {
            var result = await _service.DeleteImageAsync(
                User.GetRequiredUserId(),
                categoryId,
                cancellationToken);

            return result.Succeeded
                ? Ok(result.Value)
                : Failure(result);
        }

        [HttpDelete("{categoryId:int}")]
        public async Task<ActionResult> Delete(
            int categoryId)
        {
            var result = await _service.DeleteAsync(
                User.GetRequiredUserId(),
                categoryId);
            return result.Succeeded
                ? NoContent()
                : Failure(result);
        }

        private ActionResult Failure<T>(ServiceResult<T> result)
        {
            var error = new
            {
                Code = result.ErrorCode,
                Message = result.ErrorMessage
            };

            return result.ErrorCode switch
            {
                AdminCategoryErrorCodes.AdminForbidden =>
                    StatusCode(
                        StatusCodes.Status403Forbidden,
                        error),
                AdminCategoryErrorCodes.CategoryNotFound or
                AdminCategoryErrorCodes.ParentNotFound =>
                    NotFound(error),
                AdminCategoryErrorCodes.DuplicateCategory or
                AdminCategoryErrorCodes.CategoryCycle or
                AdminCategoryErrorCodes.CategoryInUse =>
                    Conflict(error),
                _ => BadRequest(error)
            };
        }
    }
}
