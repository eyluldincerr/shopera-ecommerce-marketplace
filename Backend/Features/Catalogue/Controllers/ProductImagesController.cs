using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Shopera.Data;
using Shopera.Domain.Constants;

namespace Shopera.Features.Catalogue.Controllers
{
    /// <summary>
    /// Public endpoint for retrieving product image content (binary data).
    /// Serves images only from publicly visible products (approved stores, active status, etc).
    /// </summary>
    [ApiController]
    [Route("api/product-images")]
    public sealed class ProductImagesController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;

        public ProductImagesController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Retrieves the binary content of a product image for a publicly visible product.
        /// Enforces visibility rules: only active products in approved, active stores.
        /// </summary>
        /// <param name="imageId">The image ID</param>
        /// <returns>The image binary data with appropriate Content-Type header</returns>
        [HttpGet("{imageId:int}/content")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetImageContent(int imageId)
        {
            if (imageId < 1)
            {
                return NotFound();
            }

            // Query to find the image and verify visibility
            var image = await (
                    from productImage in _dbContext.ProductImages
                        .AsNoTracking()
                    where productImage.ImageId == imageId
                    join product in _dbContext.Products
                            .AsNoTracking()
                        on productImage.ProductId equals product.ProductId
                    join store in _dbContext.Stores
                            .AsNoTracking()
                        on product.StoreId equals store.StoreId
                    // Only show images from publicly visible products
                    where store.ApprovalStatus == StoreApprovalStatuses.Approved &&
                        store.StoreStatus == StoreStatuses.Active &&
                        (product.Status == ProductStatuses.Active ||
                         product.Status == ProductStatuses.OutOfStock)
                    select new
                    {
                        ImageId = productImage.ImageId,
                        ImageData = productImage.ImageData,
                        ContentType = productImage.ContentType
                    })
                .FirstOrDefaultAsync();

            if (image is null)
            {
                // Return 404 without revealing whether the image/product exists
                return NotFound();
            }

            Response.Headers["Cache-Control"] =
                "public,max-age=3600";

            return File(
                image.ImageData,
                image.ContentType);
        }
    }
}
