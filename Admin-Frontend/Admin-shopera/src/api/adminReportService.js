import { getAdminAccounts } from "./adminAccountService";

import {
  getAdminOrderById,
  getAdminOrders,
} from "./adminOrderService";

import { getAdminProducts } from "./adminProductService";
import { getAdminStoreApplications } from "./adminStoreService";
import { requireAuthenticatedAdmin } from "../auth/authSession";
import { isRealApiMode } from "../auth/authSession";
import { api } from "./apiClient.js";

const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

const paymentStatuses = [
  "PENDING",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CANCELLED",

  /*
    Frontend-computed display value.

    NO_PAYMENT is not stored in PAYMENT.
  */
  "NO_PAYMENT",
];

const productStatuses = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_STOCK",
  "DELETED",
];

const safeArray = (value) => {
  return Array.isArray(value)
    ? value
    : [];
};

const roundCurrency = (value) => {
  return Number(
    Number(value || 0).toFixed(2)
  );
};

const normalizeEnum = (value) => {
  return String(value || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
};

const normalizeRole = (role) => {
  const normalizedRole =
    normalizeEnum(role);

  if (
    normalizedRole === "BUYER" ||
    normalizedRole === "SELLER" ||
    normalizedRole === "ADMIN"
  ) {
    return normalizedRole;
  }

  return "UNKNOWN";
};

const getDateTimeValue = (dateValue) => {
  const date = new Date(dateValue);

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
};

const isWithinDateRange = (
  orderDate,
  dateFrom,
  dateTo
) => {
  const orderTime =
    getDateTimeValue(orderDate);

  if (!orderTime) {
    return false;
  }

  if (dateFrom) {
    const startDate = new Date(
      `${dateFrom}T00:00:00`
    );

    if (
      !Number.isNaN(
        startDate.getTime()
      ) &&
      orderTime <
        startDate.getTime()
    ) {
      return false;
    }
  }

  if (dateTo) {
    const endDate = new Date(
      `${dateTo}T23:59:59.999`
    );

    if (
      !Number.isNaN(
        endDate.getTime()
      ) &&
      orderTime >
        endDate.getTime()
    ) {
      return false;
    }
  }

  return true;
};

const createCountBreakdown = (
  records,
  propertyName,
  allowedValues
) => {
  const safeRecords =
    safeArray(records);

  return allowedValues.map(
    (value) => ({
      status: value,

      count:
        safeRecords.filter(
          (record) =>
            normalizeEnum(
              record?.[
                propertyName
              ]
            ) === value
        ).length,
    })
  );
};

const getPaidAmount = (order) => {
  return safeArray(
    order?.payments
  )
    .filter(
      (payment) =>
        normalizeEnum(
          payment.paymentStatus
        ) === "PAID"
    )
    .reduce(
      (total, payment) =>
        total +
        Number(
          payment.amount || 0
        ),
      0
    );
};

const getFullyRefundedPaymentAmount = (
  order
) => {
  return safeArray(
    order?.payments
  )
    .filter(
      (payment) =>
        normalizeEnum(
          payment.paymentStatus
        ) === "REFUNDED"
    )
    .reduce(
      (total, payment) =>
        total +
        Number(
          payment.amount || 0
        ),
      0
    );
};

const getFullyRefundedPaymentCount = (
  order
) => {
  return safeArray(
    order?.payments
  ).filter(
    (payment) =>
      normalizeEnum(
        payment.paymentStatus
      ) === "REFUNDED"
  ).length;
};

const createPaymentMetrics = (
  order
) => {
  const paidAmount =
    getPaidAmount(order);

  const fullyRefundedPaymentAmount =
    getFullyRefundedPaymentAmount(order);

  const netPaidAmount = Math.max(
    paidAmount -
      fullyRefundedPaymentAmount,
    0
  );

  const orderStatus =
    normalizeEnum(
      order?.orderStatus
    );

  const excludedFromRevenue = [
    "CANCELLED",
    "RETURNED",
  ].includes(orderStatus);

  const recognizedRevenue =
    excludedFromRevenue
      ? 0
      : Math.min(
          netPaidAmount,
          Number(
            order?.totalAmount || 0
          )
        );

  return {
    paidAmount:
      roundCurrency(
        paidAmount
      ),

    fullyRefundedPaymentAmount:
      roundCurrency(
        fullyRefundedPaymentAmount
      ),

    fullyRefundedPaymentCount:
      getFullyRefundedPaymentCount(
        order
      ),

    netPaidAmount:
      roundCurrency(
        netPaidAmount
      ),

    recognizedRevenue:
      roundCurrency(
        recognizedRevenue
      ),
  };
};

const createDailySales = (
  orders
) => {
  const dailySalesMap =
    new Map();

  safeArray(orders).forEach(
    (order) => {
      if (!order?.orderDate) {
        return;
      }

      const dateKey = String(
        order.orderDate
      ).slice(0, 10);

      const currentRecord =
        dailySalesMap.get(
          dateKey
        ) || {
          date: dateKey,
          revenue: 0,
          orderCount: 0,
          itemCount: 0,
        };

      currentRecord.revenue +=
        Number(
          order.recognizedRevenue ||
            0
        );

      currentRecord.orderCount +=
        1;

      currentRecord.itemCount +=
        Number(
          order.itemCount || 0
        );

      dailySalesMap.set(
        dateKey,
        currentRecord
      );
    }
  );

  const dailySales = [
    ...dailySalesMap.values(),
  ]
    .map((record) => ({
      ...record,

      revenue:
        roundCurrency(
          record.revenue
        ),
    }))
    .sort(
      (
        firstRecord,
        secondRecord
      ) =>
        getDateTimeValue(
          firstRecord.date
        ) -
        getDateTimeValue(
          secondRecord.date
        )
    );

  if (dailySales.length < 2) {
    return dailySales;
  }

  const recordsByDate = new Map(
    dailySales.map((record) => [
      record.date,
      record,
    ])
  );
  const firstDate = new Date(
    `${dailySales[0].date}T00:00:00Z`
  );
  const lastDate = new Date(
    `${dailySales.at(-1).date}T00:00:00Z`
  );
  const continuousDailySales = [];

  for (
    const date = firstDate;
    date <= lastDate;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const dateKey = date
      .toISOString()
      .slice(0, 10);

    continuousDailySales.push(
      recordsByDate.get(dateKey) || {
        date: dateKey,
        revenue: 0,
        orderCount: 0,
        itemCount: 0,
      }
    );
  }

  return continuousDailySales;
};

const createTopProducts = (
  orders
) => {
  const productMap =
    new Map();

  safeArray(orders).forEach(
    (order) => {
      safeArray(
        order?.items
      ).forEach((item) => {
        const productId =
          Number(
            item?.product
              ?.productId ||
              item?.variant
                ?.productId ||
              0
          );

        if (!productId) {
          return;
        }

        const storeId =
          Number(
            item?.product
              ?.storeId ||
              item?.store
                ?.storeId ||
              0
          ) || null;

        const currentProduct =
          productMap.get(
            productId
          ) || {
            productId,

            productName:
              item?.product
                ?.productName ||
              `Product #${productId}`,

            storeId,

            storeName:
              item?.product
                ?.storeName ||
              item?.store
                ?.storeName ||
              "Unknown store",

            quantitySold: 0,
            revenue: 0,
            orderIds:
              new Set(),
          };

        currentProduct.quantitySold +=
          Number(
            item.quantity || 0
          );

        currentProduct.revenue +=
          Number(
            item.lineTotal || 0
          );

        currentProduct.orderIds.add(
          order.orderId
        );

        productMap.set(
          productId,
          currentProduct
        );
      });
    }
  );

  return [
    ...productMap.values(),
  ]
    .map((product) => ({
      productId:
        product.productId,

      productName:
        product.productName,

      storeId:
        product.storeId,

      storeName:
        product.storeName,

      quantitySold:
        product.quantitySold,

      revenue:
        roundCurrency(
          product.revenue
        ),

      orderCount:
        product.orderIds.size,
    }))
    .sort(
      (
        firstProduct,
        secondProduct
      ) =>
        secondProduct.revenue -
        firstProduct.revenue
    );
};

const createTopStores = (
  orders,
  stores
) => {
  const safeStores =
    safeArray(stores);

  const storeById = new Map(
    safeStores.map((store) => [
      Number(store.storeId),
      store,
    ])
  );

  const storeBySellerUserId =
    new Map(
      safeStores.map((store) => [
        Number(
          store.sellerUserId
        ),
        store,
      ])
    );

  const storePerformanceMap =
    new Map();

  safeArray(orders).forEach(
    (order) => {
      safeArray(
        order?.items
      ).forEach((item) => {
        const itemStoreId =
          Number(
            item?.product
              ?.storeId ||
              item?.store
                ?.storeId ||
              0
          );

        const itemSellerUserId =
          Number(
            item?.store
              ?.sellerUserId ||
              item?.product
                ?.sellerUserId ||
              item?.seller
                ?.userId ||
              0
          );

        const store =
          storeById.get(
            itemStoreId
          ) ||
          storeBySellerUserId.get(
            itemSellerUserId
          ) ||
          item?.store ||
          null;

        const storeId =
          Number(
            store?.storeId ||
              itemStoreId ||
              0
          );

        if (!storeId) {
          return;
        }

        const sellerUserId =
          Number(
            store?.sellerUserId ||
              itemSellerUserId ||
              0
          ) || null;

        const storeName =
          store?.storeName ||
          item?.product
            ?.storeName ||
          `Store #${storeId}`;

        const sellerName =
          store?.sellerName ||
          store?.sellerFullName ||
          store?.fullName ||
          item?.seller
            ?.fullName ||
          item?.product
            ?.sellerOwnerName ||
          "Unknown seller";

        const currentStore =
          storePerformanceMap.get(
            storeId
          ) || {
            storeId,
            storeName,
            sellerUserId,
            sellerName,
            quantitySold: 0,
            revenue: 0,
            orderIds:
              new Set(),
          };

        currentStore.quantitySold +=
          Number(
            item.quantity || 0
          );

        currentStore.revenue +=
          Number(
            item.lineTotal || 0
          );

        currentStore.orderIds.add(
          order.orderId
        );

        storePerformanceMap.set(
          storeId,
          currentStore
        );
      });
    }
  );

  return [
    ...storePerformanceMap.values(),
  ]
    .map((store) => ({
      storeId:
        store.storeId,

      storeName:
        store.storeName,

      sellerUserId:
        store.sellerUserId,

      sellerName:
        store.sellerName,

      quantitySold:
        store.quantitySold,

      revenue:
        roundCurrency(
          store.revenue
        ),

      orderCount:
        store.orderIds.size,
    }))
    .sort(
      (
        firstStore,
        secondStore
      ) =>
        secondStore.revenue -
        firstStore.revenue
    );
};

const createRoleBreakdown = (
  users
) => {
  const roles = [
    "BUYER",
    "SELLER",
    "ADMIN",
  ];

  return roles.map((role) => ({
    role,

    count:
      safeArray(users).filter(
        (user) =>
          normalizeRole(
            user.role
          ) === role
      ).length,
  }));
};

export const getAdminReportData =
  async ({
    dateFrom = "",
    dateTo = "",
    currencyCode = "",
  } = {}) => {
    requireAuthenticatedAdmin();

    if (isRealApiMode()) {
      const dashboard = await api.get("/api/Admin/dashboard");
      const availableCurrencies = (dashboard.recognizedRevenueByCurrency || [])
        .map((item) => item.currencyCode).filter(Boolean);
      const selectedCurrency = currencyCode || availableCurrencies[0] || null;
      const result = selectedCurrency
        ? await api.get("/api/Admin/analytics/sales", {
            query: { currencyCode: selectedCurrency, from: dateFrom, to: dateTo },
          })
        : {
            currencyCode: null,
            paidOrderCount: 0,
            recognizedRevenue: 0,
            averagePaidOrderValue: 0,
            paidSalesGrossValue: 0,
            points: [],
          };
      return {
        generatedAt: new Date().toISOString(),
        availableCurrencies,
        selectedRange: { dateFrom: dateFrom || null, dateTo: dateTo || null },
        currencyCode: result.currencyCode,
        summary: {
          totalOrders: result.paidOrderCount,
          paidOrders: result.paidOrderCount,
          totalRevenue: result.recognizedRevenue,
          averageOrderValue: result.averagePaidOrderValue,
          paidSalesGrossValue: result.paidSalesGrossValue,
        },
        dailySales: (result.points || []).map((point) => ({
          date: point.date, revenue: point.recognizedRevenue,
          paidSales: point.paidSales, orderCount: point.paidOrderCount,
        })),
        unsupportedAnalytics: true,
        orderStatusBreakdown: [], paymentStatusBreakdown: [], productStatusBreakdown: [],
        userRoleBreakdown: [], topProducts: [], topStores: [], recentOrders: [],
      };
    }

    const [
      orderSummaries,
      products,
      users,
      stores,
    ] = await Promise.all([
      getAdminOrders(),
      getAdminProducts(),
      getAdminAccounts(),
      getAdminStoreApplications(),
    ]);

    const safeOrderSummaries =
      safeArray(
        orderSummaries
      );

    const safeProducts =
      safeArray(products);

    const safeUsers =
      safeArray(users);

    const safeStores =
      safeArray(stores);

    const filteredOrderSummaries =
      safeOrderSummaries.filter(
        (order) =>
          isWithinDateRange(
            order.orderDate,
            dateFrom,
            dateTo
          )
      );

    const detailedOrders =
      await Promise.all(
        filteredOrderSummaries.map(
          (order) =>
            getAdminOrderById(
              order.orderId
            )
        )
      );

    const ordersWithMetrics =
      detailedOrders.map(
        (order) => ({
          ...order,

          ...createPaymentMetrics(
            order
          ),
        })
      );

    /*
      Recognized revenue requires:

      1. At least one PAID payment amount.
      2. REFUNDED payment amounts are subtracted.
      3. CANCELLED and RETURNED orders are excluded.
    */
    const revenueOrders =
      ordersWithMetrics.filter(
        (order) =>
          Number(
            order.recognizedRevenue
          ) > 0
      );

    const totalRevenue =
      revenueOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.recognizedRevenue ||
              0
          ),
        0
      );

    const fullyRefundedPaymentAmount =
      ordersWithMetrics.reduce(
        (total, order) =>
          total +
          Number(
            order.fullyRefundedPaymentAmount ||
              0
          ),
        0
      );

    const fullyRefundedPaymentCount =
      ordersWithMetrics.reduce(
        (total, order) =>
          total +
          Number(
            order.fullyRefundedPaymentCount ||
              0
          ),
        0
      );

    const totalDiscount =
      revenueOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.discountAmount ||
              0
          ),
        0
      );

    const totalShipping =
      revenueOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.shippingCost || 0
          ),
        0
      );

    const totalItemsSold =
      revenueOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.itemCount || 0
          ),
        0
      );

    const averageOrderValue =
      revenueOrders.length === 0
        ? 0
        : totalRevenue /
          revenueOrders.length;

    const recentOrders = [
      ...ordersWithMetrics,
    ]
      .sort(
        (
          firstOrder,
          secondOrder
        ) =>
          getDateTimeValue(
            secondOrder.orderDate
          ) -
          getDateTimeValue(
            firstOrder.orderDate
          )
      )
      .slice(0, 5)
      .map((order) => ({
        orderId:
          order.orderId,

        buyerName:
          order.buyerName,

        orderDate:
          order.orderDate,

        orderStatus:
          order.orderStatus,

        paymentStatus:
          order.paymentStatus,

        itemCount:
          order.itemCount,

        totalAmount:
          order.totalAmount,

        recognizedRevenue:
          order.recognizedRevenue,

        fullyRefundedPaymentAmount:
          order.fullyRefundedPaymentAmount,

        fullyRefundedPaymentCount:
          order.fullyRefundedPaymentCount,
      }));

    return {
      generatedAt:
        new Date().toISOString(),

      selectedRange: {
        dateFrom:
          dateFrom || null,

        dateTo:
          dateTo || null,
      },

      summary: {
        totalOrders:
          ordersWithMetrics.length,

        paidOrders:
          revenueOrders.length,

        totalRevenue:
          roundCurrency(
            totalRevenue
          ),

        fullyRefundedPaymentAmount:
          roundCurrency(
            fullyRefundedPaymentAmount
          ),

        fullyRefundedPaymentCount,

        averageOrderValue:
          roundCurrency(
            averageOrderValue
          ),

        totalDiscount:
          roundCurrency(
            totalDiscount
          ),

        totalShipping:
          roundCurrency(
            totalShipping
          ),

        totalItemsSold,

        totalUsers:
          safeUsers.length,

        totalStores:
          safeStores.length,

        approvedStores:
          safeStores.filter(
            (store) =>
              normalizeEnum(
                store.approvalStatus
              ) === "APPROVED"
          ).length,

        totalProducts:
          safeProducts.length,

        activeProducts:
          safeProducts.filter(
            (product) =>
              normalizeEnum(
                product.status
              ) === "ACTIVE"
          ).length,
      },

      dailySales:
        createDailySales(
          revenueOrders
        ),

      orderStatusBreakdown:
        createCountBreakdown(
          ordersWithMetrics,
          "orderStatus",
          orderStatuses
        ),

      /*
        This uses each order's computed current
        payment display status.

        NO_PAYMENT remains frontend-only and is
        never inserted into PAYMENT.
      */
      paymentStatusBreakdown:
        createCountBreakdown(
          ordersWithMetrics,
          "paymentStatus",
          paymentStatuses
        ),

      productStatusBreakdown:
        createCountBreakdown(
          safeProducts,
          "status",
          productStatuses
        ),

      userRoleBreakdown:
        createRoleBreakdown(
          safeUsers
        ),

      topProducts:
        createTopProducts(
          revenueOrders
        ).slice(0, 5),

      topStores:
        createTopStores(
          revenueOrders,
          safeStores
        ).slice(0, 5),

      recentOrders,
    };
  };
