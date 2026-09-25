using Shopera.Common.DTOs;
using Shopera.Common.Models;
using Shopera.Features.Catalogue.DTOs;

namespace Shopera.Features.Catalogue.Contracts
{
    public interface IProductCatalogueService
    {
        Task<ServiceResult<
            PagedResponse<PublicProductCardResponse>>>
            GetProductsAsync(ProductCatalogueQuery query);

        Task<ServiceResult<PublicProductDetailResponse>>
            GetProductAsync(int productId);

        Task<ServiceResult<
            PagedResponse<PublicProductCardResponse>>>
            GetRelatedProductsAsync(
                int productId,
                int page,
                int pageSize);

        Task<IReadOnlyList<PublicCategoryResponse>>
            GetCategoriesAsync();

        Task<ServiceResult<(byte[] ImageData, string ContentType)>>
            GetCategoryImageAsync(int categoryId);

        Task<IReadOnlyList<PublicBrandResponse>>
            GetBrandsAsync(int limit);

        Task<PagedResponse<PublicStoreCardResponse>>
            GetStoresAsync(
                string? search,
                int page,
                int pageSize);

        Task<ServiceResult<PublicStoreDetailResponse>>
            GetStoreAsync(int storeId);

        Task<ServiceResult<PublicStoreDetailResponse>>
            GetStoreBySlugAsync(string storeSlug);
    }
}
