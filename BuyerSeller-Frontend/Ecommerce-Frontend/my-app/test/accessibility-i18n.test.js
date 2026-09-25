import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import en from "../src/locales/en.json" with { type: "json" };
import tr from "../src/locales/tr.json" with { type: "json" };
import { getNotificationPresentation } from "../src/services/notificationPresentationService.js";
import { getNotificationActionKey } from "../src/services/notificationRouteService.js";

const getTranslation = (translations, key) =>
  key.split(".").reduce((value, part) => value?.[part], translations);

const collectLeafKeys = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === "object" && !Array.isArray(child)
      ? collectLeafKeys(child, path)
      : [path];
  });

test("English and Turkish base locale keys stay in sync", () => {
  assert.deepEqual(collectLeafKeys(tr).sort(), collectLeafKeys(en).sort());
});

test("analytics locale keys remain available in both languages", () => {
  for (const key of [
    "analytics.netRevenue",
    "analytics.financialSummary",
    "analytics.grossSales",
    "analytics.estimatedProfit",
    "analytics.noComparison",
  ]) {
    assert.equal(typeof getTranslation(en, key), "string");
    assert.equal(typeof getTranslation(tr, key), "string");
  }
});

test("known buyer notifications expose translated presentation keys", () => {
  for (const type of [
    "OrderConfirmed",
    "OrderProcessing",
    "OrderShipped",
    "OrderDelivered",
    "BackInStockReminder",
    "CouponExpiring",
    "AccountSecurity",
  ]) {
    const presentation = getNotificationPresentation(type);

    for (const key of [
      presentation.titleKey,
      presentation.messageKey,
      presentation.actionKey,
      presentation.categoryKey,
    ]) {
      assert.equal(typeof getTranslation(en, key), "string");
      assert.equal(typeof getTranslation(tr, key), "string");
    }
  }
});

test("unknown notifications keep safe runtime fallback text and action keys", () => {
  const presentation = getNotificationPresentation("UnexpectedBackendType");

  assert.equal(presentation.titleKey, null);
  assert.equal(presentation.messageKey, null);
  assert.equal(
    getNotificationActionKey({ notificationType: "UnexpectedBackendType" }),
    "buyer.notifications.actions.viewDetails"
  );
});

test("changed Buyer overlays use the shared accessibility manager", async () => {
  const files = await Promise.all(
    [
      "src/components/product/ProductFilters.jsx",
      "src/components/address/AddressFormModal.jsx",
      "src/components/notifications/NotificationBell.jsx",
      "src/components/cart/CartDrawer.jsx",
    ].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8"))
  );

  files.forEach((source) => {
    assert.match(source, /useOverlayAccessibility/);
  });
  assert.match(files[0], /\{isMobileOpen && \(/);
  assert.doesNotMatch(files[0], /aria-hidden=\{!isMobileOpen\}/);
  assert.match(files[1], /aria-describedby=\{descriptionId\}/);
  assert.match(files[2], /initialFocusRef/);
  assert.match(files[3], /inert=\{!isCartOpen\}/);
});
