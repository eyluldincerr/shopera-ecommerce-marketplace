import {
  SELLER_ANALYTICS_ENDPOINTS,
} from "../../config/apiEndpoints.js";
import axiosClient, {
  HttpClientError,
} from "../axiosClient.js";
import {
  requireEndpoint,
} from "../backendErrors.js";
import {
  mapSellerAnalyticsDto,
} from "../mappers/sellerAnalyticsMapper.js";

const normalizePeriod = (value) => {
  const normalized = String(value || "ALL_TIME").trim().toUpperCase();
  return ["ALL_TIME", "WEEK", "MONTH"].includes(normalized)
    ? normalized
    : "ALL_TIME";
};

const normalizeYearOffset = (value) => {
  const numeric = Number(value);
  return Number.isInteger(numeric)
    ? Math.min(0, Math.max(-5, numeric))
    : 0;
};

export const sellerAnalyticsHttpAdapter = {
  async getAnalytics(options = {}) {
    const endpoint = requireEndpoint(
      SELLER_ANALYTICS_ENDPOINTS.analytics,
      "seller.analytics"
    );

    const response = await axiosClient.get(endpoint, {
      params: {
        salesPeriod: normalizePeriod(options.salesPeriod),
        categoryPeriod: normalizePeriod(options.categoryPeriod),
        yearOffset: normalizeYearOffset(options.yearOffset),
      },
      signal: options.signal,
    });

    const body = response?.data ?? response;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpClientError(
        "Seller analytics response must be an object.",
        {
          code: "SELLER_ANALYTICS_RESPONSE_INVALID",
          data: body,
        }
      );
    }

    return mapSellerAnalyticsDto(body);
  },
};

export default sellerAnalyticsHttpAdapter;
