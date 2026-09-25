import {
  ORDER_STATUS_CODES,
  getAllowedOrderStatuses,
} from "../constants/marketplace.js";
import {
  HttpClientError,
} from "./axiosClient.js";
import sellerOrderHttpAdapter from "./adapters/sellerOrderHttpAdapter.js";

const pendingUpdates = new Set();

export class SellerOrderApiError extends Error {
  constructor(status, body = {}, options = {}) {
    super(
      body?.message ||
        options.message ||
        "The Seller Order request failed."
    );
    this.name = "SellerOrderApiError";
    this.status = status ?? null;
    this.code =
      body?.code ||
      options.code ||
      (status ? `HTTP_${status}` : "NETWORK_ERROR");
    this.body = body;
    this.isNetworkError = Boolean(
      options.isNetworkError
    );
    this.authoritativeOrder =
      options.authoritativeOrder || null;
    this.cause = options.cause;
  }
}

const toSellerOrderError = (error) => {
  if (
    error instanceof SellerOrderApiError ||
    error?.name === "AbortError"
  ) {
    return error;
  }

  if (error instanceof HttpClientError) {
    return new SellerOrderApiError(
      error.status,
      {
        ...(error.data &&
        typeof error.data === "object"
          ? error.data
          : {}),
        code: error.code,
        message: error.message,
      },
      {
        code: error.code,
        isNetworkError: error.isNetworkError,
        cause: error,
      }
    );
  }

  return new SellerOrderApiError(null, {}, {
    message: "The Seller Order request failed.",
    cause: error,
  });
};

const normalizeOrderId = (orderId) => {
  const normalized = Number(orderId);

  if (
    !Number.isSafeInteger(normalized) ||
    normalized <= 0
  ) {
    throw new SellerOrderApiError(400, {
      code: "INVALID_ORDER_ID",
      message: "A positive Order ID is required.",
    });
  }

  return normalized;
};

const normalizeRequestedStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  if (!ORDER_STATUS_CODES.includes(normalized)) {
    throw new SellerOrderApiError(400, {
      code: "INVALID_ORDER_STATUS",
      message: "The requested Order status is invalid.",
    });
  }

  return normalized;
};

export const listSellerOrders = async (
  options = {}
) => {
  try {
    return await sellerOrderHttpAdapter.listSellerOrders(
      options
    );
  } catch (error) {
    throw toSellerOrderError(error);
  }
};

export const getSellerOrder = async (
  orderId,
  options = {}
) => {
  const normalizedOrderId = normalizeOrderId(orderId);

  try {
    return await sellerOrderHttpAdapter.getSellerOrder(
      normalizedOrderId,
      options
    );
  } catch (error) {
    throw toSellerOrderError(error);
  }
};

export const getSellerOrderNextStatuses = async (
  orderId,
  options = {}
) => {
  const order = await getSellerOrder(
    orderId,
    options
  );

  return getAllowedOrderStatuses(order.status);
};

export const updateShipmentDetails = async (
  orderId,
  shipment,
  options = {}
) => {
  const normalizedOrderId = normalizeOrderId(orderId);
  const updateKey = String(normalizedOrderId);

  if (pendingUpdates.has(updateKey)) {
    throw new SellerOrderApiError(409, {
      code: "ORDER_UPDATE_IN_PROGRESS",
      message:
        "This Order update is already in progress.",
    });
  }

  pendingUpdates.add(updateKey);

  try {
    return await sellerOrderHttpAdapter.updateSellerShipment(
      normalizedOrderId,
      {
        courierName: String(
          shipment?.courierName || ""
        ).trim(),
        trackingNumber: String(
          shipment?.trackingNumber || ""
        ).trim(),
      },
      options
    );
  } catch (error) {
    throw toSellerOrderError(error);
  } finally {
    pendingUpdates.delete(updateKey);
  }
};

export const updateOrderStatus = async (
  orderId,
  requestedStatus,
  options = {}
) => {
  const normalizedOrderId = normalizeOrderId(orderId);
  const nextStatus = normalizeRequestedStatus(
    requestedStatus
  );
  const updateKey = String(normalizedOrderId);

  if (pendingUpdates.has(updateKey)) {
    throw new SellerOrderApiError(409, {
      code: "ORDER_UPDATE_IN_PROGRESS",
      message:
        "This Order update is already in progress.",
    });
  }

  pendingUpdates.add(updateKey);

  try {
    const currentOrder =
      await sellerOrderHttpAdapter.getSellerOrder(
        normalizedOrderId,
        options
      );

    if (currentOrder.status === nextStatus) {
      throw new SellerOrderApiError(409, {
        code: "ORDER_STATUS_UNCHANGED",
        message:
          "The Order already has that status.",
      });
    }

    const allowedStatuses = getAllowedOrderStatuses(
      currentOrder.status
    );

    if (!allowedStatuses.includes(nextStatus)) {
      throw new SellerOrderApiError(400, {
        code: "INVALID_ORDER_STATUS_TRANSITION",
        message:
          "The requested Order status transition is not allowed.",
      });
    }

    await sellerOrderHttpAdapter.updateSellerOrderStatus(
      normalizedOrderId,
      nextStatus,
      options
    );

    return await sellerOrderHttpAdapter.getSellerOrder(
      normalizedOrderId,
      options
    );
  } catch (error) {
    const normalizedError = toSellerOrderError(error);

    if (
      normalizedError.status === 409 &&
      !normalizedError.authoritativeOrder
    ) {
      try {
        normalizedError.authoritativeOrder =
          await sellerOrderHttpAdapter.getSellerOrder(
            normalizedOrderId,
            options
          );
      } catch {
        // Preserve the original conflict when the refetch also fails.
      }
    }

    throw normalizedError;
  } finally {
    pendingUpdates.delete(updateKey);
  }
};
