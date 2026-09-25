import { PRODUCT_ENDPOINTS } from "../../config/apiEndpoints.js";
import axiosClient from "../axiosClient.js";
import { requireEndpoint } from "../backendErrors.js";
import {
  mapProductDto,
  mapProductCoreUpdateRequest,
  mapProductPageDto,
  mapProductWriteRequest,
  mapCategoryDto,
  mapPublicBrandDto,
  mapSellerProductDto,
  mapSellerProductPageDto,
  mapSellerInventoryPageDto,
  mapProductInfoUpsertRequest,
  mapProductImageCreateRequest,
  mapProductImageUpdateRequest,
  mapProductImageDto,
  mapProductVariantCreateRequest,
  mapProductVariantUpdateRequest,
  mapProductVariantDeleteRequest,
  mapProductStatusUpdateRequest,
} from "../mappers/productMapper.js";

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0)
    )
  );

const PUBLIC_SORT_MAP = Object.freeze({
  newest: "newest",
  price_asc: "price_asc",
  price_desc: "price_desc",
  rating_desc: "rating_desc",
  best_selling: "best_selling",
  name_asc: "name_asc",
  name_desc: "name_desc",
  "price-low": "price_asc",
  "price-high": "price_desc",
  "best-rated": "rating_desc",
  "best-selling": "best_selling",
  "name-asc": "name_asc",
  "name-desc": "name_desc",
});

export const mapProductQueryParams = (options = {}) => {
  const filters = options.filters || {};
  const requestedSort = options.sort || options.sortBy;
  const sort = PUBLIC_SORT_MAP[requestedSort] || "newest";
  const selectedConditions =
    options.condition ?? filters.conditions ?? filters.condition;
  const condition = Array.isArray(selectedConditions)
    ? selectedConditions.length === 1
      ? selectedConditions[0]
      : undefined
    : selectedConditions;

  return cleanParams({
    page: options.page,
    pageSize: options.pageSize,
    search: options.search ?? filters.searchTerm,
    brand: options.brand ?? filters.brand,
    categoryId: options.categoryId ?? filters.categoryId,
    storeId: options.storeId,
    condition,
    minimumPrice:
      options.minimumPrice ?? options.minPrice ?? filters.minPrice,
    maximumPrice:
      options.maximumPrice ?? options.maxPrice ?? filters.maxPrice,
    inStockOnly:
      options.inStockOnly ??
      (filters.inStock === true && filters.outOfStock !== true
        ? true
        : undefined),
    minimumRating: options.minimumRating,
    newArrivalsOnly: options.newArrivalsOnly,
    sort,
  });
};

export const mapSellerProductQueryParams = (options = {}) => {
  const selectedStatuses = options.status ?? options.filters?.statuses;
  const status = Array.isArray(selectedStatuses)
    ? selectedStatuses.length === 1
      ? selectedStatuses[0]
      : undefined
    : selectedStatuses;

  return cleanParams({
    page: options.page,
    pageSize: options.pageSize,
    search: options.search,
    status,
  });
};

export const mapSellerInventoryQueryParams = (options = {}) =>
  cleanParams({
    page: options.page,
    pageSize: options.pageSize,
    search: options.search,
    categoryId: options.categoryId,
    stockStatus: options.stockStatus,
  });

const endpointWithId = (endpoint, parameter, value, resource) => {
  const configured = requireEndpoint(endpoint, resource);
  const token = `:${parameter}`;

  if (!configured.includes(token)) {
    throw new Error(`BACKEND_CONTRACT_INVALID:${resource}`);
  }

  return configured.replace(token, encodeURIComponent(String(value)));
};

const productEndpoint = (endpoint, productId, resource) =>
  endpointWithId(endpoint, "productId", productId, resource);

const childEndpoint = (
  endpoint,
  productId,
  childParameter,
  childId,
  resource
) =>
  endpointWithId(
    productEndpoint(endpoint, productId, resource),
    childParameter,
    childId,
    resource
  );

const unwrap = (response) => response?.data ?? response;

export const productHttpAdapter = {
  async listProducts(options = {}) {
    const endpoint = requireEndpoint(PRODUCT_ENDPOINTS.list, "products.list");
    const response = await axiosClient.get(endpoint, {
      params: mapProductQueryParams(options),
      signal: options.signal,
    });
    return mapProductPageDto(unwrap(response));
  },

  async getProduct(productId, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.detail,
      productId,
      "products.detail"
    );
    const response = await axiosClient.get(endpoint, { signal: options.signal });
    return mapProductDto(unwrap(response));
  },

  async getRelatedProducts(productId, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.related,
      productId,
      "products.related"
    );
    const response = await axiosClient.get(endpoint, {
      params: mapProductQueryParams(options),
      signal: options.signal,
    });
    const body = unwrap(response);
    return Array.isArray(body)
      ? body.map(mapProductDto)
      : mapProductPageDto(body).items;
  },

  async listCategories(options = {}) {
    const endpoint = requireEndpoint(
      PRODUCT_ENDPOINTS.categories,
      "products.categories"
    );
    const response = await axiosClient.get(endpoint, { signal: options.signal });
    const body = unwrap(response);
    const items = Array.isArray(body) ? body : body?.items || body?.categories || [];
    return items.map(mapCategoryDto);
  },

  async listBrands(options = {}) {
    const endpoint = requireEndpoint(
      PRODUCT_ENDPOINTS.brands,
      "products.brands"
    );
    const response = await axiosClient.get(endpoint, {
      params: cleanParams({ limit: options.limit }),
      signal: options.signal,
    });
    const body = unwrap(response);
    const items = Array.isArray(body) ? body : body?.items || body?.brands || [];
    return items
      .map(mapPublicBrandDto)
      .filter((item) => item.brand);
  },

  async listSellerProducts(options = {}) {
    const endpoint = requireEndpoint(
      PRODUCT_ENDPOINTS.sellerList,
      "seller.products.list"
    );
    const response = await axiosClient.get(endpoint, {
      params: mapSellerProductQueryParams(options),
      signal: options.signal,
    });
    return mapSellerProductPageDto(unwrap(response));
  },

  async getSellerProduct(productId, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.sellerDetail,
      productId,
      "seller.products.detail"
    );
    const response = await axiosClient.get(endpoint, {
      signal: options.signal,
    });
    return mapSellerProductDto(unwrap(response));
  },

  async listSellerInventory(options = {}) {
    const endpoint = requireEndpoint(
      PRODUCT_ENDPOINTS.sellerInventoryList,
      "seller.products.inventory.list"
    );
    const response = await axiosClient.get(endpoint, {
      params: mapSellerInventoryQueryParams(options),
      signal: options.signal,
    });
    return mapSellerInventoryPageDto(unwrap(response));
  },

  async createSellerProduct(product, options = {}) {
    const endpoint = requireEndpoint(
      PRODUCT_ENDPOINTS.sellerCreate,
      "seller.products.create"
    );
    const response = await axiosClient.post(
      endpoint,
      mapProductWriteRequest(product),
      { signal: options.signal }
    );
    return mapSellerProductDto(unwrap(response));
  },

  async updateSellerProduct(productId, product, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.sellerUpdate,
      productId,
      "seller.products.update"
    );
    const response = await axiosClient.patch(
      endpoint,
      mapProductCoreUpdateRequest(product),
      { signal: options.signal }
    );
    return mapSellerProductDto(unwrap(response));
  },

  async archiveSellerProduct(productId, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.sellerArchive,
      productId,
      "seller.products.archive"
    );
    const response = await axiosClient.delete(endpoint, {
      signal: options.signal,
    });
    return unwrap(response);
  },

  async upsertSellerProductInfo(productId, information, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.sellerInfo,
      productId,
      "seller.products.info"
    );
    const response = await axiosClient.put(
      endpoint,
      mapProductInfoUpsertRequest(information),
      { signal: options.signal }
    );
    return mapSellerProductDto(unwrap(response));
  },

  async addSellerProductImage(productId, image, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.sellerImages,
      productId,
      "seller.products.images.add"
    );
    const response = await axiosClient.post(
      endpoint,
      mapProductImageCreateRequest(image),
      { signal: options.signal }
    );
    const body = unwrap(response);
    return body?.productId || body?.ProductID || body?.images || body?.Images
      ? mapSellerProductDto(body)
      : mapProductImageDto(body, { productId, sellerOwned: true });
  },

  async updateSellerProductImage(productId, imageId, image, options = {}) {
    const endpoint = childEndpoint(
      PRODUCT_ENDPOINTS.sellerImage,
      productId,
      "imageId",
      imageId,
      "seller.products.images.update"
    );
    const response = await axiosClient.patch(
      endpoint,
      mapProductImageUpdateRequest(image),
      { signal: options.signal }
    );
    const body = unwrap(response);
    return body?.productId || body?.ProductID || body?.images || body?.Images
      ? mapSellerProductDto(body)
      : mapProductImageDto(body, { productId, sellerOwned: true });
  },

  async deleteSellerProductImage(productId, imageId, options = {}) {
    const endpoint = childEndpoint(
      PRODUCT_ENDPOINTS.sellerImage,
      productId,
      "imageId",
      imageId,
      "seller.products.images.delete"
    );
    const response = await axiosClient.delete(endpoint, {
      signal: options.signal,
    });
    return unwrap(response);
  },

  async addSellerProductVariant(productId, variant, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.sellerVariants,
      productId,
      "seller.products.variants.add"
    );
    const response = await axiosClient.post(
      endpoint,
      mapProductVariantCreateRequest(variant),
      { signal: options.signal }
    );
    return mapSellerProductDto(unwrap(response));
  },

  async updateSellerProductVariant(
    productId,
    variantId,
    variant,
    options = {}
  ) {
    const endpoint = childEndpoint(
      PRODUCT_ENDPOINTS.sellerVariant,
      productId,
      "variantId",
      variantId,
      "seller.products.variants.update"
    );
    const response = await axiosClient.patch(
      endpoint,
      mapProductVariantUpdateRequest(variant),
      { signal: options.signal }
    );
    return mapSellerProductDto(unwrap(response));
  },

  async deleteSellerProductVariant(
    productId,
    variantId,
    rowVersion,
    options = {}
  ) {
    const endpoint = childEndpoint(
      PRODUCT_ENDPOINTS.sellerVariant,
      productId,
      "variantId",
      variantId,
      "seller.products.variants.delete"
    );
    const response = await axiosClient.request({
      method: "DELETE",
      url: endpoint,
      data: mapProductVariantDeleteRequest(rowVersion),
      signal: options.signal,
    });
    return mapSellerProductDto(unwrap(response));
  },

  async updateSellerProductStatus(productId, status, options = {}) {
    const endpoint = productEndpoint(
      PRODUCT_ENDPOINTS.sellerStatus,
      productId,
      "seller.products.status"
    );
    const response = await axiosClient.patch(
      endpoint,
      mapProductStatusUpdateRequest(status),
      { signal: options.signal }
    );
    return mapSellerProductDto(unwrap(response));
  },

  async updateSellerInventory(
    productId,
    variantId,
    stockQuantity,
    rowVersion,
    options = {}
  ) {
    const product = await this.updateSellerProductVariant(
      productId,
      variantId,
      { stockQuantity, rowVersion },
      options
    );

    return (
      product.variants.find(
        (variant) => String(variant.variantId) === String(variantId)
      ) || null
    );
  },
};

export default productHttpAdapter;
