import { getAdminAccounts } from "./adminAccountService";

import {
  getAdminOrderById,
  getAdminOrders,
} from "./adminOrderService";

import { getAdminProducts } from "./adminProductService";
import { getAdminReportData } from "./adminReportService";
import { getAdminStoreApplications } from "./adminStoreService";
import { requireAuthenticatedAdmin } from "../auth/authSession";
import { isRealApiMode } from "../auth/authSession";

const roundNumber = (
  value,
  decimalPlaces = 2
) => {
  return Number(
    Number(value || 0).toFixed(
      decimalPlaces
    )
  );
};

const calculatePercentage = (
  numerator,
  denominator
) => {
  const numericDenominator =
    Number(denominator || 0);

  if (numericDenominator === 0) {
    return 0;
  }

  return roundNumber(
    (Number(numerator || 0) /
      numericDenominator) *
      100
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

const getDateValue = (dateValue) => {
  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
};

const createDateTrend = (
  records,
  dateProperty
) => {
  const trendMap = new Map();

  records.forEach((record) => {
    const dateValue =
      record?.[dateProperty];

    if (!dateValue) {
      return;
    }

    const date = new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return;
    }

    const dateKey = date
      .toISOString()
      .slice(0, 10);

    trendMap.set(
      dateKey,
      (trendMap.get(dateKey) || 0) +
        1
    );
  });

  return [...trendMap.entries()]
    .map(([date, count]) => ({
      date,
      count,
    }))
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
    );
};

const getPaidAmount = (order) => {
  const payments = Array.isArray(
    order?.payments
  )
    ? order.payments
    : [];

  return payments
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
  const payments = Array.isArray(
    order?.payments
  )
    ? order.payments
    : [];

  return payments
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

const getRecognizedRevenue = (
  order
) => {
  const orderStatus =
    normalizeEnum(
      order?.orderStatus
    );

  if (
    ["CANCELLED", "RETURNED"].includes(
      orderStatus
    )
  ) {
    return 0;
  }

  const paidAmount =
    getPaidAmount(order);

  const fullyRefundedPaymentAmount =
    getFullyRefundedPaymentAmount(
      order
    );

  const netPaidAmount = Math.max(
    paidAmount -
      fullyRefundedPaymentAmount,
    0
  );

  return roundNumber(
    Math.min(
      netPaidAmount,
      Number(
        order?.totalAmount || 0
      )
    )
  );
};

const createCategoryPerformance = (
  orders,
  products
) => {
  const productMap = new Map(
    products.map((product) => [
      Number(product.productId),
      product,
    ])
  );

  const categoryMap = new Map();

  orders.forEach((order) => {
    const items = Array.isArray(
      order?.items
    )
      ? order.items
      : [];

    items.forEach((item) => {
      const productId = Number(
        item?.product?.productId ||
          item?.variant?.productId ||
          0
      );

      if (!productId) {
        return;
      }

      const product =
        productMap.get(productId) ||
        item.product ||
        null;

      const categoryId =
        product?.categoryId ?? null;

      const categoryName =
        product?.categoryName ||
        "Uncategorized";

      const categoryKey =
        categoryId === null
          ? "uncategorized"
          : String(categoryId);

      const currentCategory =
        categoryMap.get(
          categoryKey
        ) || {
          categoryId,
          categoryName,
          quantitySold: 0,
          productRevenue: 0,
          orderIds: new Set(),
          productIds: new Set(),
        };

      currentCategory.quantitySold +=
        Number(
          item.quantity || 0
        );

      currentCategory.productRevenue +=
        Number(
          item.lineTotal || 0
        );

      currentCategory.orderIds.add(
        order.orderId
      );

      currentCategory.productIds.add(
        productId
      );

      categoryMap.set(
        categoryKey,
        currentCategory
      );
    });
  });

  return [...categoryMap.values()]
    .map((category) => ({
      categoryId:
        category.categoryId,

      categoryName:
        category.categoryName,

      quantitySold:
        category.quantitySold,

      productRevenue:
        roundNumber(
          category.productRevenue
        ),

      orderCount:
        category.orderIds.size,

      productCount:
        category.productIds.size,
    }))
    .sort(
      (
        firstCategory,
        secondCategory
      ) =>
        secondCategory.productRevenue -
        firstCategory.productRevenue
    );
};

const createDailyPerformance = (
  dailySales
) => {
  const records = Array.isArray(
    dailySales
  )
    ? dailySales
    : [];

  return records.map((record) => {
    const orderCount = Number(
      record.orderCount || 0
    );

    return {
      ...record,

      averageOrderValue:
        orderCount === 0
          ? 0
          : roundNumber(
              Number(
                record.revenue || 0
              ) / orderCount
            ),
    };
  });
};

const createPaymentOverview = (
  detailedOrders
) => {
  const paymentAttempts =
    detailedOrders.flatMap(
      (order) =>
        Array.isArray(
          order?.payments
        )
          ? order.payments
          : []
    );

  const countByStatus = (
    status
  ) => {
    return paymentAttempts.filter(
      (payment) =>
        normalizeEnum(
          payment.paymentStatus
        ) === status
    ).length;
  };

  const paid =
    countByStatus("PAID");

  const pending =
    countByStatus("PENDING");

  const authorized =
    countByStatus("AUTHORIZED");

  const failed =
    countByStatus("FAILED");

  const refunded =
    countByStatus("REFUNDED");

  const partiallyRefunded =
    countByStatus(
      "PARTIALLY_REFUNDED"
    );

  const cancelled =
    countByStatus("CANCELLED");

  const totalAttempts =
    paymentAttempts.length;

  return {
    paid,
    pending,
    authorized,
    failed,
    refunded,
    partiallyRefunded,
    cancelled,
    totalAttempts,

    /*
      Calculated metric, not a PAYMENT
      column or enum value.
    */
    successRate:
      calculatePercentage(
        paid,
        totalAttempts
      ),
  };
};

export const getAdminAnalyticsData =
  async ({ currencyCode = "", from = "", to = "" } = {}) => {
    requireAuthenticatedAdmin();

    if (isRealApiMode()) {
      const reportData = await getAdminReportData({
        currencyCode,
        dateFrom: from,
        dateTo: to,
      });
      return {
        generatedAt: reportData.generatedAt,
        availableCurrencies: reportData.availableCurrencies,
        currencyCode: reportData.currencyCode,
        summary: {
          totalRevenue: reportData.summary.totalRevenue,
          totalOrders: reportData.summary.totalOrders,
          averageOrderValue: reportData.summary.averageOrderValue,
          paidSalesGrossValue: reportData.summary.paidSalesGrossValue,
        },
        dailyPerformance: reportData.dailySales.map((point) => ({
          ...point,
          averageOrderValue: point.orderCount === 0 ? 0 : point.paidSales / point.orderCount,
        })),
        unsupportedAnalytics: true,
        inventoryOverview: null, accountOverview: null, paymentOverview: null,
        categoryPerformance: [], topProducts: [], topStores: [],
        orderStatusBreakdown: [], paymentStatusBreakdown: [], productStatusBreakdown: [],
        userRoleBreakdown: [], accountRegistrationTrend: [], storeCreationTrend: [],
        productCreationTrend: [], recentOrders: [],
      };
    }

    const [
      reportData,
      orderSummaries,
      products,
      users,
      stores,
    ] = await Promise.all([
      getAdminReportData(),
      getAdminOrders(),
      getAdminProducts(),
      getAdminAccounts(),
      getAdminStoreApplications(),
    ]);

    const safeOrderSummaries =
      Array.isArray(
        orderSummaries
      )
        ? orderSummaries
        : [];

    const safeProducts =
      Array.isArray(products)
        ? products
        : [];

    const safeUsers =
      Array.isArray(users)
        ? users
        : [];

    const safeStores =
      Array.isArray(stores)
        ? stores
        : [];

    const detailedOrders =
      await Promise.all(
        safeOrderSummaries.map(
          (order) =>
            getAdminOrderById(
              order.orderId
            )
        )
      );

    const ordersWithRevenue =
      detailedOrders.map(
        (order) => ({
          ...order,

          recognizedRevenue:
            getRecognizedRevenue(
              order
            ),

          fullyRefundedPaymentAmount:
            roundNumber(
              getFullyRefundedPaymentAmount(
                order
              )
            ),
        })
      );

    const revenueOrders =
      ordersWithRevenue.filter(
        (order) =>
          Number(
            order.recognizedRevenue
          ) > 0
      );

    const deliveredOrders =
      ordersWithRevenue.filter(
        (order) =>
          normalizeEnum(
            order.orderStatus
          ) === "DELIVERED"
      );

    const returnedOrders =
      ordersWithRevenue.filter(
        (order) =>
          normalizeEnum(
            order.orderStatus
          ) === "RETURNED"
      );

    const cancelledOrders =
      ordersWithRevenue.filter(
        (order) =>
          normalizeEnum(
            order.orderStatus
          ) === "CANCELLED"
      );

    const sellerAccounts =
      safeUsers.filter(
        (user) =>
          normalizeRole(
            user.role
          ) === "SELLER"
      );

    const approvedStores =
      safeStores.filter(
        (store) =>
          normalizeEnum(
            store.approvalStatus
          ) === "APPROVED"
      );

    const pendingStores =
      safeStores.filter(
        (store) =>
          normalizeEnum(
            store.approvalStatus
          ) === "PENDING"
      );

    const rejectedStores =
      safeStores.filter(
        (store) =>
          normalizeEnum(
            store.approvalStatus
          ) === "REJECTED"
      );

    const activeStores =
      approvedStores.filter(
        (store) =>
          normalizeEnum(
            store.storeStatus
          ) === "ACTIVE"
      );

    const suspendedStores =
      safeStores.filter(
        (store) =>
          normalizeEnum(
            store.storeStatus
          ) === "SUSPENDED"
      );

    const activeProducts =
      safeProducts.filter(
        (product) =>
          normalizeEnum(
            product.status
          ) === "ACTIVE"
      );

    const draftProducts =
      safeProducts.filter(
        (product) =>
          normalizeEnum(
            product.status
          ) === "DRAFT"
      );

    const outOfStockProducts =
      safeProducts.filter(
        (product) =>
          normalizeEnum(
            product.status
          ) === "OUT_OF_STOCK" ||
          Number(
            product.totalStock || 0
          ) === 0
      );

    const deletedProducts =
      safeProducts.filter(
        (product) =>
          normalizeEnum(
            product.status
          ) === "DELETED"
      );

    const totalStock =
      safeProducts.reduce(
        (total, product) =>
          total +
          Number(
            product.totalStock || 0
          ),
        0
      );

    const totalVariants =
      safeProducts.reduce(
        (total, product) =>
          total +
          Number(
            product.variantCount ||
              0
          ),
        0
      );

    const paymentOverview =
      createPaymentOverview(
        detailedOrders
      );

    const reportSummary =
      reportData?.summary || {};

    return {
      generatedAt:
        new Date().toISOString(),

      summary: {
        totalRevenue:
          Number(
            reportSummary.totalRevenue ||
              0
          ),

        totalOrders:
          Number(
            reportSummary.totalOrders ||
              0
          ),

        averageOrderValue:
          Number(
            reportSummary.averageOrderValue ||
              0
          ),

        totalItemsSold:
          Number(
            reportSummary.totalItemsSold ||
              0
          ),

        deliveryRate:
          calculatePercentage(
            deliveredOrders.length,
            detailedOrders.length
          ),

        fullyRefundedPaymentCount:
          paymentOverview.refunded,

        fullyRefundedPaymentRate:
          calculatePercentage(
            paymentOverview.refunded,
            paymentOverview.totalAttempts
          ),

        returnRate:
          calculatePercentage(
            returnedOrders.length,
            detailedOrders.length
          ),

        cancellationRate:
          calculatePercentage(
            cancelledOrders.length,
            detailedOrders.length
          ),

        activeProductRate:
          calculatePercentage(
            activeProducts.length,
            safeProducts.length
          ),

        approvedStoreRate:
          calculatePercentage(
            approvedStores.length,
            safeStores.length
          ),
      },

      inventoryOverview: {
        totalProducts:
          safeProducts.length,

        activeProducts:
          activeProducts.length,

        draftProducts:
          draftProducts.length,

        outOfStockProducts:
          outOfStockProducts.length,

        deletedProducts:
          deletedProducts.length,

        totalVariants,
        totalStock,
      },

      accountOverview: {
        totalUsers:
          safeUsers.length,

        buyers:
          safeUsers.filter(
            (user) =>
              normalizeRole(
                user.role
              ) === "BUYER"
          ).length,

        sellers:
          sellerAccounts.length,

        administrators:
          safeUsers.filter(
            (user) =>
              normalizeRole(
                user.role
              ) === "ADMIN"
          ).length,

        totalStores:
          safeStores.length,

        approvedStores:
          approvedStores.length,

        pendingStores:
          pendingStores.length,

        rejectedStores:
          rejectedStores.length,

        activeStores:
          activeStores.length,

        suspendedStores:
          suspendedStores.length,
      },

      paymentOverview,

      dailyPerformance:
        createDailyPerformance(
          reportData?.dailySales
        ),

      categoryPerformance:
        createCategoryPerformance(
          revenueOrders,
          safeProducts
        ),

      topProducts:
        Array.isArray(
          reportData?.topProducts
        )
          ? reportData.topProducts
          : [],

      topStores:
        Array.isArray(
          reportData?.topStores
        )
          ? reportData.topStores
          : [],

      orderStatusBreakdown:
        Array.isArray(
          reportData?.orderStatusBreakdown
        )
          ? reportData.orderStatusBreakdown
          : [],

      paymentStatusBreakdown:
        Array.isArray(
          reportData?.paymentStatusBreakdown
        )
          ? reportData.paymentStatusBreakdown
          : [],

      productStatusBreakdown:
        Array.isArray(
          reportData?.productStatusBreakdown
        )
          ? reportData.productStatusBreakdown
          : [],

      userRoleBreakdown:
        Array.isArray(
          reportData?.userRoleBreakdown
        )
          ? reportData.userRoleBreakdown
          : [],

      accountRegistrationTrend:
        createDateTrend(
          safeUsers,
          "registrationDate"
        ),

      storeCreationTrend:
        createDateTrend(
          safeStores,
          "createdDate"
        ),

      productCreationTrend:
        createDateTrend(
          safeProducts,
          "createdDate"
        ),

      recentOrders:
        Array.isArray(
          reportData?.recentOrders
        )
          ? reportData.recentOrders
          : [],
    };
  };
