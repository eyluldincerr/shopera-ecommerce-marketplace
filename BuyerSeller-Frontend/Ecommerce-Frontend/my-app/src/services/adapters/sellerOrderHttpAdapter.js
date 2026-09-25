import {
  ORDER_ENDPOINTS,
} from "../../config/apiEndpoints.js";
import axiosClient, {
  HttpClientError,
} from "../axiosClient.js";
import {
  requireEndpoint,
} from "../backendErrors.js";
import {
  SellerOrderMappingError,
  mapSellerOrderDto,
} from "../mappers/sellerOrderMapper.js";

const unwrap = (response) =>
  response?.data ?? response;

const requireOrderId = (orderId) => {
  const normalized = Number(orderId);

  if (
    !Number.isSafeInteger(normalized) ||
    normalized <= 0
  ) {
    throw new HttpClientError(
      "A positive Order ID is required.",
      {
        status: 400,
        code: "INVALID_ORDER_ID",
      }
    );
  }

  return normalized;
};

const orderEndpoint = (
  endpoint,
  orderId,
  resource
) => {
  const configured = requireEndpoint(
    endpoint,
    resource
  );
  const token = ":orderId";

  if (!configured.includes(token)) {
    throw new Error(
      `BACKEND_CONTRACT_INVALID:${resource}`
    );
  }

  return configured.replace(
    token,
    encodeURIComponent(
      String(requireOrderId(orderId))
    )
  );
};

const mapResponseOrder = (body) => {
  try {
    return mapSellerOrderDto(body);
  } catch (error) {
    if (error instanceof SellerOrderMappingError) {
      throw new HttpClientError(error.message, {
        code: error.code,
        data: {
          field: error.field,
        },
        cause: error,
      });
    }

    throw error;
  }
};

export const sellerOrderHttpAdapter = {
  async listSellerOrders(options = {}) {
    const endpoint = requireEndpoint(
      ORDER_ENDPOINTS.sellerList,
      "seller.orders.list"
    );
    const response = await axiosClient.get(
      endpoint,
      {
        signal: options.signal,
      }
    );
    const body = unwrap(response);

    if (!Array.isArray(body)) {
      throw new HttpClientError(
        "Seller Order list response must be an array.",
        {
          code: "SELLER_ORDER_RESPONSE_INVALID",
          data: body,
        }
      );
    }

    return body.map(mapResponseOrder);
  },

  async getSellerOrder(orderId, options = {}) {
    const endpoint = orderEndpoint(
      ORDER_ENDPOINTS.sellerDetail,
      orderId,
      "seller.orders.detail"
    );
    const response = await axiosClient.get(
      endpoint,
      {
        signal: options.signal,
      }
    );

    return mapResponseOrder(unwrap(response));
  },

  async updateSellerOrderStatus(
    orderId,
    newStatus,
    options = {}
  ) {
    const endpoint = orderEndpoint(
      ORDER_ENDPOINTS.sellerStatus,
      orderId,
      "seller.orders.status"
    );
    const shipment = options.shipment || {};

    await axiosClient.patch(
      endpoint,
      {
        newStatus,
        ...(newStatus === "SHIPPED"
          ? {
              courierName:
                shipment.courierName || null,
              trackingNumber:
                shipment.trackingNumber || null,
            }
          : {}),
      },
      {
        signal: options.signal,
      }
    );
  },

  async updateSellerShipment(
    orderId,
    shipment,
    options = {}
  ) {
    const endpoint = orderEndpoint(
      ORDER_ENDPOINTS.sellerShipment,
      orderId,
      "seller.orders.shipment"
    );
    const response = await axiosClient.patch(
      endpoint,
      {
        courierName: shipment?.courierName || null,
        trackingNumber: shipment?.trackingNumber || null,
      },
      {
        signal: options.signal,
      }
    );

    return mapResponseOrder(unwrap(response));
  },
};

export default sellerOrderHttpAdapter;
