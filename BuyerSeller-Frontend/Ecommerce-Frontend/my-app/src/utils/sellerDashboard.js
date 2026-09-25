import { defaultSellerDashboardLayout } from "../data/seller/sellerDashboardLayout.js";

const PENDING_FULFILMENT_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
]);

const toFiniteNonNegativeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : 0;
};

const toLocalDateId = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const cloneDefaultLayout = () =>
  defaultSellerDashboardLayout.map((widget) => ({
    ...widget,
  }));

export const getSellerDashboardOrders = (
  orderResult
) => {
  if (Array.isArray(orderResult)) {
    return orderResult;
  }

  return Array.isArray(orderResult?.orders)
    ? orderResult.orders
    : [];
};

export const getSellerRecentOrderPreviews = (
  recentOrders
) =>
  (Array.isArray(recentOrders) ? recentOrders : [])
    .slice(0, 5)
    .map((order, index) => {
      const items = Array.isArray(order?.items)
        ? order.items
        : [];
      const firstItem = items[0] || null;

      return {
        key:
          order?.orderId ||
          order?.orderNumber ||
          `order-${index}`,
        order,
        firstItem,
        productName: String(
          firstItem?.productName || ""
        ),
        additionalItemCount: Math.max(
          0,
          items.length - 1
        ),
        status: String(
          order?.status || "PENDING"
        ).toUpperCase(),
      };
    });

export const buildSellerDashboardStatistics = ({
  totalProducts = 0,
  orders = [],
  currencyCode = "EUR",
} = {}) => {
  const safeOrders = Array.isArray(orders)
    ? orders
    : [];
  const deliveredOrders = safeOrders.filter(
    (order) =>
      String(order?.status || "").toUpperCase() ===
      "DELIVERED"
  );
  const resolvedCurrency =
    deliveredOrders.find((order) => order?.currencyCode)
      ?.currencyCode ||
    safeOrders.find((order) => order?.currencyCode)
      ?.currencyCode ||
    currencyCode ||
    "EUR";

  return [
    {
      id: "total-products",
      titleKey: "dashboard.totalProducts",
      value: toFiniteNonNegativeNumber(totalProducts),
      format: "number",
      icon: "cube",
      color: "purple",
      periodKey: "dashboard.currentData",
    },
    {
      id: "pending-orders",
      titleKey: "dashboard.pendingOrders",
      value: safeOrders.filter((order) =>
        PENDING_FULFILMENT_STATUSES.has(
          String(order?.status || "").toUpperCase()
        )
      ).length,
      format: "number",
      icon: "bag",
      color: "orange",
      periodKey: "dashboard.currentData",
    },
    {
      id: "completed-orders",
      titleKey: "dashboard.completedOrders",
      value: deliveredOrders.length,
      format: "number",
      icon: "users",
      color: "blue",
      periodKey: "dashboard.currentData",
    },
    {
      id: "revenue",
      titleKey: "dashboard.revenue",
      value: deliveredOrders.reduce(
        (total, order) =>
          total +
          toFiniteNonNegativeNumber(order?.totalAmount),
        0
      ),
      format: "currency",
      currencyCode: String(
        resolvedCurrency
      ).toUpperCase(),
      icon: "currency",
      color: "green",
      periodKey: "dashboard.currentData",
    },
  ];
};

export const buildSellerWeeklySales = (
  orders = [],
  now = new Date(),
  fallbackCurrencyCode = "EUR"
) => {
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - (6 - index));

    return {
      id: toLocalDateId(date),
      date: date.toISOString(),
      value: 0,
    };
  });
  const daysById = new Map(
    days.map((day) => [day.id, day])
  );
  const safeOrders = Array.isArray(orders)
    ? orders
    : [];
  const deliveredOrders = safeOrders.filter(
    (order) =>
      String(order?.status || "").toUpperCase() ===
      "DELIVERED"
  );

  deliveredOrders.forEach((order) => {
    const orderDate = new Date(order?.orderDate);

    if (Number.isNaN(orderDate.getTime())) {
      return;
    }

    const day = daysById.get(toLocalDateId(orderDate));

    if (day) {
      day.value += toFiniteNonNegativeNumber(
        order?.totalAmount
      );
    }
  });

  const currencyCode = String(
    deliveredOrders.find((order) => order?.currencyCode)
      ?.currencyCode ||
      safeOrders.find((order) => order?.currencyCode)
        ?.currencyCode ||
      fallbackCurrencyCode ||
      "EUR"
  ).toUpperCase();

  return days.map((day) => ({
    ...day,
    currencyCode,
  }));
};

export const getWeeklySalesChartModel = (
  weeklySales
) => {
  const sales = (
    Array.isArray(weeklySales) ? weeklySales : []
  ).map((sale, index) => ({
    id: sale?.id || `sale-${index}`,
    date: sale?.date || "",
    value: toFiniteNonNegativeNumber(sale?.value),
    currencyCode: sale?.currencyCode || "EUR",
  }));
  const maxValue = Math.max(
    0,
    ...sales.map((sale) => sale.value)
  );

  if (sales.length === 0 || maxValue === 0) {
    return {
      sales,
      maxValue,
      hasSales: false,
      points: [],
      linePoints: "",
    };
  }

  const chartMaximum = maxValue * 1.15;
  const points = sales.map((sale, index) => {
    const x =
      sales.length === 1
        ? 50
        : (index / (sales.length - 1)) * 100;
    const y =
      90 - (sale.value / chartMaximum) * 75;

    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 90,
    };
  });

  return {
    sales,
    maxValue,
    hasSales: true,
    points,
    linePoints: points
      .map((point) => `${point.x},${point.y}`)
      .join(" "),
  };
};

export const validateSellerDashboardLayout = (
  layout
) => {
  if (!Array.isArray(layout)) {
    return cloneDefaultLayout();
  }

  const knownWidgets = new Map(
    defaultSellerDashboardLayout.map((widget) => [
      widget.id,
      widget,
    ])
  );
  const seenIds = new Set();
  const isValid =
    layout.length === knownWidgets.size &&
    layout.every((widget) => {
      const valid =
        widget &&
        typeof widget === "object" &&
        knownWidgets.has(widget.id) &&
        typeof widget.visible === "boolean" &&
        !seenIds.has(widget.id);

      if (valid) {
        seenIds.add(widget.id);
      }

      return valid;
    });

  if (!isValid || seenIds.size !== knownWidgets.size) {
    return cloneDefaultLayout();
  }

  return layout.map((widget) => ({
    ...knownWidgets.get(widget.id),
    visible: widget.visible,
  }));
};

export const getSellerDashboardApprovalState = (
  store
) => {
  if (!store) {
    return null;
  }

  const approvalStatus = String(
    store.approvalStatus || "NOT_SUBMITTED"
  ).toUpperCase();
  const storeStatus = String(
    store.storeStatus || "INACTIVE"
  ).toUpperCase();

  if (approvalStatus === "APPROVED") {
    if (storeStatus === "ACTIVE") {
      return null;
    }

    return {
      status: "inactive",
      titleKey: "dashboard.approval.inactiveTitle",
      descriptionKey:
        "dashboard.approval.inactiveDescription",
      route: "/seller/store-profile",
    };
  }

  const state =
    approvalStatus === "REJECTED"
      ? "rejected"
      : approvalStatus === "SUSPENDED" ||
          storeStatus === "SUSPENDED"
        ? "suspended"
        : "pending";

  return {
    status: state,
    titleKey: `dashboard.approval.${state}Title`,
    descriptionKey: `dashboard.approval.${state}Description`,
    route: "/seller/store-profile",
  };
};
