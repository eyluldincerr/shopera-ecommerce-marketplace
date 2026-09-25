import { ORDER_ENDPOINTS } from "../../config/apiEndpoints.js";
import axiosClient, { HttpClientError } from "../axiosClient.js";
import { requireEndpoint } from "../backendErrors.js";
import { mapCartDto } from "../mappers/cartMapper.js";
import { mapOrderDto } from "../mappers/orderMapper.js";

const unwrap = (response) => response?.data ?? response;

const requireOrderId = (orderId) => {
  const normalized = Number(orderId);

  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new HttpClientError("A positive Order ID is required.", {
      status: 400,
      code: "INVALID_ORDER_ID",
    });
  }

  return normalized;
};

const orderEndpoint = (endpoint, orderId, resource) => {
  const configured = requireEndpoint(endpoint, resource);

  if (!configured.includes(":orderId")) {
    throw new Error(`BACKEND_CONTRACT_INVALID:${resource}`);
  }

  return configured.replace(
    ":orderId",
    encodeURIComponent(String(requireOrderId(orderId)))
  );
};

const requireMappedOrder = (body) => {
  const order = mapOrderDto(body);

  if (!order?.orderId) {
    throw new HttpClientError("Buyer Order response is invalid.", {
      code: "BUYER_ORDER_RESPONSE_INVALID",
      data: body,
    });
  }

  return order;
};

export const buyerOrderHttpAdapter = {
  async list(options = {}) {
    const response = await axiosClient.get(
      requireEndpoint(ORDER_ENDPOINTS.buyerList, "buyer.orders.list"),
      { signal: options.signal }
    );
    const body = unwrap(response);

    if (!Array.isArray(body)) {
      throw new HttpClientError("Buyer Order list response must be an array.", {
        code: "BUYER_ORDER_LIST_RESPONSE_INVALID",
        data: body,
      });
    }

    return body.map(requireMappedOrder);
  },

  async get(orderId, options = {}) {
    const response = await axiosClient.get(
      orderEndpoint(
        ORDER_ENDPOINTS.buyerDetail,
        orderId,
        "buyer.orders.detail"
      ),
      { signal: options.signal }
    );

    return requireMappedOrder(unwrap(response));
  },

  async cancel(orderId, reason = "", options = {}) {
    const response = await axiosClient.patch(
      orderEndpoint(
        ORDER_ENDPOINTS.buyerCancel,
        orderId,
        "buyer.orders.cancel"
      ),
      { reason: String(reason ?? "").trim() || null },
      { signal: options.signal }
    );

    return requireMappedOrder(unwrap(response));
  },

  async reorder(orderId, options = {}) {
    const response = await axiosClient.post(
      orderEndpoint(
        ORDER_ENDPOINTS.buyerReorder,
        orderId,
        "buyer.orders.reorder"
      ),
      null,
      { signal: options.signal }
    );

    return mapCartDto(unwrap(response));
  },

  async archive(orderId, options = {}) {
    await axiosClient.patch(
      orderEndpoint(
        ORDER_ENDPOINTS.buyerArchive,
        orderId,
        "buyer.orders.archive"
      ),
      null,
      { signal: options.signal }
    );

    return true;
  },
};

export default buyerOrderHttpAdapter;
