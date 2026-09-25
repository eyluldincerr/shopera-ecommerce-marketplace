import {
  clearAuthenticatedSession,
  getAccessToken,
} from "../auth/authSession.js";

// Local development keeps relative /api URLs so Vite can proxy them to
// https://localhost:7169. Production can point directly at the deployed
// Shopera API by setting VITE_API_BASE_URL (for example, the MonsterASP
// HTTPS origin). Never hard-code a developer-machine localhost URL here.
export const API_BASE_URL = String(
  import.meta.env?.VITE_API_BASE_URL || "",
)
  .trim()
  .replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      title = "",
      detail = "",
      instance = "",
      errors = null,
      code = "",
      traceId = "",
    } = {},
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.instance = instance;
    this.errors = errors;
    this.code = code;
    this.traceId = traceId;
  }
}

const readBody = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("json")) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiRequest = async (
  path,
  {
    method = "GET",
    body,
    query,
    token = getAccessToken(),
    headers = {},
  } = {},
) => {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const requestOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost:5174";

  // In development API_BASE_URL is empty and the request stays on the Admin
  // origin for Vite to proxy. In production VITE_API_BASE_URL supplies the
  // deployed backend origin, so Vercel does not accidentally receive /api
  // calls that belong to Shopera's ASP.NET Core application.
  const requestBase = API_BASE_URL
    ? `${API_BASE_URL}/`
    : `${requestOrigin.replace(/\/+$/, "")}/`;
  const url = new URL(
    normalizedPath.replace(/^\//, ""),
    requestBase,
  );

  Object.entries(query || {}).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        url.searchParams.set(
          key,
          String(value),
        );
      }
    },
  );

  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization =
      `Bearer ${token}`;
  }

  const isFormData =
    typeof FormData !== "undefined" &&
    body instanceof FormData;

  if (body !== undefined && !isFormData) {
    requestHeaders["Content-Type"] =
      "application/json";
  }

  let response;

  try {
    response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });
  } catch (error) {
    console.error(
      "Shopera API connection error:",
      error,
    );

    throw new ApiError(
      "Unable to connect to the Shopera server. Please make sure the backend is running.",
      {
        status: 0,
      },
    );
  }

  const payload = await readBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthenticatedSession();
    }

    const details =
      payload &&
      typeof payload === "object"
        ? payload
        : {};

    const message =
      details.detail ||
      details.message ||
      details.title ||
      (typeof payload === "string"
        ? payload
        : `Request failed with status ${response.status}.`);

    throw new ApiError(message, {
      status: response.status,
      title: details.title || "",
      detail: details.detail || "",
      instance: details.instance || "",
      errors: details.errors || null,
      code: details.code || "",
      traceId: details.traceId || "",
    });
  }

  return payload;
};

export const api = {
  get: (path, options) =>
    apiRequest(path, {
      ...options,
      method: "GET",
    }),

  post: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: "POST",
      body,
    }),

  put: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: "PUT",
      body,
    }),

  patch: (path, body, options) =>
    apiRequest(path, {
      ...options,
      method: "PATCH",
      body,
    }),

  delete: (path, options) =>
    apiRequest(path, {
      ...options,
      method: "DELETE",
    }),
};