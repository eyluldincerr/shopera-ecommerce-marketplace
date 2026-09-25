import assert from "node:assert/strict";
import test from "node:test";

const localValues = new Map();

globalThis.localStorage = {
  getItem: (key) => localValues.get(key) ?? null,
  setItem: (key, value) => localValues.set(key, String(value)),
  removeItem: (key) => localValues.delete(key),
  clear: () => localValues.clear(),
};
globalThis.window = { dispatchEvent: () => {} };

const { loginUser } = await import("../src/services/authService.js");
await loginUser({ email: "buyer@shopera.demo", password: "Buyer123!" });

const {
  archiveOrder,
  cancelOrder,
  getMyOrders,
  getOrderById,
  reorder,
} = await import("../src/services/orderService.js");
const { mapOrderDto } = await import("../src/services/mappers/orderMapper.js");

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const detailDto = (overrides = {}) => ({
  orderId: 7001,
  orderNumber: "ORD-7001",
  storeId: 30,
  orderDate: "2026-08-12T08:00:00Z",
  status: "PENDING",
  totalQuantity: 2,
  subtotal: 30,
  discountAmount: 0,
  shippingAmount: 0,
  totalAmount: 30,
  currencyCode: "EUR",
  items: [
    {
      orderItemId: 71,
      productId: 100,
      variantId: 1000,
      productName: "Canonical Product",
      sku: "SKU-1000",
      variantName: "Blue",
      imageUrl: "/api/product-images/500/content",
      quantity: 2,
      unitPriceAtPurchase: 15,
      subtotal: 30,
    },
  ],
  addresses: [
    {
      addressType: "SHIPPING",
      recipientName: "Buyer Name",
      recipientPhone: "+905551112233",
      streetAddress: "Snapshot Street",
      city: "Nicosia",
      country: "Cyprus",
    },
  ],
  statusHistory: [
    {
      orderStatusHistoryId: 111,
      oldStatus: null,
      newStatus: "PENDING",
      changedDate: "2026-08-12T08:00:00Z",
      changeNote: "Order placed",
    },
  ],
  ...overrides,
});

test("order mapper preserves real backend Order identities, currency, images, and status history", () => {
  const order = mapOrderDto(detailDto());

  assert.equal(order.orderId, 7001);
  assert.equal(order.orderNumber, "ORD-7001");
  assert.equal(order.storeId, 30);
  assert.equal(order.currencyCode, "EUR");
  assert.equal(order.totalQuantity, 2);
  assert.equal(order.items[0].orderItemId, 71);
  assert.equal(order.items[0].productId, 100);
  assert.equal(order.items[0].variantId, 1000);
  assert.match(order.items[0].productImage, /api\/product-images\/500\/content$/);
  assert.equal(order.address.receiverName, "Buyer Name");
  assert.equal(order.statusHistory[0].newStatus, "PENDING");
  assert.equal(order.payment, null);
  assert.equal(order.shipment, null);
});

test("Buyer Order mapper exposes authoritative shipment tracking and dates", () => {
  const order = mapOrderDto(
    detailDto({
      status: "SHIPPED",
      shipment: {
        shipmentId: 77,
        courierName: "DHL",
        trackingNumber: "BUYER-TRACK-77",
        shipmentStatus: "SHIPPED",
        shippedDate: "2026-08-12T10:30:00Z",
        deliveredDate: null,
        shippingCost: 0,
      },
    })
  );

  assert.deepEqual(order.shipment, {
    shipmentId: 77,
    courierName: "DHL",
    trackingNumber: "BUYER-TRACK-77",
    status: "SHIPPED",
    shippedDate: "2026-08-12T10:30:00Z",
    deliveredDate: null,
    shippingCost: 0,
  });
});

test("order mapper accepts conventional PascalCase DTOs without inventing payment or shipment", () => {
  const order = mapOrderDto({
    OrderID: 81,
    OrderNumber: "ORD-81",
    StoreID: 19,
    OrderDate: "2026-08-10T08:00:00Z",
    OrderStatus: "DELIVERED",
    TotalQuantity: 1,
    Subtotal: 9,
    DiscountAmount: 0,
    ShippingAmount: 1,
    TotalAmount: 10,
    CurrencyCode: "EUR",
    OrderItems: [
      {
        OrderItemID: 91,
        ProductID: 101,
        VariantID: 1001,
        ProductName: "Pascal Product",
        SKU: "PAS-91",
        Quantity: 1,
        UnitPriceAtPurchase: 9,
        Subtotal: 9,
      },
    ],
    Addresses: [
      {
        AddressType: "SHIPPING",
        RecipientName: "Pascal Customer",
        StreetAddress: "One Street",
        City: "Kyrenia",
        Country: "Cyprus",
      },
    ],
  });

  assert.equal(order.orderId, 81);
  assert.equal(order.storeId, 19);
  assert.equal(order.items[0].productId, 101);
  assert.equal(order.items[0].variantId, 1001);
  assert.equal(order.totalAmount, 10);
  assert.equal(order.payment, null);
  assert.equal(order.shipment, null);
});

test("Buyer Orders uses real list/detail/cancel/reorder/archive endpoints and never browser Order storage", async () => {
  localStorage.removeItem("customerOrders");
  localStorage.removeItem("orderItems");
  localStorage.removeItem("payments");
  localStorage.removeItem("shipments");
  localStorage.removeItem("orderStatusHistory");

  const requests = [];
  let status = "PENDING";

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    if (url === "/api/orders" && options.method === "GET") {
      return jsonResponse([
        {
          orderId: 7001,
          orderNumber: "ORD-7001",
          storeId: 30,
          orderDate: "2026-08-12T08:00:00Z",
          status,
          totalQuantity: 2,
          subtotal: 30,
          discountAmount: 0,
          shippingAmount: 0,
          totalAmount: 30,
          currencyCode: "EUR",
        },
      ]);
    }

    if (url === "/api/orders/7001" && options.method === "GET") {
      return jsonResponse(detailDto({ status }));
    }

    if (url === "/api/orders/7001/cancel" && options.method === "PATCH") {
      assert.deepEqual(JSON.parse(options.body), { reason: "Changed plans" });
      status = "CANCELLED";
      return jsonResponse(
        detailDto({
          status,
          statusHistory: [
            ...detailDto().statusHistory,
            {
              orderStatusHistoryId: 112,
              oldStatus: "PENDING",
              newStatus: "CANCELLED",
              changedDate: "2026-08-12T08:05:00Z",
              changeNote: "Cancelled by buyer: Changed plans",
            },
          ],
        })
      );
    }

    if (url === "/api/orders/7001/archive" && options.method === "PATCH") {
      return new Response(null, { status: 204 });
    }

    if (url === "/api/orders/7001/reorder" && options.method === "POST") {
      return jsonResponse({
        cartId: 12,
        buyerUserId: 20,
        status: "ACTIVE",
        totalQuantity: 2,
        totalAmount: 30,
        currencyCode: "EUR",
        items: [
          {
            cartItemId: 1,
            productId: 100,
            variantId: 1000,
            storeId: 30,
            productName: "Canonical Product",
            quantity: 2,
            unitPriceAtAdd: 15,
            currentUnitPrice: 15,
            subtotal: 30,
            availableStock: 5,
          },
        ],
      });
    }

    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const listed = await getMyOrders();
  const detail = await getOrderById(7001);
  const archived = await archiveOrder(7001);
  const cancelled = await cancelOrder(7001, "Changed plans");
  const cart = await reorder(7001);

  assert.equal(listed[0].orderId, 7001);
  assert.equal(detail.items[0].productId, 100);
  assert.equal(archived, true);
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.statusHistory.at(-1).newStatus, "CANCELLED");
  assert.equal(cart.items[0].variantId, 1000);
  assert.equal(cart.totalAmount, 30);
  assert.equal(localStorage.getItem("customerOrders"), null);
  assert.equal(localStorage.getItem("orderItems"), null);
  assert.equal(localStorage.getItem("payments"), null);
  assert.equal(localStorage.getItem("shipments"), null);
  assert.equal(localStorage.getItem("orderStatusHistory"), null);

  assert.deepEqual(
    requests.map(({ url, options }) => [options.method, url]),
    [
      ["GET", "/api/orders"],
      ["GET", "/api/orders/7001"],
      ["PATCH", "/api/orders/7001/archive"],
      ["PATCH", "/api/orders/7001/cancel"],
      ["POST", "/api/orders/7001/reorder"],
    ]
  );
});
