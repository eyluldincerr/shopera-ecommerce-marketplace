import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import en from "../src/locales/en.json" with { type: "json" };
import tr from "../src/locales/tr.json" with { type: "json" };
import {
  CHECKOUT_STEPS,
  shippingFields,
} from "../src/constants/checkout.js";

test("checkout contains only Shipping and Review steps", () => {
  assert.deepEqual(
    CHECKOUT_STEPS.map(({ id, number, labelKey, path }) => ({
      id,
      number,
      labelKey,
      path,
    })),
    [
      {
        id: "shipping",
        number: 1,
        labelKey: "checkout.steps.shipping",
        path: "/checkout/shipping",
      },
      {
        id: "review",
        number: 2,
        labelKey: "checkout.steps.review",
        path: "/checkout/review",
      },
    ]
  );
  assert.equal(shippingFields.some((field) => field.name === "email"), true);
});

test("Shipping goes directly to Review and the legacy Payment URL only redirects", async () => {
  const [appRoutes, routePolicy, shipping, legacyRedirect] = await Promise.all([
    readFile(new URL("../src/routes/AppRoutes.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/routePolicy.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/CheckoutShippingPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/CheckoutLegacyPaymentRedirect.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(shipping, /navigate\("\/checkout\/review"\)/);
  assert.doesNotMatch(shipping, /checkout\/payment/);
  assert.match(appRoutes, /path="\/checkout\/payment"/);
  assert.match(appRoutes, /CheckoutLegacyPaymentRedirect/);
  assert.doesNotMatch(routePolicy, /CHECKOUT_PAYMENT/);
  assert.match(legacyRedirect, /isShippingValid\(shipping\)/);
  assert.match(legacyRedirect, /"\/checkout\/review"/);
  assert.match(legacyRedirect, /"\/checkout\/shipping"/);
  await assert.rejects(
    access(new URL("../src/pages/buyer/CheckoutPaymentPage.jsx", import.meta.url))
  );
});

test("checkout retains only the shipping snapshot and Review has no payment state", async () => {
  const [hookSource, layoutSource, reviewSource, serviceSource, shippingSource, guardSource] = await Promise.all([
    readFile(new URL("../src/hooks/useCheckoutData.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/CheckoutLayout.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/CheckoutReviewPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/services/checkoutService.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/CheckoutShippingPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/CheckoutRouteGuard.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(hookSource, /from "\.\.\/services\/checkoutService\.js"/);
  assert.doesNotMatch(hookSource, /localStorage|sessionStorage/);
  assert.equal((hookSource.match(/function useCheckoutData/g) || []).length, 1);
  assert.doesNotMatch(layoutSource, /isPaymentValid|payment/);
  assert.match(reviewSource, /checkout\.paymentNotice/);
  assert.match(reviewSource, /submitCheckout/);
  assert.match(reviewSource, /markCheckoutCompletionInProgress/);
  assert.match(reviewSource, /navigate\(orderPath/);
  assert.match(reviewSource, /void refreshCart/);
  assert.doesNotMatch(reviewSource, /navigate\(`\/orders/);
  assert.match(reviewSource, /checkout\.placeOrder/);
  assert.match(reviewSource, /item\.subtotal/);
  assert.doesNotMatch(reviewSource, /item\.price/);
  assert.match(reviewSource, /Number\.isFinite\(item\.unitPrice\)/);
  assert.match(reviewSource, /checkout\.billingAddress/);
  assert.match(reviewSource, /checkout\.sameAsShipping/);
  assert.match(reviewSource, /checkout-info-callout/);
  assert.doesNotMatch(reviewSource, /isPaymentValid|createPaymentSnapshot|saveCheckoutPaymentMethod|paymentMethod/);
  assert.doesNotMatch(serviceSource, /placeCheckoutOrder|createPaymentSnapshot|saveCheckoutPaymentMethod/);
  assert.match(serviceSource, /getOrderDetailRoute/);
  assert.match(guardSource, /getCheckoutCompletionOrderPath/);
  assert.doesNotMatch(shippingSource, /checkout-address-actions/);
  assert.match(shippingSource, /selectedAddress\?\.isTemporary && !editingAddress/);
  assert.doesNotMatch(shippingSource, /checkout\.editSelectedAddress/);
  assert.equal(
    en.checkout.paymentNotice,
    "Payment will be handled separately. No payment is collected by Shopera at this stage."
  );
  assert.equal(
    tr.checkout.paymentNotice,
    "Ödeme ayrı olarak ele alınacaktır. Shopera bu aşamada ödeme bilgisi toplamaz."
  );
});

test("checkout and payment-account runtime has no card collection or persistence", async () => {
  const source = (
    await Promise.all([
      "../src/constants/checkout.js",
      "../src/hooks/useCheckoutData.js",
      "../src/services/checkoutService.js",
      "../src/pages/buyer/CheckoutLayout.jsx",
      "../src/pages/buyer/CheckoutShippingPage.jsx",
      "../src/pages/buyer/CheckoutReviewPage.jsx",
      "../src/pages/buyer/CheckoutLegacyPaymentRedirect.jsx",
      "../src/pages/buyer/PaymentMethodsPage.jsx",
      "../src/locales/en.json",
      "../src/locales/tr.json",
    ].map((file) => readFile(new URL(file, import.meta.url), "utf8"))
  )).join("\n");

  assert.doesNotMatch(
    source,
    /cardNumber|cvv|expiry|mock_payment_token|tok_test_|paymentMethodId|paymentId/i
  );
  assert.doesNotMatch(
    source,
    /localStorage\.setItem\([^)]*(?:checkoutPaymentMethod|paymentMethods)/i
  );
  await assert.rejects(
    access(new URL("../src/services/paymentMethodService.js", import.meta.url))
  );
});
