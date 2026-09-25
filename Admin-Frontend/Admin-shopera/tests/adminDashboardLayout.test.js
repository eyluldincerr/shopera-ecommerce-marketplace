import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DASHBOARD_BREAKPOINT_NAMES, DASHBOARD_COLUMNS, DASHBOARD_WIDGETS, DASHBOARD_WIDGET_MAP, DEFAULT_DASHBOARD_LAYOUTS } from "../src/config/adminDashboardWidgets.js";
import { ADMIN_DASHBOARD_SCHEMA_VERSION, createDefaultAdminDashboardLayout, moveWidgetInOrder, normalizeAdminDashboardLayout } from "../src/api/adminDashboardLayoutService.js";

const collides = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const assertValid = (layout, breakpoint) => {
  assert.equal(layout.length, new Set(layout.map((item) => item.i)).size);
  layout.forEach((item, index) => {
    assert.ok(item.x >= 0 && item.x + item.w <= DASHBOARD_COLUMNS[breakpoint]);
    assert.equal(item.w, DASHBOARD_WIDGET_MAP.get(item.i).widths[breakpoint]);
    assert.equal(item.h, DASHBOARD_WIDGET_MAP.get(item.i).heights[breakpoint]);
    layout.slice(index + 1).forEach((other) => assert.equal(collides(item, other), false));
  });
};

test("registry contains 13 supported widgets at every valid breakpoint", () => {
  assert.equal(DASHBOARD_WIDGETS.length, 13);
  assert.equal(DASHBOARD_WIDGET_MAP.get("coupon-manager").title, "Coupon Manager");
  for (const id of ["complaints-queue", "review-moderation", "recent-activities"]) assert.equal(DASHBOARD_WIDGET_MAP.has(id), false);
  for (const breakpoint of DASHBOARD_BREAKPOINT_NAMES) {
    assert.equal(DEFAULT_DASHBOARD_LAYOUTS[breakpoint].length, 13);
    assertValid(DEFAULT_DASHBOARD_LAYOUTS[breakpoint], breakpoint);
  }
});

test("schema-v2 normalization preserves valid free coordinates and adds coupon manager", () => {
  const oldLayouts = structuredClone(DEFAULT_DASHBOARD_LAYOUTS);
  for (const breakpoint of DASHBOARD_BREAKPOINT_NAMES) oldLayouts[breakpoint] = oldLayouts[breakpoint].filter((item) => item.i !== "coupon-manager");
  const freeItem = oldLayouts.lg.find((item) => item.i === "quick-category-manager");
  freeItem.x = 2;
  freeItem.y = 90;
  const result = normalizeAdminDashboardLayout({ schemaVersion: 2, layouts: oldLayouts, hiddenWidgetIds: [], lastKnownLayouts: {} }, DEFAULT_DASHBOARD_LAYOUTS, DASHBOARD_COLUMNS);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.layouts.lg.find((item) => item.i === "quick-category-manager").x, 2);
  assert.ok(result.layouts.lg.some((item) => item.i === "coupon-manager"));
  for (const breakpoint of DASHBOARD_BREAKPOINT_NAMES) assertValid(result.layouts[breakpoint], breakpoint);
});

test("obsolete ids are removed without clearing hidden state", () => {
  const layouts = structuredClone(DEFAULT_DASHBOARD_LAYOUTS);
  layouts.lg.push({ i: "recent-activities", x: 0, y: 999, w: 5, h: 12 });
  const result = normalizeAdminDashboardLayout({ schemaVersion: 2, layouts, hiddenWidgetIds: ["product-oversight", "complaints-queue"], lastKnownLayouts: {} }, DEFAULT_DASHBOARD_LAYOUTS, DASHBOARD_COLUMNS);
  assert.deepEqual(result.hiddenWidgetIds, ["product-oversight"]);
  assert.equal(result.layouts.lg.some((item) => item.i === "recent-activities"), false);
});

test("keyboard ordering and reset remain available", () => {
  const ids = DASHBOARD_WIDGETS.map((widget) => widget.id);
  assert.equal(moveWidgetInOrder(ids, ids[2], 1)[3], ids[2]);
  const reset = createDefaultAdminDashboardLayout(DEFAULT_DASHBOARD_LAYOUTS);
  assert.equal(reset.schemaVersion, ADMIN_DASHBOARD_SCHEMA_VERSION);
  assert.equal(reset.layouts.lg.length, 13);
});

test("drag stop persists native grid coordinates without canonical remount", async () => {
  const page = await readFile(new URL("../src/pages/admin/AdminDashboardPage.jsx", import.meta.url), "utf8");
  assert.match(page, /\[breakpoint\]: finalLayout\.map/);
  assert.doesNotMatch(page, /setGridRevision|getCompactor|dashboard-grid-\$\{gridRevision\}/);
  assert.doesNotMatch(page, /allowOverlap=\{true\}/);
  assert.match(page, /bounded:\s*true/);
});
