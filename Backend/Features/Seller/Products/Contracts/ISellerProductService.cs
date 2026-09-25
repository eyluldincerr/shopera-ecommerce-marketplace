using Shopera.Common.DTOs;
using Shopera.Common.Models;
using Shopera.Features.Seller.Products.DTOs;

namespace Shopera.Features.Seller.Products.Contracts
{
    public interface ISellerProductService
    {
        Task<ServiceResult<PagedResponse<
            SellerProductListResponse>>> GetMineAsync(
            int sellerUserId,
            string? search,
            string? status,
            int page,
            int pageSize);

        Task<ServiceResult<PagedResponse<
            SellerInventoryItemResponse>>> GetInventoryAsync(
            int sellerUserId,
            string? search,
            int? categoryId,
            string? stockStatus,
            int page,
            int pageSize);

        Task<ServiceResult<SellerProductResponse>> GetAsync(
            int sellerUserId,
            int productId);

        Task<ServiceResult<SellerProductResponse>> CreateAsync(
            int sellerUserId,
            CreateSellerProductRequest request);

        Task<ServiceResult<SellerProductResponse>> UpdateAsync(
            int sellerUserId,
            int productId,
            UpdateSellerProductRequest request);

        Task<ServiceResult<SellerProductResponse>> UpsertInfoAsync(
            int sellerUserId,
            int productId,
            UpsertProductInfoRequest request);

        Task<ServiceResult<SellerProductResponse>> AddImageAsync(
            int sellerUserId,
            int productId,
            CreateProductImageRequest request);

        Task<ServiceResult<SellerProductResponse>> UpdateImageAsync(
            int sellerUserId,
            int productId,
            int imageId,
            UpdateProductImageRequest request);

        Task<ServiceResult<SellerProductResponse>> DeleteImageAsync(
            int sellerUserId,
            int productId,
            int imageId);

        Task<ServiceResult<(byte[] ImageData, string ContentType)>>
            GetImageContentAsync(
                int sellerUserId,
                int productId,
                int imageId);

        Task<ServiceResult<SellerProductResponse>> AddVariantAsync(
            int sellerUserId,
            int productId,
            CreateProductVariantRequest request);

        Task<ServiceResult<SellerProductResponse>> UpdateVariantAsync(
            int sellerUserId,
            int productId,
            int variantId,
            UpdateProductVariantRequest request);

        Task<ServiceResult<SellerProductResponse>> DeleteVariantAsync(
            int sellerUserId,
            int productId,
            int variantId,
            DeleteProductVariantRequest request);

        Task<ServiceResult<SellerProductResponse>> UpdateStatusAsync(
            int sellerUserId,
            int productId,
            UpdateProductStatusRequest request);

        Task<ServiceResult<bool>> DeleteAsync(
            int sellerUserId,
            int productId);
    }
}
