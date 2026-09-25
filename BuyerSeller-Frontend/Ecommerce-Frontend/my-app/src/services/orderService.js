import buyerOrderHttpAdapter from "./adapters/buyerOrderHttpAdapter.js";

const orderStatusLabels = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

export const getMyOrders = async (options = {}) => {
  const orders = await buyerOrderHttpAdapter.list(options);

  return orders
    .map((order) => ({
      ...order,
      statusLabel: getOrderStatusLabel(order.status),
    }))
    .sort((firstOrder, secondOrder) =>
      new Date(secondOrder.orderDate) - new Date(firstOrder.orderDate)
    );
};

export const getOrderById = async (orderId, options = {}) => {
  const order = await buyerOrderHttpAdapter.get(orderId, options);

  return {
    ...order,
    statusLabel: getOrderStatusLabel(order.status),
  };
};

export const cancelOrder = async (orderId, reason = "", options = {}) => {
  const order = await buyerOrderHttpAdapter.cancel(orderId, reason, options);

  return {
    ...order,
    statusLabel: getOrderStatusLabel(order.status),
  };
};

export const reorder = async (orderId, options = {}) =>
  buyerOrderHttpAdapter.reorder(orderId, options);

export const archiveOrder = async (orderId, options = {}) =>
  buyerOrderHttpAdapter.archive(orderId, options);

export const getOrderStatusLabel = (status) =>
  orderStatusLabels[status] || status || "";

export const getOrderStatusSteps = (status) => {
  const steps = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

  if (status === "CANCELLED") {
    return steps.map((step, index) => ({
      key: step,
      label: getOrderStatusLabel(step),
      state: index === 0 ? "complete" : "muted",
    }));
  }

  const currentIndex = Math.max(steps.indexOf(status), 0);

  return steps.map((step, index) => ({
    key: step,
    label: getOrderStatusLabel(step),
    state:
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "active"
          : "pending",
  }));
};
