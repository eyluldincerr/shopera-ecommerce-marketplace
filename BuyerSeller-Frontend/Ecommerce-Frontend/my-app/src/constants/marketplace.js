export const ORDER_STATUS = Object.freeze({
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  RETURNED: "RETURNED",
});

export const ORDER_STATUS_CODES = Object.freeze(Object.values(ORDER_STATUS));

export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.RETURNED]: [],
});

export const normalizeOrderStatus = (value) => {
  const normalized = String(value || "")
    .replace(/^orders\.status\./, "")
    .replace(/^status\./, "")
    .trim()
    .toUpperCase();

  return ORDER_STATUS_CODES.includes(normalized)
    ? normalized
    : ORDER_STATUS.PENDING;
};

export const getAllowedOrderStatuses = (order) => {
  const currentStatus = normalizeOrderStatus(
    typeof order === "string" ? order : order?.orderStatus ?? order?.status
  );

  return [...(ORDER_STATUS_TRANSITIONS[currentStatus] || [])];
};

export const isValidOrderStatusTransition = (currentStatus, nextStatus) =>
  getAllowedOrderStatuses(currentStatus).includes(normalizeOrderStatus(nextStatus));

export const ORDER_STATUS_TRANSLATION_KEYS = Object.freeze(
  Object.fromEntries(
    ORDER_STATUS_CODES.map((status) => [
      status,
      `orders.status.${status.toLowerCase()}`,
    ])
  )
);

export const ORDER_STATUS_META = Object.freeze(
  Object.fromEntries(
    ORDER_STATUS_CODES.map((status) => [
      status,
      {
        labelKey: ORDER_STATUS_TRANSLATION_KEYS[status],
        color: status.toLowerCase(),
        readOnly:
          status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.RETURNED,
      },
    ])
  )
);

export const PRODUCT_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  DELETED: "DELETED",
});

export const PRODUCT_STATUS_CODES = Object.freeze(Object.values(PRODUCT_STATUS));

export const PRODUCT_CONDITION = Object.freeze({
  NEW: "NEW",
  USED_LIKE_NEW: "USED_LIKE_NEW",
  USED_GOOD: "USED_GOOD",
  USED_FAIR: "USED_FAIR",
  REFURBISHED: "REFURBISHED",
});

export const PRODUCT_CONDITION_CODES = Object.freeze(
  Object.values(PRODUCT_CONDITION)
);

export const PRODUCT_CONDITION_TRANSLATION_KEYS = Object.freeze(
  Object.fromEntries(
    PRODUCT_CONDITION_CODES.map((condition) => [
      condition,
      `products.conditionCodes.${condition}`,
    ])
  )
);

export const normalizeProductCondition = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (normalized === "USED") {
    return PRODUCT_CONDITION.USED_GOOD;
  }

  return PRODUCT_CONDITION_CODES.includes(normalized)
    ? normalized
    : PRODUCT_CONDITION.NEW;
};

export const normalizeProductStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");

  if (normalized === "LOW_STOCK") {
    return PRODUCT_STATUS.ACTIVE;
  }

  return PRODUCT_STATUS_CODES.includes(normalized)
    ? normalized
    : PRODUCT_STATUS.ACTIVE;
};

export const LOW_STOCK_THRESHOLD = 10;
export const REPORTING_TIME_ZONE = "Europe/Bucharest";

export const STOCK_STATUS = Object.freeze({
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
});

export const getStockStatus = (stock) => {
  const quantity = Number(stock);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return STOCK_STATUS.OUT_OF_STOCK;
  }

  return quantity < LOW_STOCK_THRESHOLD
    ? STOCK_STATUS.LOW_STOCK
    : STOCK_STATUS.IN_STOCK;
};

export const METRIC_ID = Object.freeze({
  TOTAL_PRODUCTS: "TOTAL_PRODUCTS",
  PENDING_ORDERS: "PENDING_ORDERS",
  TOTAL_REVENUE: "TOTAL_REVENUE",
  VISITORS: "VISITORS",
  TOTAL_ORDERS: "TOTAL_ORDERS",
  UNITS_SOLD: "UNITS_SOLD",
  AVERAGE_ORDER_VALUE: "AVERAGE_ORDER_VALUE",
  CURRENT_STOCK: "CURRENT_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  LOW_STOCK: "LOW_STOCK",
  TOTAL_SALES: "TOTAL_SALES",
  AVERAGE_RATING: "AVERAGE_RATING",
});

export const DISCOUNT_TYPE = Object.freeze({
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
});

export const COUPON_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  DISABLED: "DISABLED",
});
