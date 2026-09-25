import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { formatCurrency } from "../src/utils/formatCurrency.js";
import { calculateCheckoutEstimate } from "../src/services/checkoutService.js";

test("Buyer money formatting defaults to the backend Order currency", () => {
  assert.match(formatCurrency(12), /€/);
});

test("Cart and checkout preview use current backend prices without fake tax or coupon discounts", () => {
  const quote = calculateCheckoutEstimate({
    cartItems: [
      {
        variantId: 10,
        quantity: 2,
        unitPriceAtAdd: 10,
        currentUnitPrice: 12,
        availableStock: 5,
      },
    ],
  });

  assert.equal(quote.subtotal, 24);
  assert.equal(quote.shipping, 0);
  assert.equal(quote.tax, 0);
  assert.equal(quote.discount, 0);
  assert.equal(quote.total, 24);
  assert.deepEqual(quote.stockConflicts, []);
});

test("Cart surfaces use real coupon integration without demo taxes or hard-coded promo codes", async () => {
  const [summary, page, checkout] = await Promise.all([
    readFile(new URL("../src/components/cart/CartSummary.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/CartPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/services/checkoutService.js", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(summary, /SUMMER20|WELCOME10|SHOPERA50|Taxes/);
  assert.match(summary, /applyCoupon/);
  assert.doesNotMatch(page, /Taxes|Estimated total/);
  assert.doesNotMatch(checkout, /TAX_RATE_ESTIMATE|SUMMER20|WELCOME10|SHOPERA50/);
  assert.match(checkout, /couponCode:\s*String\(couponCode/);
});
