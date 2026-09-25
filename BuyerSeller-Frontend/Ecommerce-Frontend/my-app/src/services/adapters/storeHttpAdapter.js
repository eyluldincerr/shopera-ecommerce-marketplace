import {
  STORE_ENDPOINTS,
} from "../../config/apiEndpoints.js";

import axiosClient, {
  HttpClientError,
} from "../axiosClient.js";

import {
  requireEndpoint,
} from "../backendErrors.js";

import {
  mapProductPageDto,
} from "../mappers/productMapper.js";
import {
  mapProductQueryParams,
} from "./productHttpAdapter.js";

import {
  mapStoreDto,
  mapStoreStoryDto,
  mapStoreWriteRequest,
} from "../mappers/storeMapper.js";

const unwrap = (response) =>
  response?.data ?? response;

const unwrapSubmissionStore = (body) =>
  body?.store ?? body?.Store ?? body;

const endpointWithId = (
  endpoint,
  parameter,
  value,
  resource
) => {
  const configured = requireEndpoint(
    endpoint,
    resource
  );

  const token = `:${parameter}`;

  if (!configured.includes(token)) {
    throw new Error(
      `BACKEND_CONTRACT_INVALID:${resource}`
    );
  }

  return configured.replace(
    token,
    encodeURIComponent(String(value))
  );
};

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );

const mapStorePage = (
  body,
  options = {}
) => {
  const items = Array.isArray(body)
    ? body
    : body?.items || body?.stores || [];

  const page = Number(
    body?.page ?? options.page ?? 1
  );

  const totalPages = Number(
    body?.totalPages ?? 0
  );

  return {
    items: items.map(mapStoreDto),
    page,

    pageSize: Number(
      body?.pageSize ??
        options.pageSize ??
        items.length
    ),

    totalCount: Number(
      body?.totalCount ?? items.length
    ),

    totalPages,

    hasMore:
      totalPages > 0
        ? page < totalPages
        : Boolean(body?.hasMore),

    nextCursor:
      body?.nextCursor ?? null,
  };
};

export const storeHttpAdapter = {
  async listPublicStores(options = {}) {
    const endpoint = requireEndpoint(
      STORE_ENDPOINTS.publicList,
      "stores.list"
    );

    const response = await axiosClient.get(
      endpoint,
      {
        params: cleanParams({
          page: options.page,
          pageSize: options.pageSize,
          search: options.search,
        }),

        signal: options.signal,
      }
    );

    return mapStorePage(
      unwrap(response),
      options
    );
  },

  async getPublicStore(
    storeId,
    options = {}
  ) {
    const endpoint = endpointWithId(
      STORE_ENDPOINTS.publicDetail,
      "storeId",
      storeId,
      "stores.detail"
    );

    const response = await axiosClient.get(
      endpoint,
      {
        signal: options.signal,
      }
    );

    return mapStoreDto(unwrap(response));
  },

  async getPublicStoreBySlug(
    storeSlug,
    options = {}
  ) {
    const endpoint = endpointWithId(
      STORE_ENDPOINTS.publicBySlug,
      "storeSlug",
      storeSlug,
      "stores.bySlug"
    );

    const response = await axiosClient.get(
      endpoint,
      {
        signal: options.signal,
      }
    );

    return mapStoreDto(unwrap(response));
  },

  async listPublicStoreProducts(
    storeId,
    options = {}
  ) {
    const endpoint = endpointWithId(
      STORE_ENDPOINTS.publicProducts,
      "storeId",
      storeId,
      "stores.products"
    );

    const response = await axiosClient.get(
      endpoint,
      {
        params: mapProductQueryParams(options),

        signal: options.signal,
      }
    );

    return mapProductPageDto(
      unwrap(response)
    );
  },

  async listStoreStories(options = {}) {
    const endpoint = requireEndpoint(
      STORE_ENDPOINTS.stories,
      "stores.stories"
    );

    const response = await axiosClient.get(
      endpoint,
      {
        signal: options.signal,
      }
    );

    const body = unwrap(response);

    const items = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
        ? body.items
        : Array.isArray(body?.stories)
          ? body.stories
          : null;

    if (!items) {
      const error = new Error(
        "Store Stories response must contain an array."
      );

      error.code =
        "STORE_STORIES_RESPONSE_INVALID";

      throw error;
    }

    return items.map(mapStoreStoryDto);
  },

  // GET /api/seller/store
  async getSellerStore(options = {}) {
    const endpoint = requireEndpoint(
      STORE_ENDPOINTS.sellerStore,
      "seller.store.get"
    );

    try {
      const response =
        await axiosClient.get(endpoint, {
          signal: options.signal,
        });

      return mapStoreDto(
        unwrap(response)
      );
    } catch (error) {
      if (
        error instanceof HttpClientError &&
        error.status === 404 &&
        error.code ===
          "SELLER_STORE_NOT_FOUND"
      ) {
        return null;
      }

      throw error;
    }
  },

  // POST /api/seller/store
  async createSellerStore(
    store,
    options = {}
  ) {
    const endpoint = requireEndpoint(
      STORE_ENDPOINTS.sellerCreate,
      "seller.store.create"
    );

    const response =
      await axiosClient.post(
        endpoint,
        mapStoreWriteRequest(store),
        {
          signal: options.signal,
        }
      );

    const body = unwrap(response);

    return mapStoreDto(
      unwrapSubmissionStore(body)
    );
  },

  // PATCH /api/seller/store
  async updateSellerStore(
    store,
    options = {}
  ) {
    const endpoint = requireEndpoint(
      STORE_ENDPOINTS.sellerUpdate,
      "seller.store.update"
    );

    const response =
      await axiosClient.patch(
        endpoint,
        mapStoreWriteRequest(store),
        {
          signal: options.signal,
        }
      );

    return mapStoreDto(
      unwrap(response)
    );
  },

  // POST /api/seller/store/resubmit
  async resubmitSellerStore(
    options = {}
  ) {
    const endpoint = requireEndpoint(
      STORE_ENDPOINTS.sellerResubmit,
      "seller.store.resubmit"
    );

    const response =
      await axiosClient.post(
        endpoint,
        undefined,
        {
          signal: options.signal,
        }
      );

    const body = unwrap(response);

    return mapStoreDto(
      unwrapSubmissionStore(body)
    );
  },

  // PATCH /api/seller/store/status
  async updateSellerStoreStatus(
    storeStatus,
    options = {}
  ) {
    const endpoint = requireEndpoint(
      STORE_ENDPOINTS.sellerStatus,
      "seller.store.status"
    );

    const response =
      await axiosClient.patch(
        endpoint,
        {
          storeStatus,
        },
        {
          signal: options.signal,
        }
      );

    return mapStoreDto(
      unwrap(response)
    );
  },
};

export default storeHttpAdapter;
