import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  SellerOrderApiError,
  getSellerOrder,
  getSellerOrderNextStatuses,
  listSellerOrders,
  updateOrderStatus,
  updateShipmentDetails,
} = await import(
  "../src/services/sellerOrderService.js"
);
const {
  SellerOrderMappingError,
  mapSellerOrderDto,
} = await import(
  "../src/services/mappers/sellerOrderMapper.js"
);

const orderDto = (overrides = {}) => ({
  orderId: 42,
  orderNumber: "ORD-42",
  storeId: 7,
  orderDate: "2026-08-11T10:00:00Z",
  status: "PENDING",
  totalQuantity: 0,
  subtotal: 0,
  discountAmount: 0,
  shippingAmount: 0,
  totalAmount: 0,
  currencyCode: "EUR",
  customerName: "Real Customer",
  customerPhone: null,
  items: [
    {
      variantId: 12,
      productName: "Real Product",
      sku: "REAL-12",
      variantName: null,
      quantity: 0,
      unitPriceAtPurchase: 0,
      subtotal: 0,
    },
    {
      variantId: 13,
      productName: "Second Product",
      sku: "REAL-13",
      variantName: "Blue",
      quantity: 2,
      unitPriceAtPurchase: 15,
      subtotal: 30,
    },
  ],
  shippingAddress: {
    receiverName: "Real Customer",
    streetAddress: "10 Market Street",
    city: "Nicosia",
    postalCode: "1010",
    country: "Cyprus",
  },
  shipment: null,
  ...overrides,
});

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

test("Seller Order mapper preserves the confirmed camelCase contract, multiple items, and zeroes", () => {
  const dto = orderDto();
  const order = mapSellerOrderDto(dto);

  assert.deepEqual(order, dto);
  assert.equal(order.items.length, 2);
  assert.equal(order.totalQuantity, 0);
  assert.equal(order.totalAmount, 0);
  assert.equal(order.items[0].quantity, 0);
  assert.equal(order.items[0].subtotal, 0);
  assert.equal(Object.hasOwn(order, "customerEmail"), false);
  assert.equal(Object.hasOwn(order, "image"), false);
  assert.equal(Object.hasOwn(order.items[0], "image"), false);
  assert.equal(order.orderId, 42);
  assert.equal(order.storeId, 7);
  assert.equal(order.items[0].variantId, 12);
});

test("Seller Order mapper accepts conventional PascalCase DTOs", () => {
  const order = mapSellerOrderDto({
    OrderId: 81,
    OrderNumber: "ORD-81",
    StoreId: 19,
    OrderDate: "2026-08-10T08:00:00Z",
    Status: "Delivered",
    TotalQuantity: 1,
    Subtotal: 9,
    DiscountAmount: 0,
    ShippingAmount: 1,
    TotalAmount: 10,
    CurrencyCode: "eur",
    CustomerName: "Pascal Customer",
    CustomerPhone: "+90 555 000 0000",
    Items: [
      {
        VariantId: 91,
        ProductName: "Pascal Product",
        Sku: "PAS-91",
        VariantName: "Large",
        Quantity: 1,
        UnitPriceAtPurchase: 9,
        Subtotal: 9,
      },
    ],
    ShippingAddress: {
      AddressLine1: "One Street",
      City: "Kyrenia",
      Country: "Cyprus",
    },
  });

  assert.equal(order.orderId, 81);
  assert.equal(order.storeId, 19);
  assert.equal(order.items[0].variantId, 91);
  assert.equal(order.items[0].sku, "PAS-91");
  assert.equal(order.status, "DELIVERED");
  assert.equal(order.currencyCode, "EUR");
  assert.deepEqual(order.shippingAddress, {
    addressLine1: "One Street",
    city: "Kyrenia",
    country: "Cyprus",
  });
});

test("Seller Order mapper preserves real shipment metadata", () => {
  const order = mapSellerOrderDto(
    orderDto({
      status: "SHIPPED",
      shipment: {
        shipmentId: 501,
        courierName: "DHL",
        trackingNumber: "TRACK-501",
        shipmentStatus: "SHIPPED",
        shippedDate: "2026-08-12T10:30:00Z",
        deliveredDate: null,
        shippingCost: 0,
      },
    })
  );

  assert.deepEqual(order.shipment, {
    shipmentId: 501,
    courierName: "DHL",
    trackingNumber: "TRACK-501",
    status: "SHIPPED",
    shippedDate: "2026-08-12T10:30:00Z",
    deliveredDate: null,
    shippingCost: 0,
  });
});

test("malformed required Seller Order identities fail with a controlled mapping error", () => {
  for (const invalidDto of [
    orderDto({ orderId: 0 }),
    orderDto({ storeId: -1 }),
    orderDto({
      items: [
        {
          ...orderDto().items[0],
          variantId: "not-an-id",
        },
      ],
    }),
  ]) {
    assert.throws(
      () => mapSellerOrderDto(invalidDto),
      (error) =>
        error instanceof SellerOrderMappingError &&
        error.code === "SELLER_ORDER_RESPONSE_INVALID"
    );
  }
});

test("Seller Orders uses the confirmed endpoints, shared JWT, exact PATCH body, and authoritative refetch", async () => {
  const requests = [];
  let serverStatus = "PENDING";

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    if (url === "/api/orders/seller") {
      return jsonResponse([
        orderDto({ status: serverStatus }),
      ]);
    }

    if (
      url === "/api/orders/seller/42" &&
      options.method === "GET"
    ) {
      return jsonResponse(
        orderDto({ status: serverStatus })
      );
    }

    if (
      url === "/api/orders/42/status" &&
      options.method === "PATCH"
    ) {
      assert.deepEqual(JSON.parse(options.body), {
        newStatus: "CONFIRMED",
      });
      serverStatus = "CONFIRMED";
      return new Response(null, { status: 204 });
    }

    throw new Error(
      `Unexpected request: ${options.method} ${url}`
    );
  };

  const listed = await listSellerOrders();
  const detail = await getSellerOrder(42);
  const updated = await updateOrderStatus(
    42,
    "CONFIRMED"
  );

  assert.equal(listed.length, 1);
  assert.equal(detail.orderId, 42);
  assert.equal(updated.status, "CONFIRMED");
  assert.deepEqual(
    requests.map(({ url, options }) => [
      options.method,
      url,
    ]),
    [
      ["GET", "/api/orders/seller"],
      ["GET", "/api/orders/seller/42"],
      ["GET", "/api/orders/seller/42"],
      ["PATCH", "/api/orders/42/status"],
      ["GET", "/api/orders/seller/42"],
    ]
  );

  for (const { url, options } of requests) {
    assert.match(
      options.headers.get("Authorization"),
      /^Bearer /i
    );
    assert.equal(options.headers.has("sellerUserId"), false);
    assert.equal(options.headers.has("storeId"), false);
    assert.equal(options.headers.has("X-Seller-User-Id"), false);
    assert.equal(options.headers.has("X-Store-Id"), false);
    assert.doesNotMatch(url, /sellerUserId|storeId/i);
  }
});

test("shipping status sends courier/tracking and shipment details can be corrected", async () => {
  const requests = [];
  let currentOrder = orderDto({ status: "PROCESSING" });

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    if (url === "/api/orders/seller/42" && options.method === "GET") {
      return jsonResponse(currentOrder);
    }

    if (url === "/api/orders/42/status" && options.method === "PATCH") {
      assert.deepEqual(JSON.parse(options.body), {
        newStatus: "SHIPPED",
        courierName: "DHL",
        trackingNumber: "TRACK-42",
      });
      currentOrder = orderDto({
        status: "SHIPPED",
        shipment: {
          shipmentId: 9,
          courierName: "DHL",
          trackingNumber: "TRACK-42",
          shipmentStatus: "SHIPPED",
          shippedDate: "2026-08-12T11:00:00Z",
          deliveredDate: null,
          shippingCost: 0,
        },
      });
      return new Response(null, { status: 204 });
    }

    if (url === "/api/orders/42/shipment" && options.method === "PATCH") {
      assert.deepEqual(JSON.parse(options.body), {
        courierName: "UPS",
        trackingNumber: "TRACK-42-NEW",
      });
      currentOrder = orderDto({
        status: "SHIPPED",
        shipment: {
          shipmentId: 9,
          courierName: "UPS",
          trackingNumber: "TRACK-42-NEW",
          shipmentStatus: "SHIPPED",
          shippedDate: "2026-08-12T11:00:00Z",
          deliveredDate: null,
          shippingCost: 0,
        },
      });
      return jsonResponse(currentOrder);
    }

    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const shipped = await updateOrderStatus(42, "SHIPPED", {
    shipment: {
      courierName: "DHL",
      trackingNumber: "TRACK-42",
    },
  });
  assert.equal(shipped.shipment.trackingNumber, "TRACK-42");

  const corrected = await updateShipmentDetails(42, {
    courierName: "UPS",
    trackingNumber: "TRACK-42-NEW",
  });
  assert.equal(corrected.shipment.courierName, "UPS");
  assert.equal(corrected.shipment.trackingNumber, "TRACK-42-NEW");

  assert.deepEqual(
    requests.map(({ url, options }) => [options.method, url]),
    [
      ["GET", "/api/orders/seller/42"],
      ["PATCH", "/api/orders/42/status"],
      ["GET", "/api/orders/seller/42"],
      ["PATCH", "/api/orders/42/shipment"],
    ]
  );
});

test("next statuses and forward-transition validation follow the backend state machine", async () => {
  let currentStatus = "PROCESSING";
  let patchCount = 0;

  globalThis.fetch = async (url, options = {}) => {
    if (
      url === "/api/orders/seller/42" &&
      options.method === "GET"
    ) {
      return jsonResponse(
        orderDto({ status: currentStatus })
      );
    }

    if (options.method === "PATCH") {
      patchCount += 1;
      currentStatus = JSON.parse(
        options.body
      ).newStatus;
      return new Response(null, { status: 204 });
    }

    throw new Error("Unexpected Seller Order request");
  };

  assert.deepEqual(
    await getSellerOrderNextStatuses(42),
    ["SHIPPED"]
  );

  await assert.rejects(
    updateOrderStatus(42, "PROCESSING"),
    (error) =>
      error instanceof SellerOrderApiError &&
      error.status === 409 &&
      error.code === "ORDER_STATUS_UNCHANGED"
  );

  for (const status of ["CONFIRMED", "DELIVERED"]) {
    await assert.rejects(
      updateOrderStatus(42, status),
      (error) =>
        error instanceof SellerOrderApiError &&
        error.status === 400 &&
        error.code ===
          "INVALID_ORDER_STATUS_TRANSITION"
    );
  }

  assert.equal(patchCount, 0);
});

test("duplicate concurrent updates for one order are rejected", async () => {
  let releasePatch;
  let markPatchStarted;
  const patchStarted = new Promise((resolve) => {
    markPatchStarted = resolve;
  });
  let status = "PENDING";

  globalThis.fetch = async (url, options = {}) => {
    if (url === "/api/orders/seller/42") {
      return jsonResponse(orderDto({ status }));
    }

    if (url === "/api/orders/42/status") {
      markPatchStarted();
      await new Promise((resolve) => {
        releasePatch = resolve;
      });
      status = JSON.parse(options.body).newStatus;
      return new Response(null, { status: 204 });
    }

    throw new Error("Unexpected Seller Order request");
  };

  const firstUpdate = updateOrderStatus(
    42,
    "CONFIRMED"
  );
  await patchStarted;

  await assert.rejects(
    updateOrderStatus(42, "CONFIRMED"),
    (error) =>
      error instanceof SellerOrderApiError &&
      error.status === 409 &&
      error.code === "ORDER_UPDATE_IN_PROGRESS"
  );

  releasePatch();
  assert.equal(
    (await firstUpdate).status,
    "CONFIRMED"
  );
});

test("a backend conflict refetches and exposes the authoritative order", async () => {
  let detailCount = 0;

  globalThis.fetch = async (url, options = {}) => {
    if (url === "/api/orders/seller/42") {
      detailCount += 1;
      return jsonResponse(
        orderDto({
          status:
            detailCount === 1
              ? "PENDING"
              : "CONFIRMED",
        })
      );
    }

    if (
      url === "/api/orders/42/status" &&
      options.method === "PATCH"
    ) {
      return jsonResponse(
        { code: "ORDER_STATUS_CONFLICT" },
        409
      );
    }

    throw new Error("Unexpected Seller Order request");
  };

  await assert.rejects(
    updateOrderStatus(42, "CONFIRMED"),
    (error) =>
      error instanceof SellerOrderApiError &&
      error.status === 409 &&
      error.authoritativeOrder?.status ===
        "CONFIRMED"
  );
  assert.equal(detailCount, 2);
});

test("HTTP, mapping, and network failures never activate local or demo fallback", async () => {
  localStorage.setItem(
    "sellerOrders",
    JSON.stringify([
      { id: "ORD-FAKE", total: 999999 },
    ])
  );

  globalThis.fetch = async () => {
    throw new TypeError("offline");
  };
  await assert.rejects(
    listSellerOrders(),
    (error) =>
      error instanceof SellerOrderApiError &&
      error.isNetworkError === true &&
      error.code === "NETWORK_ERROR"
  );

  globalThis.fetch = async () =>
    jsonResponse({ items: [] });
  await assert.rejects(
    listSellerOrders(),
    (error) =>
      error instanceof SellerOrderApiError &&
      error.code === "SELLER_ORDER_RESPONSE_INVALID"
  );
});

test("Seller Orders runtime has no demo, sellerStoreService, or browser-storage commerce dependency", async () => {
  const sources = await Promise.all(
    [
      "src/services/sellerOrderService.js",
      "src/services/adapters/sellerOrderHttpAdapter.js",
      "src/pages/seller/SellerOrdersPage.jsx",
    ].map((path) =>
      readFile(
        new URL(`../${path}`, import.meta.url),
        "utf8"
      )
    )
  );
  const source = sources.join("\n");

  assert.doesNotMatch(
    source,
    /sellerOrdersData|sellerStoreService|localStorage|sessionStorage/
  );
  assert.doesNotMatch(
    source,
    /Emma Johnson|Liam Smith|ORD-784|May 2025|customerEmail|RevenueMiniChart|window\.print/
  );
  assert.doesNotMatch(
    source,
    /sellerUserId|X-Seller|X-Store/
  );
});
