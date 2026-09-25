import assert from "node:assert/strict";
import test, { describe } from "node:test";

import {
  DASHBOARD_COLUMNS,
  DEFAULT_DASHBOARD_LAYOUTS,
  OPERATIONAL_MANAGEMENT_WIDGET_IDS,
} from "../src/config/adminDashboardWidgets.js";
import {
  ADMIN_DASHBOARD_SCHEMA_VERSION,
  ADMIN_DASHBOARD_STORAGE_PREFIX,
  getAdminDashboardLayout,
  getAdminDashboardStorageKey,
  normalizeAdminDashboardLayout,
  resetAdminDashboardLayout,
  saveAdminDashboardLayout,
} from "../src/api/adminDashboardLayoutService.js";

const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

describe("schema-v2 persistence", () => {
  test("uses the unchanged schema and per-admin storage key", () => {
    assert.equal(ADMIN_DASHBOARD_SCHEMA_VERSION, 2);
    assert.equal(ADMIN_DASHBOARD_STORAGE_PREFIX, "shopera.adminDashboardLayout.v2.");
    assert.equal(getAdminDashboardStorageKey(42), "shopera.adminDashboardLayout.v2.42");
  });

  test("customized preference survives an in-memory round trip canonically", () => {
    const storage = createMemoryStorage();
    const layouts = structuredClone(DEFAULT_DASHBOARD_LAYOUTS);
    for (const items of Object.values(layouts)) {
      const review = items.find((item) => item.i === "account-alerts");
      review.x = 999;
      review.y = -5;
      review.w = 1;
      review.h = 1;
      items.push({ ...review });
    }
    const preference = normalizeAdminDashboardLayout(
      { schemaVersion: 2, layouts, hiddenWidgetIds: ["product-oversight"], lastKnownLayouts: {} },
      DEFAULT_DASHBOARD_LAYOUTS,
      DASHBOARD_COLUMNS,
    );
    const saved = saveAdminDashboardLayout(7, preference, DEFAULT_DASHBOARD_LAYOUTS, DASHBOARD_COLUMNS, storage);
    const loaded = getAdminDashboardLayout(7, DEFAULT_DASHBOARD_LAYOUTS, DASHBOARD_COLUMNS, storage);
    assert.deepEqual(loaded, saved);
    assert.deepEqual(loaded.hiddenWidgetIds, ["product-oversight"]);
    for (const items of Object.values(loaded.layouts)) {
      const operational = items.filter((item) => OPERATIONAL_MANAGEMENT_WIDGET_IDS.includes(item.i));
      assert.ok(operational.length > 0);
      assert.equal(items.filter((item) => item.i === "account-alerts").length, 1);
    }
  });

  test("loading persisted sparse data repairs and rewrites it", () => {
    const storage = createMemoryStorage();
    const key = getAdminDashboardStorageKey(9);
    const sparse = structuredClone(DEFAULT_DASHBOARD_LAYOUTS);
    for (const items of Object.values(sparse)) {
      items.filter((item) => OPERATIONAL_MANAGEMENT_WIDGET_IDS.includes(item.i)).forEach((item, index) => {
        item.x = index % 2 ? 999 : 5;
        item.y = 500 + index * 100;
      });
    }
    storage.setItem(key, JSON.stringify({ schemaVersion: 2, layouts: sparse, hiddenWidgetIds: [], lastKnownLayouts: {} }));
    const loaded = getAdminDashboardLayout(9, DEFAULT_DASHBOARD_LAYOUTS, DASHBOARD_COLUMNS, storage);
    assert.deepEqual(JSON.parse(storage.getItem(key)), loaded);
    assert.ok(loaded.layouts.lg.every((item) => item.x + item.w <= DASHBOARD_COLUMNS.lg));
  });

  test("reset persists all widgets and empty customization state", () => {
    const storage = createMemoryStorage();
    const reset = resetAdminDashboardLayout(11, DEFAULT_DASHBOARD_LAYOUTS, storage);
    assert.equal(reset.schemaVersion, 2);
    assert.deepEqual(reset.hiddenWidgetIds, []);
    assert.deepEqual(reset.lastKnownLayouts, {});
    assert.equal(reset.layouts.lg.length, 13);
    assert.deepEqual(JSON.parse(storage.getItem(getAdminDashboardStorageKey(11))), reset);
  });
});
