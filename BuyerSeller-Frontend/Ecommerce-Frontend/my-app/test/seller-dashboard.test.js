import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import en from "../src/locales/en.json" with { type: "json" };
import tr from "../src/locales/tr.json" with { type: "json" };
import {
  buildSellerDashboardStatistics,
  buildSellerWeeklySales,
  getSellerDashboardApprovalState,
  getSellerDashboardOrders,
  getSellerRecentOrderPreviews,
  getWeeklySalesChartModel,
  validateSellerDashboardLayout,
} from "../src/utils/sellerDashboard.js";
import { defaultSellerDashboardLayout } from "../src/data/seller/sellerDashboardLayout.js";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
globalThis.window = { dispatchEvent: () => {} };

const { loginUser } = await import(
  "../src/services/authService.js"
);
await loginUser({
  email: "seller@shopera.demo",
  password: "Seller123!",
});
const {
  getSellerDashboardData,
  getSellerDashboardLayout,
} = await import("../src/services/sellerService.js");

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const order = (overrides = {}) => ({
  orderId: 42,
  orderNumber: "ORD-42",
  storeId: 7,
  orderDate: "2026-08-11T10:00:00",
  status: "DELIVERED",
  totalQuantity: 2,
  subtotal: 30,
  discountAmount: 0,
  shippingAmount: 0,
  totalAmount: 30,
  currencyCode: "EUR",
  customerName: "Real Customer",
  customerPhone: null,
  items: [
    {
      variantId: 12,
      productName: "Real Product",
      sku: "REAL-12",
      variantName: null,
      quantity: 1,
      unitPriceAtPurchase: 10,
      subtotal: 10,
    },
    {
      variantId: 13,
      productName: "Second Product",
      sku: "REAL-13",
      variantName: "Blue",
      quantity: 1,
      unitPriceAtPurchase: 20,
      subtotal: 20,
    },
  ],
  shippingAddress: null,
  ...overrides,
});

test("Dashboard accepts current array and object Seller Order result shapes safely", () => {
  const orders = [order()];

  assert.strictEqual(
    getSellerDashboardOrders(orders),
    orders
  );
  assert.strictEqual(
    getSellerDashboardOrders({ orders }),
    orders
  );
  assert.deepEqual(getSellerDashboardOrders(null), []);
  assert.deepEqual(
    getSellerDashboardOrders({ orders: null }),
    []
  );
});

test("Dashboard statistics use only current real values and preserve zero", () => {
  const statistics = buildSellerDashboardStatistics({
    totalProducts: 0,
    orders: [
      order({ status: "PENDING", totalAmount: 500 }),
      order({ orderId: 43, status: "SHIPPED" }),
      order({ orderId: 44, totalAmount: 0 }),
      order({ orderId: 45, totalAmount: 12.5 }),
    ],
  });

  assert.deepEqual(
    Object.fromEntries(
      statistics.map((statistic) => [
        statistic.id,
        statistic.value,
      ])
    ),
    {
      "total-products": 0,
      "pending-orders": 2,
      "completed-orders": 2,
      revenue: 12.5,
    }
  );
  assert.equal(
    statistics.find((item) => item.id === "revenue")
      .currencyCode,
    "EUR"
  );
  assert.equal(
    statistics.every(
      (item) =>
        item.periodKey === "dashboard.currentData" &&
        !("change" in item) &&
        !("isDemoEstimate" in item)
    ),
    true
  );
});

test("weekly sales returns seven real calendar points and chart geometry is always finite", () => {
  const weekly = buildSellerWeeklySales(
    [
      order({
        orderDate: "2026-08-11T10:00:00",
        totalAmount: 25,
      }),
      order({
        orderId: 43,
        orderDate: "2026-08-10T10:00:00",
        totalAmount: 0,
      }),
      order({
        orderId: 44,
        orderDate: "2026-08-09T10:00:00",
        status: "PENDING",
        totalAmount: 900,
      }),
    ],
    new Date("2026-08-11T18:00:00")
  );

  assert.equal(weekly.length, 7);
  assert.equal(weekly[6].id, "2026-08-11");
  assert.equal(weekly[6].value, 25);
  assert.equal(weekly[5].value, 0);

  for (const input of [
    undefined,
    null,
    [],
    weekly.map((sale) => ({ ...sale, value: 0 })),
    [{ id: "one", date: "bad", value: 7 }],
    [{ id: "bad", value: Number.NaN }],
  ]) {
    const model = getWeeklySalesChartModel(input);
    const serialized = JSON.stringify(model);

    assert.doesNotMatch(serialized, /Infinity|NaN/);
    model.points.forEach((point) => {
      assert.equal(Number.isFinite(point.x), true);
      assert.equal(Number.isFinite(point.y), true);
    });
  }
});

test("Recent Orders preview handles empty items and canonical multiple-item orders", () => {
  assert.deepEqual(getSellerRecentOrderPreviews(null), []);

  const previews = getSellerRecentOrderPreviews([
    order({ items: [] }),
    order({ orderId: 43 }),
  ]);

  assert.equal(previews.length, 2);
  assert.equal(previews[0].firstItem, null);
  assert.equal(previews[0].productName, "");
  assert.equal(previews[0].additionalItemCount, 0);
  assert.equal(previews[1].productName, "Real Product");
  assert.equal(previews[1].additionalItemCount, 1);
});

test("pending Store dashboard resolves asynchronously with stable arrays and honest order zeroes", async () => {
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push([options.method, url]);

    if (url === "/api/seller/store") {
      return jsonResponse({
        storeId: 7,
        storeName: "Pending Store",
        approvalStatus: "PENDING",
        storeStatus: "INACTIVE",
      });
    }

    if (
      url ===
      "/api/seller/products?page=1&pageSize=100"
    ) {
      return jsonResponse({
        page: 1,
        pageSize: 100,
        totalCount: 2,
        totalPages: 1,
        items: [
          {
            productId: 31,
            productName: "Rated Product",
            averageRating: 4.5,
            reviewCount: 3,
            minimumPrice: 0,
            totalStock: 4,
            variantCount: 1,
          },
          {
            productId: 32,
            productName: "Best Rated Product",
            averageRating: 5,
            reviewCount: 2,
            minimumPrice: 25,
            totalStock: 20,
            variantCount: 1,
          },
        ],
      });
    }

    if (
      url ===
      "/api/seller/products/inventory?page=1&pageSize=100"
    ) {
      return jsonResponse({
        page: 1,
        pageSize: 100,
        totalCount: 1,
        totalPages: 1,
        items: [
          {
            productId: 31,
            productName: "Low Product",
            variantId: 91,
            sku: "LOW-91",
            stockQuantity: 4,
            status: "ACTIVE",
            rowVersion: "AQ==",
          },
        ],
      });
    }

    if (url === "/api/orders/seller") {
      return jsonResponse([order()]);
    }

    throw new Error(
      `Unexpected request: ${options.method} ${url}`
    );
  };

  const dashboard = await getSellerDashboardData({
    now: new Date("2026-08-11T18:00:00"),
  });

  for (const key of [
    "statistics",
    "weeklySales",
    "recentOrders",
    "lowStockProducts",
    "topRatedProducts",
  ]) {
    assert.equal(Array.isArray(dashboard[key]), true, key);
  }
  assert.equal(dashboard.statistics.length, 4);
  assert.equal(
    dashboard.statistics.find(
      (item) => item.id === "total-products"
    ).value,
    2
  );
  assert.equal(
    dashboard.statistics
      .filter((item) => item.id !== "total-products")
      .every((item) => item.value === 0),
    true
  );
  assert.equal(
    dashboard.weeklySales.every(
      (sale) => sale.value === 0
    ),
    true
  );
  assert.deepEqual(dashboard.recentOrders, []);
  assert.equal(dashboard.lowStockProducts.length, 1);
  assert.equal(dashboard.topRatedProducts.length, 2);
  assert.equal(
    dashboard.topRatedProducts[0].name,
    "Best Rated Product"
  );
  assert.equal(dashboard.topRatedProducts[0].rating, 5);
  assert.equal(
    dashboard.approvalState.titleKey,
    "dashboard.approval.pendingTitle"
  );
  assert.deepEqual(requests, [
    ["GET", "/api/seller/store"],
    ["GET", "/api/seller/products?page=1&pageSize=100"],
    [
      "GET",
      "/api/seller/products/inventory?page=1&pageSize=100",
    ],
    ["GET", "/api/orders/seller"],
  ]);
});

test("saved Dashboard layout accepts only the complete known widget schema", async () => {
  const fallback = validateSellerDashboardLayout({
    stale: true,
  });
  assert.deepEqual(fallback, defaultSellerDashboardLayout);

  for (const invalid of [
    null,
    {},
    [],
    [{ id: "future-widget", visible: true }],
    defaultSellerDashboardLayout.map((widget) => ({
      ...widget,
      visible: "yes",
    })),
  ]) {
    assert.deepEqual(
      validateSellerDashboardLayout(invalid),
      defaultSellerDashboardLayout
    );
  }

  localStorage.setItem(
    "shopera:seller:2001:dashboard-layout",
    JSON.stringify({ stale: true })
  );
  assert.deepEqual(
    await getSellerDashboardLayout(),
    defaultSellerDashboardLayout
  );
});

test("approval states cover pending, rejected, suspended, inactive, and active Stores", () => {
  assert.equal(
    getSellerDashboardApprovalState({
      approvalStatus: "PENDING",
    }).status,
    "pending"
  );
  assert.equal(
    getSellerDashboardApprovalState({
      approvalStatus: "REJECTED",
    }).status,
    "rejected"
  );
  assert.equal(
    getSellerDashboardApprovalState({
      approvalStatus: "SUSPENDED",
    }).status,
    "suspended"
  );
  assert.equal(
    getSellerDashboardApprovalState({
      approvalStatus: "APPROVED",
      storeStatus: "INACTIVE",
    }).status,
    "inactive"
  );
  assert.equal(
    getSellerDashboardApprovalState({
      approvalStatus: "APPROVED",
      storeStatus: "ACTIVE",
    }),
    null
  );
});

test("scoped Dashboard error boundary contains widget failures and exposes recovery actions", async () => {
  const source = await readFile(
    new URL(
      "../src/components/seller/dashboard/SellerDashboardErrorBoundary.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /class SellerDashboardErrorBoundaryBase extends Component/);
  assert.match(source, /static getDerivedStateFromError/);
  assert.match(source, /this\.state\.hasError/);
  assert.match(source, /onClick=\{this\.props\.onRetry\}/);
  assert.match(source, /to="\/seller\/products"/);
  assert.match(source, /to="\/seller\/store-profile"/);
});

test("Dashboard runtime contains no seed imports, demo presentation, hardcoded dollar chart, or notification badge count", async () => {
  const [
    page,
    service,
    weekly,
    recent,
    sidebar,
    dashboardUtil,
  ] =
    await Promise.all(
      [
        "src/pages/seller/SellerDashboardPage.jsx",
        "src/services/sellerService.js",
        "src/components/seller/dashboard/WeeklySalesCard.jsx",
        "src/components/seller/dashboard/RecentOrdersCard.jsx",
        "src/components/seller/SellerSidebar.jsx",
        "src/utils/sellerDashboard.js",
      ].map((path) =>
        readFile(
          new URL(`../${path}`, import.meta.url),
          "utf8"
        )
      )
    );
  const dashboardRuntime = [
    page,
    service,
    weekly,
    recent,
  ].join("\n");

  assert.doesNotMatch(
    dashboardRuntime,
    /sellerOrdersData|sellerAnalyticsData|sellerNotificationsData|Demo estimate|May 2025|\$5K|\$4K|\$3K|isDemoEstimate/
  );
  assert.doesNotMatch(
    recent,
    /order\.product|customerEmail|product\.image/
  );
  assert.match(
    dashboardUtil,
    /firstItem\?\.productName/
  );
  assert.match(recent, /to="\/seller\/orders"/);
  assert.match(
    sidebar,
    /\["notifications", ROUTES\.SELLER_NOTIFICATIONS, "N"\]/
  );
  assert.doesNotMatch(
    sidebar,
    /getSellerNotificationsData|unreadCount|seller-sidebar__badge/
  );
});

test("English and Turkish Dashboard locale keys remain synchronized", () => {
  const leaves = (value, prefix = "") =>
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      return child &&
        typeof child === "object" &&
        !Array.isArray(child)
        ? leaves(child, path)
        : [path];
    });

  assert.deepEqual(
    leaves(en.dashboard).sort(),
    leaves(tr.dashboard).sort()
  );
});
