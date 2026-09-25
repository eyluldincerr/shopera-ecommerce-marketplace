import test from "node:test";
import assert from "node:assert/strict";

const localValues = new Map();
const sessionValues = new Map();
globalThis.localStorage = {
  getItem: (key) => localValues.get(key) ?? null,
  setItem: (key, value) => localValues.set(key, String(value)),
  removeItem: (key) => localValues.delete(key),
  clear: () => localValues.clear(),
};
globalThis.sessionStorage = {
  getItem: (key) => sessionValues.get(key) ?? null,
  setItem: (key, value) => sessionValues.set(key, String(value)),
  removeItem: (key) => sessionValues.delete(key),
};
globalThis.window = { dispatchEvent: () => {} };

const { loginUser } = await import("../src/services/authService.js");
const { clearSelectedCoupon } = await import(
  "../src/services/couponService.js"
);
const {
  calculateCheckoutEstimate,
  saveCheckoutShippingAddress,
} = await import("../src/services/checkoutService.js");
const {
  getNotifications,
  markAllAsRead,
  markAsRead,
} = await import(
  "../src/services/notificationService.js"
);
const { getNotificationDestination } = await import(
  "../src/services/notificationRouteService.js"
);

test("checkout keeps only the session-scoped shipping snapshot and no browser Cart", async () => {
  await loginUser({ email: "buyer@shopera.demo", password: "Buyer123!" });
  saveCheckoutShippingAddress({
    receiverName: "Demo Buyer",
    phoneNumber: "123",
    country: "Cyprus",
    city: "Nicosia",
    streetAddress: "Test Street",
  });
  localStorage.setItem("userCoupons", "legacy");
  localStorage.setItem("selectedCheckoutCoupon", "legacy");
  clearSelectedCoupon();

  assert.equal(localStorage.getItem("checkoutPaymentMethod"), null);
  assert.equal(localStorage.getItem("carts"), null);
  assert.equal(localStorage.getItem("cartItems"), null);
  assert.equal(localStorage.getItem("userCoupons"), null);
  assert.equal(localStorage.getItem("selectedCheckoutCoupon"), null);
});

test("checkout preview reports stock conflicts without inventing tax or coupon totals", () => {
  const quote = calculateCheckoutEstimate({
    cartItems: [
      { VariantID: "V-2", Quantity: 3, UnitPriceAtAdd: 10, StockQuantity: 1 },
    ],
  });
  assert.equal(quote.stockConflicts.length, 1);
  assert.equal(quote.tax, 0);
  assert.equal(quote.discount, 0);
  assert.equal(quote.total, 30);
  assert.equal(quote.isEstimate, true);
  assert.equal(quote.authority, "backend-current-price-preview");
});

test("notifications use backend APIs and legacy browser notification storage is removed", async () => {
  await loginUser({ email: "buyer@shopera.demo", password: "Buyer123!" });
  localStorage.setItem(
    "shopera-buyer-notifications:1001",
    JSON.stringify([{ notificationId: "legacy", title: "Legacy" }])
  );

  let notifications = [
    {
      notificationId: 1,
      notificationType: "ORDER_PLACED",
      title: "Order placed",
      message: "Your order was placed.",
      relatedEntityType: "ORDER",
      relatedEntityId: 25,
      isRead: false,
      createdDate: "2026-08-12T10:00:00Z",
      readDate: null,
    },
    {
      notificationId: 2,
      notificationType: "ORDER_STATUS_CHANGED",
      title: "Order status updated",
      message: "Your order is now SHIPPED.",
      relatedEntityType: "ORDER",
      relatedEntityId: 24,
      isRead: true,
      createdDate: "2026-08-11T10:00:00Z",
      readDate: "2026-08-11T11:00:00Z",
    },
  ];

  const requests = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input), "http://shopera.test");
    const method = options.method || "GET";
    requests.push(`${method} ${url.pathname}`);

    if (url.pathname === "/api/notifications" && method === "GET") {
      return new Response(JSON.stringify(notifications), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.pathname === "/api/notifications/unread-count") {
      return new Response(
        JSON.stringify(notifications.filter((item) => !item.isRead).length),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    const readMatch = url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
    if (readMatch && method === "PATCH") {
      notifications = notifications.map((item) =>
        item.notificationId === Number(readMatch[1])
          ? { ...item, isRead: true, readDate: new Date().toISOString() }
          : item
      );
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/notifications/read-all" && method === "PATCH") {
      notifications = notifications.map((item) => ({
        ...item,
        isRead: true,
        readDate: item.readDate || new Date().toISOString(),
      }));
      return new Response(JSON.stringify({ updatedCount: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new TypeError(`Unhandled notification test request: ${method} ${url.pathname}`);
  };

  const items = await getNotifications({ asArray: true });
  assert.equal(items.length, 2);
  assert.equal(items[0].notificationId, 1);
  assert.equal(localStorage.getItem("shopera-buyer-notifications:1001"), null);
  assert.equal(
    getNotificationDestination({
      relatedEntityType: "Order",
      relatedEntityId: 999,
      relatedEntityAvailable: false,
    }),
    null
  );
  assert.equal(getNotificationDestination({ relatedEntityType: "Unknown" }), null);

  await markAsRead(1);
  assert.equal(
    (await getNotifications({ asArray: true })).find(
      (notification) => notification.notificationId === 1
    ).isRead,
    true
  );

  await markAllAsRead();
  assert.equal(
    (await getNotifications({ asArray: true })).every(
      (notification) => notification.isRead
    ),
    true
  );

  assert.ok(requests.includes("GET /api/notifications"));
  assert.ok(requests.includes("PATCH /api/notifications/1/read"));
  assert.ok(requests.includes("PATCH /api/notifications/read-all"));
});


test("seller notification destinations stay inside the Seller workspace", () => {
  assert.equal(
    getNotificationDestination(
      { relatedEntityType: "Order", relatedEntityId: 25 },
      "Seller"
    ),
    "/seller/orders"
  );
  assert.equal(
    getNotificationDestination(
      { relatedEntityType: "Product", relatedEntityId: 101 },
      "Seller"
    ),
    "/seller/products"
  );
});
