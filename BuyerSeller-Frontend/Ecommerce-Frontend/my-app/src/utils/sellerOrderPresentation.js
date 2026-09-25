const PENDING_SHIPMENT_STATUSES = new Set([
  "PENDING",
  "PACKED",
]);

const sameLocalDate = (value, now) => {
  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export const getSellerOrderSummary = (
  orders,
  now = new Date()
) => {
  const safeOrders = Array.isArray(orders)
    ? orders
    : [];
  const deliveredToday = safeOrders.filter(
    (order) =>
      order.status === "DELIVERED" &&
      sameLocalDate(order.orderDate, now)
  );

  return {
    todayRevenue: deliveredToday.reduce(
      (total, order) =>
        total + Number(order.totalAmount),
      0
    ),
    currencyCode:
      deliveredToday[0]?.currencyCode ||
      safeOrders[0]?.currencyCode ||
      null,
    pendingShipments: safeOrders.filter((order) =>
      PENDING_SHIPMENT_STATUSES.has(
        String(order.shipment?.status || "").toUpperCase()
      )
    ).length,
    completedOrders: safeOrders.filter(
      (order) => order.status === "DELIVERED"
    ).length,
  };
};

export const getSellerOrdersEmptyState = (
  profile,
  orders = []
) => {
  if (Array.isArray(orders) && orders.length > 0) {
    return null;
  }

  if (!profile?.hasStore) {
    return {
      titleKey: "orders.empty.noStoreTitle",
      descriptionKey:
        "orders.empty.noStoreDescription",
      actionKey: "storeProfile.createStore",
      route: "/seller/store-profile",
    };
  }

  const approvalStatus = String(
    profile.store?.approvalStatus || ""
  )
    .trim()
    .toUpperCase();
  const storeStatus = String(
    profile.store?.storeStatus || ""
  )
    .trim()
    .toUpperCase();

  if (approvalStatus === "PENDING") {
    return {
      titleKey: "orders.empty.pendingTitle",
      descriptionKey:
        "orders.empty.pendingDescription",
    };
  }

  if (approvalStatus === "REJECTED") {
    return {
      titleKey: "orders.empty.rejectedTitle",
      descriptionKey:
        "orders.empty.rejectedDescription",
      actionKey: "orders.empty.viewStoreProfile",
      route: "/seller/store-profile",
    };
  }

  if (
    approvalStatus === "SUSPENDED" ||
    storeStatus === "SUSPENDED"
  ) {
    return {
      titleKey: "orders.empty.suspendedTitle",
      descriptionKey:
        "orders.empty.suspendedDescription",
    };
  }

  if (
    approvalStatus === "APPROVED" &&
    storeStatus === "INACTIVE"
  ) {
    return {
      titleKey: "orders.empty.inactiveTitle",
      descriptionKey:
        "orders.empty.inactiveDescription",
      actionKey: "orders.empty.viewStoreProfile",
      route: "/seller/store-profile",
    };
  }

  return {
    titleKey: "orders.empty.noOrdersTitle",
    descriptionKey:
      "orders.empty.noOrdersDescription",
  };
};
