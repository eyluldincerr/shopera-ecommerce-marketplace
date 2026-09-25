import assert from "node:assert/strict";
import test from "node:test";

const values = new Map();
const sessionValues = new Map();

globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
};
globalThis.sessionStorage = {
  getItem: (key) => sessionValues.get(key) ?? null,
  setItem: (key, value) => sessionValues.set(key, String(value)),
  removeItem: (key) => sessionValues.delete(key),
};
globalThis.window = { dispatchEvent: () => {} };

const setAuthenticatedBuyer = () => {
  const issuedAt = Date.now();
  localStorage.setItem(
    "token",
    "eyJoZWFkZXIiOiJ0ZXN0In0.dXNlci0xMDAx.c2lnbmF0dXJl"
  );
  localStorage.setItem("role", "Buyer");
  localStorage.setItem("userId", "1001");
  localStorage.setItem("email", "buyer@shopera.test");
  localStorage.setItem("sessionIssuedAt", String(issuedAt));
  localStorage.setItem("sessionExpiresAt", String(issuedAt + 28_800_000));
};

const {
  clearCheckoutShippingAddress,
  clearCheckoutCompletionInProgress,
  createCheckoutRequest,
  getCheckoutCompletionOrderPath,
  getCheckoutShippingAddress,
  markCheckoutCompletionInProgress,
  saveCheckoutShippingAddress,
  submitCheckout,
} = await import("../src/services/checkoutService.js");
const { ORDER_ENDPOINTS } = await import("../src/config/apiEndpoints.js");
const { getOrderDetailRoute } = await import("../src/routes/routePolicy.js");

const shippingAddress = {
  recipientName: "  Ada Buyer ",
  recipientPhone: "  +90 555 000 0000 ",
  streetAddress: "  1 Market Street ",
  city: " Nicosia ",
  stateProvince: " ",
  postalCode: "",
  country: " Cyprus ",
};

test("checkout submits only the authoritative payment-free request with the Buyer JWT", async () => {
  values.clear();
  sessionValues.clear();
  setAuthenticatedBuyer();
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({
      orderId: 8001,
      status: "PENDING",
      totalAmount: 120,
      items: [],
      addresses: [],
    }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };

  const order = await submitCheckout({ shippingAddress, cart: { totalAmount: 120 } });

  assert.equal(order.orderId, 8001);
  assert.deepEqual(requests.map(({ url, options }) => [options.method, url]), [
    ["POST", ORDER_ENDPOINTS.checkout],
  ]);
  const requestBody = JSON.parse(requests[0].options.body);
  assert.deepEqual(requestBody, {
    couponCode: null,
    shippingAddress: {
      recipientName: "Ada Buyer",
      recipientPhone: "+90 555 000 0000",
      streetAddress: "1 Market Street",
      city: "Nicosia",
      stateProvince: null,
      postalCode: null,
      country: "Cyprus",
    },
    billingAddress: {
      recipientName: "Ada Buyer",
      recipientPhone: "+90 555 000 0000",
      streetAddress: "1 Market Street",
      city: "Nicosia",
      stateProvince: null,
      postalCode: null,
      country: "Cyprus",
    },
  });
  const headers = new Headers(requests[0].options.headers);
  assert.match(headers.get("Authorization") || "", /^Bearer /);
  assert.equal(headers.has("X-Buyer-User-Id"), false);
  assert.equal(headers.has("X-Store-Id"), false);
  assert.doesNotMatch(
    JSON.stringify(requestBody),
    /buyerUserId|storeId|price|total|orderId|payment/i
  );
  assert.equal(requests.length, 1);
});

test("a successful checkout completion protects the configured Order Detail route during Cart refresh", () => {
  values.clear();
  sessionValues.clear();

  const orderPath = markCheckoutCompletionInProgress(8001);

  assert.equal(orderPath, getOrderDetailRoute(8001));
  assert.equal(getCheckoutCompletionOrderPath(), orderPath);
  clearCheckoutCompletionInProgress();
  assert.equal(getCheckoutCompletionOrderPath(), "");
});

test("checkout does not trust a browser Cart coupon before SQL-backed coupon integration", () => {
  const request = createCheckoutRequest({
    shippingAddress,
    cart: { couponCode: " SAVE10 " },
  });

  assert.equal(request.couponCode, null);
  assert.notEqual(request.shippingAddress, request.billingAddress);
  assert.equal("addressId" in request.shippingAddress, false);
  assert.equal("buyerUserId" in request, false);
  assert.equal("totalAmount" in request, false);
});

test("checkout errors keep the shipping snapshot and never create a local order", async () => {
  values.clear();
  sessionValues.clear();
  setAuthenticatedBuyer();
  saveCheckoutShippingAddress(shippingAddress);
  globalThis.fetch = async () => new Response(JSON.stringify({
    message: "Stock changed",
  }), {
    status: 409,
    headers: { "content-type": "application/json" },
  });

  await assert.rejects(
    submitCheckout({ shippingAddress, cart: {} }),
    (error) => error.status === 409
  );
  assert.deepEqual(getCheckoutShippingAddress(), shippingAddress);
  assert.equal(getCheckoutCompletionOrderPath(), "");
  assert.equal(localStorage.getItem("customerOrders"), null);
  clearCheckoutShippingAddress();
});

test("a checkout response without 201 Created is not treated as an order", async () => {
  values.clear();
  sessionValues.clear();
  setAuthenticatedBuyer();
  globalThis.fetch = async () => new Response(JSON.stringify({ orderId: 8002 }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  await assert.rejects(
    submitCheckout({ shippingAddress, cart: {} }),
    (error) => error.code === "INVALID_CHECKOUT_STATUS"
  );
});
