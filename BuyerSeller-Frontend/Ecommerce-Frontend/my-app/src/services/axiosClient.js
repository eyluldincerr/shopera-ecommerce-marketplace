import { mapValidationErrors } from "./mappers/marketplaceMappers.js";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "";

export const resolveApiUrl = (value) => {
  const url = String(value ?? "").trim();

  if (!url || /^(?:https?:|blob:|data:)/i.test(url) || !API_BASE_URL) {
    return url;
  }

  return `${API_BASE_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
};
const SUPPORTED_ERROR_STATUSES = new Set([400, 401, 403, 404, 409, 422]);

let sessionProvider = () => null;
let unauthorizedHandler = () => {};
let refreshSession = null;

export const shouldInvalidateSessionOnUnauthorized = () => true;

export class HttpClientError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "HttpClientError";
    this.status = options.status ?? null;
    this.code = options.code || (this.status ? `HTTP_${this.status}` : "NETWORK_ERROR");
    this.data = options.data ?? null;
    this.validationErrors = options.validationErrors || {};
    this.isNetworkError = Boolean(options.isNetworkError);
    this.response = this.status
      ? { data: this.data, status: this.status }
      : undefined;
    this.cause = options.cause;
  }
}

export const configureHttpClientSession = ({
  getAccessToken,
  onUnauthorized,
  refreshAccessToken,
} = {}) => {
  sessionProvider =
    typeof getAccessToken === "function" ? getAccessToken : () => null;
  unauthorizedHandler =
    typeof onUnauthorized === "function" ? onUnauthorized : () => {};
  refreshSession =
    typeof refreshAccessToken === "function" ? refreshAccessToken : null;
};

const getTrustedApiOrigin = () => {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      return "";
    }
  }

  return typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";
};

const isTrustedApiUrl = (value) => {
  if (!/^https?:\/\//i.test(value)) {
    return true;
  }

  const trustedOrigin = getTrustedApiOrigin();
  if (!trustedOrigin) {
    return false;
  }

  try {
    return new URL(value).origin === trustedOrigin;
  } catch {
    return false;
  }
};

const buildUrl = (url, params) => {
  const baseUrl = /^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url}`;

  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, String(item)));
      return;
    }

    query.append(key, String(value));
  });

  const separator = baseUrl.includes("?") ? "&" : "?";
  return query.size ? `${baseUrl}${separator}${query.toString()}` : baseUrl;
};

const parseResponse = async (response, responseType) => {
  if (response.status === 204) {
    return null;
  }

  if (responseType === "blob") {
    return response.blob();
  }

  const contentType = response.headers.get("content-type") || "";

  // ASP.NET Core RFC 7807 ProblemDetails responses use
  // application/problem+json rather than application/json. Treat any JSON
  // media type (including vendor +json types) as JSON so stable error codes
  // and extensions are preserved for the UI.
  if (contentType.toLowerCase().includes("json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
};

const createHttpError = (response, data) => {
  const status = response.status;
  const fallbackMessage = SUPPORTED_ERROR_STATUSES.has(status)
    ? `Request failed with status ${status}.`
    : "Request failed.";

  return new HttpClientError(
    data?.message || data?.detail || data?.title || fallbackMessage,
    {
      status,
      code: data?.code || `HTTP_${status}`,
      data,
      validationErrors: mapValidationErrors(data),
    }
  );
};

const executeRequest = async (url, options, hasRetried = false) => {
  const token = sessionProvider();
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined && options.body !== null;
  const { params, responseType, ...fetchOptions } = options;
  const requestUrl = buildUrl(url, params);

  if (hasBody && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Never forward Shopera's bearer token to an arbitrary absolute URL. This
  // is defense-in-depth against a future service accidentally passing a
  // user-controlled URL into the shared HTTP client.
  if (
    token &&
    !headers.has("Authorization") &&
    isTrustedApiUrl(requestUrl)
  ) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(requestUrl, {
      ...fetchOptions,
      headers,
      body:
        hasBody &&
        headers.get("Content-Type")?.includes("application/json") &&
        typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body,
    });
    const data = await parseResponse(response, responseType);

    if (response.status === 401 && !hasRetried && refreshSession) {
      const refreshed = await refreshSession();

      if (refreshed) {
        return executeRequest(url, options, true);
      }
    }

    if (!response.ok) {
      if (
        response.status === 401 &&
        shouldInvalidateSessionOnUnauthorized()
      ) {
        unauthorizedHandler();
      }

      throw createHttpError(response, data);
    }

    return { data, status: response.status, headers: response.headers };
  } catch (error) {
    if (error instanceof HttpClientError || error?.name === "AbortError") {
      throw error;
    }

    throw new HttpClientError("Network request failed.", {
      code: "NETWORK_ERROR",
      isNetworkError: true,
      cause: error,
    });
  }
};

const request = (method, url, data, config = {}) =>
  executeRequest(url, {
    ...config,
    method,
    body: data,
  });

const axiosClient = {
  request: ({ method = "GET", url, data, ...config }) =>
    request(method.toUpperCase(), url, data, config),
  get: (url, config) => request("GET", url, undefined, config),
  delete: (url, config) => request("DELETE", url, undefined, config),
  post: (url, data, config) => request("POST", url, data, config),
  put: (url, data, config) => request("PUT", url, data, config),
  patch: (url, data, config) => request("PATCH", url, data, config),
};

export default axiosClient;
