import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import en from "../src/locales/en.json" with { type: "json" };
import tr from "../src/locales/tr.json" with { type: "json" };
import {
  getSellerOrderSummary,
  getSellerOrdersEmptyState,
} from "../src/utils/sellerOrderPresentation.js";

const leafKeys = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child &&
      typeof child === "object" &&
      !Array.isArray(child)
      ? leafKeys(child, path)
      : [path];
  });

test("summary cards use only real orders, delivered revenue from today, and honest zeroes", () => {
  const orders = [
    {
      orderDate: "2026-08-11T08:00:00",
      status: "DELIVERED",
      totalAmount: 0,
      currencyCode: "EUR",
      shipment: { status: "DELIVERED" },
    },
    {
      orderDate: "2026-08-11T12:00:00",
      status: "DELIVERED",
      totalAmount: 25.5,
      currencyCode: "EUR",
      shipment: { status: "DELIVERED" },
    },
    {
      orderDate: "2026-08-10T12:00:00",
      status: "DELIVERED",
      totalAmount: 500,
      currencyCode: "EUR",
      shipment: { status: "DELIVERED" },
    },
    {
      orderDate: "2026-08-11T14:00:00",
      status: "PENDING",
      totalAmount: 900,
      currencyCode: "EUR",
      shipment: { status: "PENDING" },
    },
    {
      orderDate: "2026-08-11T15:00:00",
      status: "CONFIRMED",
      totalAmount: 800,
      currencyCode: "EUR",
      shipment: { status: "PENDING" },
    },
    {
      orderDate: "2026-08-11T16:00:00",
      status: "PROCESSING",
      totalAmount: 700,
      currencyCode: "EUR",
      shipment: { status: "PACKED" },
    },
    {
      orderDate: "2026-08-11T17:00:00",
      status: "SHIPPED",
      totalAmount: 600,
      currencyCode: "EUR",
      shipment: { status: "SHIPPED" },
    },
  ];

  assert.deepEqual(
    getSellerOrderSummary(
      orders,
      new Date("2026-08-11T18:00:00")
    ),
    {
      todayRevenue: 25.5,
      currencyCode: "EUR",
      pendingShipments: 3,
      completedOrders: 3,
    }
  );
  assert.deepEqual(
    getSellerOrderSummary([], new Date()),
    {
      todayRevenue: 0,
      currencyCode: null,
      pendingShipments: 0,
      completedOrders: 0,
    }
  );
});

test("empty Seller Orders state is approval-aware", () => {
  assert.equal(
    getSellerOrdersEmptyState(
      {
        hasStore: true,
        store: {
          approvalStatus: "PENDING",
          storeStatus: "INACTIVE",
        },
      },
      []
    ).titleKey,
    "orders.empty.pendingTitle"
  );

  assert.equal(
    getSellerOrdersEmptyState(
      {
        hasStore: true,
        store: {
          approvalStatus: "APPROVED",
          storeStatus: "ACTIVE",
        },
      },
      []
    ).titleKey,
    "orders.empty.noOrdersTitle"
  );

  assert.equal(
    getSellerOrdersEmptyState(
      {
        hasStore: true,
        store: {
          approvalStatus: "APPROVED",
          storeStatus: "INACTIVE",
        },
      },
      []
    ).titleKey,
    "orders.empty.inactiveTitle"
  );
});

test("historical real orders remain visible regardless of the Store's later status", () => {
  for (const profile of [
    {
      hasStore: true,
      store: {
        approvalStatus: "REJECTED",
        storeStatus: "INACTIVE",
      },
    },
    {
      hasStore: true,
      store: {
        approvalStatus: "SUSPENDED",
        storeStatus: "SUSPENDED",
      },
    },
  ]) {
    assert.equal(
      getSellerOrdersEmptyState(profile, [
        { orderId: 42 },
      ]),
      null
    );
  }
});

test("Seller Orders UI presents real DTO fields and no unsupported invoice, email, image, chart, or dollar data", async () => {
  const pageSource = await readFile(
    new URL(
      "../src/pages/seller/SellerOrdersPage.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(pageSource, /order\.items\[0\]/);
  assert.match(pageSource, /selectedOrder\.items\.map/);
  assert.match(pageSource, /orders\.moreItems/);
  assert.match(pageSource, /order\.customerPhone/);
  assert.match(pageSource, /order\.currencyCode/);
  assert.match(pageSource, /orders\.allDates/);
  assert.match(pageSource, /seller-orders\.csv/);
  assert.doesNotMatch(
    pageSource,
    /customerEmail|Print Invoice|printInvoices|RevenueMiniChart|Demo estimate|May 2025|window\.print/
  );
  assert.doesNotMatch(
    pageSource,
    /formatCurrency\([^,\n]+\)|currencyCode\s*\|\|\s*["']USD["']|["']\$["']/
  );
});

test("English and Turkish Seller Orders locale keys remain synchronized", () => {
  assert.deepEqual(
    leafKeys(en.orders).sort(),
    leafKeys(tr.orders).sort()
  );

  for (const key of [
    "allDates",
    "moreItems",
    "phone",
    "currency",
    "shippingAddress",
    "loadError",
    "networkError",
    "detailsLoadError",
    "empty.noStoreTitle",
    "empty.pendingTitle",
    "empty.rejectedTitle",
    "empty.suspendedTitle",
    "empty.inactiveTitle",
    "empty.noOrdersTitle",
  ]) {
    const read = (locale) =>
      key
        .split(".")
        .reduce((value, segment) => value[segment], locale.orders);

    assert.equal(typeof read(en), "string");
    assert.equal(typeof read(tr), "string");
  }
});
