import { REVIEW_ENDPOINTS } from "../../config/apiEndpoints.js";
import axiosClient, { HttpClientError } from "../axiosClient.js";
import { requireEndpoint } from "../backendErrors.js";
import {
  mapMyReviewStateDto,
  mapProductReviewsDto,
  mapReviewDto,
} from "../mappers/reviewMapper.js";

const unwrap = (response) => response?.data ?? response;

const requireProductId = (productId) => {
  const normalized = Number(productId);

  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new HttpClientError("A positive Product ID is required.", {
      status: 400,
      code: "INVALID_PRODUCT_ID",
    });
  }

  return normalized;
};

const productEndpoint = (endpoint, productId, resource) => {
  const configured = requireEndpoint(endpoint, resource);

  if (!configured.includes(":productId")) {
    throw new Error(`BACKEND_CONTRACT_INVALID:${resource}`);
  }

  return configured.replace(
    ":productId",
    encodeURIComponent(String(requireProductId(productId)))
  );
};

export const reviewHttpAdapter = {
  async list(productId, { page = 1, pageSize = 10, signal } = {}) {
    const response = await axiosClient.get(
      productEndpoint(REVIEW_ENDPOINTS.list, productId, "reviews.list"),
      {
        params: { page, pageSize },
        signal,
      }
    );

    return mapProductReviewsDto(unwrap(response));
  },

  async mine(productId, options = {}) {
    const response = await axiosClient.get(
      productEndpoint(REVIEW_ENDPOINTS.mine, productId, "reviews.mine"),
      { signal: options.signal }
    );

    return mapMyReviewStateDto(unwrap(response));
  },

  async create(productId, payload, options = {}) {
    const response = await axiosClient.post(
      productEndpoint(REVIEW_ENDPOINTS.list, productId, "reviews.create"),
      payload,
      { signal: options.signal }
    );

    return mapReviewDto(unwrap(response));
  },

  async updateMine(productId, payload, options = {}) {
    const response = await axiosClient.patch(
      productEndpoint(REVIEW_ENDPOINTS.mine, productId, "reviews.update"),
      payload,
      { signal: options.signal }
    );

    return mapReviewDto(unwrap(response));
  },

  async deleteMine(productId, options = {}) {
    await axiosClient.delete(
      productEndpoint(REVIEW_ENDPOINTS.mine, productId, "reviews.delete"),
      { signal: options.signal }
    );
  },
};

export default reviewHttpAdapter;
