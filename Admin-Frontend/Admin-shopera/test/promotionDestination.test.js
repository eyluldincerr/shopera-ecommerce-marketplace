import assert from "node:assert/strict";
import test from "node:test";

import {
  PROMOTION_DESTINATION_TYPES,
  buildPromotionDestination,
  createRelativeHeroWindow,
  getClosestHeroDurationHours,
  inferPromotionDestination,
} from "../src/utils/promotionDestination.js";

test("builds Shopera store/category/product destinations from real IDs", () => {
  assert.equal(
    buildPromotionDestination({ type: PROMOTION_DESTINATION_TYPES.STORE, storeId: 12 }),
    "/stores/12",
  );
  assert.equal(
    buildPromotionDestination({ type: PROMOTION_DESTINATION_TYPES.CATEGORY, categoryId: 5 }),
    "/categories/5",
  );
  assert.equal(
    buildPromotionDestination({ type: PROMOTION_DESTINATION_TYPES.PRODUCT, productId: 88 }),
    "/products/88",
  );
});

test("encodes search destinations and preserves custom URLs", () => {
  assert.equal(
    buildPromotionDestination({ type: PROMOTION_DESTINATION_TYPES.SEARCH, searchTerm: "gaming laptop" }),
    "/search?q=gaming%20laptop",
  );
  assert.equal(
    buildPromotionDestination({ type: PROMOTION_DESTINATION_TYPES.CUSTOM, customUrl: "https://example.com/deal" }),
    "https://example.com/deal",
  );
});

test("infers existing Shopera destination types without losing custom links", () => {
  assert.deepEqual(inferPromotionDestination("/stores/9").type, PROMOTION_DESTINATION_TYPES.STORE);
  assert.deepEqual(inferPromotionDestination("/products/14").type, PROMOTION_DESTINATION_TYPES.PRODUCT);
  assert.equal(inferPromotionDestination("/search?q=phone").searchTerm, "phone");
  assert.equal(inferPromotionDestination("/search?sort=newest").type, PROMOTION_DESTINATION_TYPES.CUSTOM);
});

test("creates a relative same-format hero window", () => {
  const now = new Date("2026-08-23T15:00:00.000Z");
  const { startDate, endDate, durationHours } = createRelativeHeroWindow(4, now);
  assert.equal(durationHours, 4);
  assert.equal(startDate.toISOString(), "2026-08-23T15:00:00.000Z");
  assert.equal(endDate.toISOString(), "2026-08-23T19:00:00.000Z");
  assert.equal(getClosestHeroDurationHours(startDate, endDate), 4);
});
