import { getAdminAccounts } from "./adminAccountService";

import {
  getAdminOrderById,
  getAdminOrders,
  getAdminOrdersNeedingAttention,
} from "./adminOrderService";

import { getAdminProducts } from "./adminProductService";
import { getAdminReportData } from "./adminReportService";
import { getAdminStoreApplications } from "./adminStoreService";
import { requireAuthenticatedAdmin } from "../auth/authSession";
import { isRealApiMode } from "../auth/authSession";
import { api } from "./apiClient.js";

const numberFormatter = new Intl.NumberFormat("en-US");

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
});

const normalizeEnum = (value) => {
  return String(value || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
};

const getDateValue = (dateValue) => {
  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
};

const sortNewestFirst = (
  records,
  dateProperty
) => {
  return [...records].sort(
    (firstRecord, secondRecord) =>
      getDateValue(secondRecord[dateProperty]) -
      getDateValue(firstRecord[dateProperty])
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "Date unavailable";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (dateValue) => {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const createInitials = (value) => {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "ST";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const getStoreDisplayName = (store) => {
  return (
    store?.storeName ||
    "Unknown store"
  );
};

/* =====================================================
   DASHBOARD STATISTICS
===================================================== */

const createStatistics = ({
  users,
  approvedStores,
  pendingStores,
  orders,
  totalRevenue,
}) => {
  return [
    {
      id: 1,
      title: "Total Users",
      value: numberFormatter.format(users.length),
      change: "Live",
      comparison: "current account records",
      iconType: "users",
      color: "purple",
      negative: false,
    },
    {
      id: 2,
      title: "Approved Stores",
      value: numberFormatter.format(
        approvedStores.length
      ),
      change: "Live",
      comparison: "approved store records",
      iconType: "sellers",
      color: "blue",
      negative: false,
    },
    {
      id: 3,
      title: "Pending Store Applications",
      value: numberFormatter.format(
        pendingStores.length
      ),
      change: "Live",
      comparison: "awaiting administrator decision",
      iconType: "pendingSellers",
      color: "orange",
      negative: pendingStores.length > 0,
    },
    {
      id: 4,
      title: "Total Orders",
      value: numberFormatter.format(
        orders.length
      ),
      change: "Live",
      comparison: "current order records",
      iconType: "orders",
      color: "light-blue",
      negative: false,
    },
    {
      id: 5,
      title: "Recognized Revenue",
      value: currencyFormatter.format(
        Number(totalRevenue || 0)
      ),
      change: "Live",
      comparison: "net paid non-returned orders",
      iconType: "revenue",
      color: "green",
      negative: false,
    },
  ];
};

/* =====================================================
   PENDING STORE APPLICATIONS
===================================================== */

const createStoreApplications = (
  pendingStores
) => {
  return sortNewestFirst(
    pendingStores,
    "createdDate"
  )
    .slice(0, 5)
    .map((store) => ({
      /*
        The existing dashboard component still receives
        the property name sellerRequests.

        Each object here represents a STORE record.
      */
      id: store.storeId,
      storeId: store.storeId,
      sellerUserId: store.sellerUserId,

      storeName:
        store.storeName ||
        `Store #${store.storeId}`,

      ownerName:
        store.fullName ||
        "Unknown seller",

      fullName:
        store.fullName ||
        "Unknown seller",

      name:
        store.storeName ||
        `Store #${store.storeId}`,

      createdDate:
        store.createdDate,

      joinedDate:
        store.createdDate,

      approvalStatus:
        store.approvalStatus,

      storeStatus:
        store.storeStatus,

      initials: createInitials(
        store.storeName ||
        store.fullName
      ),
    }));
};

/* =====================================================
   ORDER ITEM → STORE RELATION
===================================================== */

const resolveItemStore = ({
  item,
  productMap,
  storeMap,
  storeBySellerUserId,
}) => {
  if (item?.store?.storeId) {
    return item.store;
  }

  const productId = Number(
    item?.product?.productId ??
      item?.variant?.productId ??
      item?.productId ??
      0
  );

  const product =
    productMap.get(productId) ||
    item?.product ||
    null;

  const storeId = Number(
    product?.storeId ??
      item?.storeId ??
      0
  );

  if (storeId) {
    return (
      storeMap.get(storeId) ||
      item?.store ||
      null
    );
  }

  /*
    Temporary compatibility for older frontend mock
    records. The final relationship is PRODUCT.StoreID.
  */
  const sellerUserId = Number(
    product?.sellerUserId ??
      item?.sellerUserId ??
      0
  );

  if (sellerUserId) {
    return (
      storeBySellerUserId.get(
        sellerUserId
      ) || null
    );
  }

  return null;
};

const getOrderStores = ({
  order,
  productMap,
  storeMap,
  storeBySellerUserId,
}) => {
  const storeRecords = [];

  (order.items || []).forEach((item) => {
    const store = resolveItemStore({
      item,
      productMap,
      storeMap,
      storeBySellerUserId,
    });

    if (!store) {
      return;
    }

    const storeId = Number(
      store.storeId || 0
    );

    const existingStore = storeRecords.some(
      (currentStore) =>
        storeId
          ? Number(currentStore.storeId) === storeId
          : currentStore.storeName ===
            getStoreDisplayName(store)
    );

    if (!existingStore) {
      storeRecords.push({
        storeId:
          storeId || null,

        sellerUserId:
          Number(
            store.sellerUserId || 0
          ) || null,

        storeName:
          getStoreDisplayName(store),
      });
    }
  });

  return storeRecords;
};

/* =====================================================
   LATEST ORDERS
===================================================== */

const createLatestOrders = ({
  detailedOrders,
  productMap,
  storeMap,
  storeBySellerUserId,
}) => {
  return detailedOrders.map((order) => {
    const stores = order.store
      ? [order.store]
      : getOrderStores({
          order,
          productMap,
          storeMap,
          storeBySellerUserId,
        });

    const storeNames = stores.map(
      (store) => store.storeName
    );

    const totalAmount = Number(
      order.totalAmount || 0
    );

    return {
      /*
        Final/current fields used by AdminLatestOrders.
      */
      id: order.orderId,
      orderId: order.orderId,

      buyerUserId:
        order.buyerUserId,

      buyerName:
        order.buyerName,

      buyerEmail:
        order.buyerEmail,

      stores,
      storeNames,

      totalAmount,

      currencyCode:
        order.currencyCode,

      paymentStatus:
        order.paymentStatus,

      shipmentStatus:
        order.shipmentStatus,

      orderStatus:
        order.orderStatus,

      orderDate:
        order.orderDate,

      rawDate:
        order.orderDate,

      /*
        Temporary compatibility with older dashboard
        component property names.
      */
      customer:
        order.buyerName,

      seller:
        storeNames.length > 0
          ? storeNames.join(", ")
          : "Store unavailable",

      amount:
        totalAmount,

      status:
        order.orderStatus,

      date:
        formatDate(
          order.orderDate
        ),

      time:
        formatTime(
          order.orderDate
        ),
    };
  });
};

/* =====================================================
   RECENT ACTIVITIES
===================================================== */

const createRecentActivities = ({
  orders,
  stores,
}) => {
  const orderActivities =
    sortNewestFirst(
      orders,
      "orderDate"
    )
      .slice(0, 2)
      .map((order) => ({
        id: `order-${order.orderId}`,
        orderId: order.orderId,

        title: "New Order",

        description:
          `Order #${order.orderId} was placed by ${order.buyerName}.`,

        time: formatTime(
          order.orderDate
        ),

        date:
          formatDate(
            order.orderDate
          ),

        dateValue:
          order.orderDate,

        type: "order",
        entityType: "order",
      }));

  const storeActivities =
    sortNewestFirst(
      stores,
      "createdDate"
    )
      .slice(0, 2)
      .map((store) => ({
        id: `store-${store.storeId}`,

        storeId:
          store.storeId,

        sellerUserId:
          store.sellerUserId,

        /*
          Kept temporarily for older navigation logic.
        */
        userId:
          store.sellerUserId,

        title:
          "Store Application Created",

        description:
          `${store.storeName || `Store #${store.storeId}`} was created by ${store.fullName || "an unknown seller"}.`,

        time:
          formatTime(
            store.createdDate
          ),

        date:
          formatDate(
            store.createdDate
          ),

        dateValue:
          store.createdDate,

        type: "store",
        entityType: "store",

        approvalStatus:
          store.approvalStatus,
      }));

  return [
    ...orderActivities,
    ...storeActivities,
  ]
    .sort(
      (
        firstActivity,
        secondActivity
      ) =>
        getDateValue(
          secondActivity.dateValue
        ) -
        getDateValue(
          firstActivity.dateValue
        )
    )
    .map(
      ({
        dateValue: _dateValue,
        ...activity
      }) => activity
    );
};

/* =====================================================
   SALES CHART DATA
===================================================== */

const createSalesData = (
  dailySales
) => {
  return [...dailySales]
    .sort(
      (
        firstRecord,
        secondRecord
      ) =>
        getDateValue(
          firstRecord.date
        ) -
        getDateValue(
          secondRecord.date
        )
    )
    .map((record) => {
      const orderCount = Number(
        record.orderCount || 0
      );

      return {
        rawDate:
          record.date,

        date: formatDate(
          record.date
        ),

        revenue: Number(
          record.revenue || 0
        ),

        orderCount,

        /*
          Current chart compatibility.
        */
        orders:
          orderCount,

        itemCount: Number(
          record.itemCount || 0
        ),
      };
    });
};

/* =====================================================
   DASHBOARD DATA
===================================================== */

export const getAdminDashboardData =
  async () => {
    requireAuthenticatedAdmin();

    if (isRealApiMode()) {
      const [summary, sellerRequests, latestOrders] = await Promise.all([
        api.get("/api/Admin/dashboard"),
        getAdminStoreApplications(),
        getAdminOrdersNeedingAttention(),
      ]);
      const revenues = summary.recognizedRevenueByCurrency || [];
      const revenueValue = revenues.length === 0
        ? "0"
        : revenues.map(({ currencyCode, amount }) =>
            new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode })
              .format(Number(amount || 0))).join(" · ");
      const currencyCode = revenues[0]?.currencyCode || null;
      const analytics = currencyCode
        ? await api.get("/api/Admin/analytics/sales", { query: { currencyCode } })
        : { points: [] };
      return {
        statistics: [
          { id: 1, title: "Total Users", value: numberFormatter.format(summary.totalUsers), change: "Live", comparison: "current account records", iconType: "users", color: "purple", negative: false },
          { id: 2, title: "Approved Stores", value: numberFormatter.format(summary.approvedStores), change: "Live", comparison: "approved store records", iconType: "sellers", color: "blue", negative: false },
          { id: 3, title: "Pending Store Applications", value: numberFormatter.format(summary.pendingStoreApplications), change: "Live", comparison: "awaiting administrator decision", iconType: "pendingSellers", color: "orange", negative: summary.pendingStoreApplications > 0 },
          { id: 4, title: "Total Orders", value: numberFormatter.format(summary.totalOrders), change: "Live", comparison: "current order records", iconType: "orders", color: "light-blue", negative: false },
          { id: 5, title: "Recognized Revenue", value: revenueValue, change: "Live", comparison: revenues.length > 1 ? `${revenues.length} currencies` : (currencyCode || "no recognized currency"), iconType: "revenue", color: "green", negative: false },
        ],
        sellerRequests,
        latestOrders,
        recentActivities: [],
        recognizedRevenueByCurrency: revenues,
        salesData: (analytics.points || []).map((point) => ({
          rawDate: point.date, date: point.date, revenue: point.recognizedRevenue,
          paidSales: point.paidSales, orders: point.paidOrderCount,
          orderCount: point.paidOrderCount, currencyCode,
        })),
      };
    }

    const [
      users,
      stores,
      products,
      orderSummaries,
      reportData,
    ] = await Promise.all([
      getAdminAccounts(),
      getAdminStoreApplications(),
      getAdminProducts(),
      getAdminOrders(),
      getAdminReportData(),
    ]);

    const approvedStores =
      stores.filter(
        (store) =>
          normalizeEnum(
            store.approvalStatus
          ) === "APPROVED"
      );

    const pendingStores =
      stores.filter(
        (store) =>
          normalizeEnum(
            store.approvalStatus
          ) === "PENDING"
      );

    const latestOrderSummaries =
      sortNewestFirst(
        orderSummaries,
        "orderDate"
      ).slice(0, 5);

    const detailedOrders =
      await Promise.all(
        latestOrderSummaries.map(
          (order) =>
            getAdminOrderById(
              order.orderId
            )
        )
      );

    const productMap = new Map(
      products.map((product) => [
        Number(product.productId),
        product,
      ])
    );

    const storeMap = new Map(
      stores.map((store) => [
        Number(store.storeId),
        store,
      ])
    );

    const storeBySellerUserId =
      new Map(
        stores.map((store) => [
          Number(
            store.sellerUserId
          ),
          store,
        ])
      );

    return {
      statistics:
        createStatistics({
          users,
          approvedStores,
          pendingStores,
          orders:
            orderSummaries,

          totalRevenue:
            reportData.summary
              .totalRevenue,
        }),

      /*
        The response property is retained because the
        current dashboard page expects sellerRequests.

        Its records are STORE applications.
      */
      sellerRequests:
        createStoreApplications(
          pendingStores
        ),

      latestOrders:
        createLatestOrders({
          detailedOrders,
          productMap,
          storeMap,
          storeBySellerUserId,
        }),

      recentActivities:
        createRecentActivities({
          orders:
            latestOrderSummaries,

          stores,
        }),

      salesData:
        createSalesData(
          reportData.dailySales ||
            []
        ),

      productSummary: {
        totalProducts:
          products.length,

        activeProducts:
          products.filter(
            (product) =>
              normalizeEnum(
                product.status
              ) === "ACTIVE"
          ).length,

        draftProducts:
          products.filter(
            (product) =>
              normalizeEnum(
                product.status
              ) === "DRAFT"
          ).length,

        outOfStockProducts:
          products.filter(
            (product) =>
              normalizeEnum(
                product.status
              ) ===
                "OUT_OF_STOCK" ||
              Number(
                product.totalStock ||
                  0
              ) === 0
          ).length,
      },

      storeSummary: {
        totalStores:
          stores.length,

        approvedStores:
          approvedStores.length,

        pendingStores:
          pendingStores.length,

        activeStores:
          stores.filter(
            (store) =>
              normalizeEnum(
                store.storeStatus
              ) === "ACTIVE"
          ).length,

        suspendedStores:
          stores.filter(
            (store) =>
              normalizeEnum(
                store.storeStatus
              ) === "SUSPENDED"
          ).length,
      },
    };
  };
