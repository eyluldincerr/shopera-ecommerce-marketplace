import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { COUPON_ENDPOINTS } from "../src/config/apiEndpoints.js";
import { getCommerceConflictMessage } from "../src/services/commerceErrorMessages.js";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
};
globalThis.sessionStorage = { removeItem: () => {} };
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
  localStorage.setItem("fullName", "Demo Buyer");
  localStorage.setItem("sessionIssuedAt", String(issuedAt));
  localStorage.setItem("sessionExpiresAt", String(issuedAt + 28_800_000));
};

const {
  getAvailableCoupons,
  validateCoupon,
} = await import("../src/services/couponService.js");
const { createCheckoutRequest } = await import(
  "../src/services/checkoutService.js"
);

test("Buyer coupons come from backend APIs and never use dummy/local coupon storage", async () => {
  values.clear();
  setAuthenticatedBuyer();
  localStorage.setItem("userCoupons", JSON.stringify([{ code: "DUMMY" }]));
  localStorage.setItem("selectedCheckoutCoupon", JSON.stringify({ code: "DUMMY" }));

  const requests = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input), "http://shopera.test");
    requests.push([options.method || "GET", url.pathname, options.body || null]);

    if (url.pathname === COUPON_ENDPOINTS.list) {
      return new Response(JSON.stringify([
        {
          couponId: 7,
          couponCode: "SAVE20",
          discountType: "PERCENTAGE",
          discountValue: 20,
          expiryDate: "2026-09-30T00:00:00Z",
          minPurchaseAmount: 100,
          status: "ACTIVE",
        },
      ]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.pathname === COUPON_ENDPOINTS.validate) {
      return new Response(JSON.stringify({
        couponId: 7,
        couponCode: "SAVE20",
        discountType: "PERCENTAGE",
        discountValue: 20,
        expiryDate: "2026-09-30T00:00:00Z",
        minPurchaseAmount: 100,
        subtotalAmount: 120,
        discountAmount: 24,
        totalAmount: 96,
        currencyCode: "EUR",
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new TypeError(`Unhandled coupon request: ${url.pathname}`);
  };

  const coupons = await getAvailableCoupons();
  const quote = await validateCoupon("save20");

  assert.equal(coupons.length, 1);
  assert.equal(coupons[0].couponCode, "SAVE20");
  assert.equal(quote.discountAmount, 24);
  assert.equal(quote.totalAmount, 96);
  assert.equal(localStorage.getItem("userCoupons"), null);
  assert.equal(localStorage.getItem("selectedCheckoutCoupon"), null);
  assert.deepEqual(requests.map((item) => item.slice(0, 2)), [
    ["GET", "/api/coupons"],
    ["POST", "/api/coupons/validate"],
  ]);
  assert.deepEqual(JSON.parse(requests[1][2]), { couponCode: "SAVE20" });

  const source = await readFile(
    new URL("../src/services/couponService.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /SUMMER20|FREEDELIVERY|WELCOME10|SHOPERA50/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
});

test("checkout request sends only the backend-validated coupon code", () => {
  const request = createCheckoutRequest({
    couponCode: " save20 ",
    shippingAddress: {
      recipientName: "Buyer",
      streetAddress: "1 Test Street",
      city: "Nicosia",
      country: "Cyprus",
    },
  });

  assert.equal(request.couponCode, "SAVE20");
  assert.equal(request.shippingAddress.recipientName, "Buyer");
});

test("coupon conflict codes map to safe localized keys instead of raw backend detail", () => {
  const t = (key, options = {}) =>
    options.amount ? `${key}:${options.amount}` : key;

  assert.equal(
    getCommerceConflictMessage(
      { status: 409, code: "COUPON_NOT_FOUND", data: { detail: "raw" } },
      t,
      "cart"
    ),
    "cart.errors.couponNotFound"
  );
  assert.equal(
    getCommerceConflictMessage(
      {
        status: 409,
        code: "COUPON_MINIMUM_NOT_MET",
        data: { minimumPurchaseAmount: 100 },
      },
      t,
      "checkout"
    ),
    "checkout.errors.couponMinimumNotMet:100.00"
  );
  assert.equal(
    getCommerceConflictMessage(
      { status: 409, code: "COUPON_EXPIRED", data: { detail: "internal" } },
      t,
      "cart"
    ),
    "cart.errors.couponExpired"
  );
});
