import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin dashboard exposes only supported widgets and brand terminology", async () => {
  const config = await import("../src/config/adminDashboardWidgets.js");
  const dashboard = await source("../src/pages/admin/AdminDashboardPage.jsx");
  assert.equal(config.DASHBOARD_WIDGETS.length, 13);
  for (const id of ["complaints-queue", "review-moderation", "recent-activities"]) {
    assert.equal(config.DASHBOARD_WIDGET_MAP.has(id), false);
    assert.doesNotMatch(dashboard, new RegExp(id));
  }
  assert.equal(config.DASHBOARD_WIDGET_MAP.get("pending-brand-applications").title, "Pending Brand Applications");
});

test("admin oversight and paid-sales surfaces use product language", async () => {
  const sources = await Promise.all([
    source("../src/pages/admin/ManageProductsPage.jsx"),
    source("../src/pages/admin/ManageOrdersPage.jsx"),
    source("../src/pages/admin/ManageReportsPage.jsx"),
    source("../src/pages/admin/AdminAnalyticsPage.jsx"),
  ]);
  assert.match(sources[0], /title="Product Oversight"/);
  assert.match(sources[0], /activate, deactivate, soft-delete, or restore/i);
  assert.match(sources[1], /title="Order Oversight"/);
  assert.match(sources[2], /Recognized Revenue/);
  assert.match(sources[2], /Paid Sales Gross/);
  assert.match(sources[2], /Export Paid Sales CSV/);
  assert.match(sources[3], /Paid Sales Performance/);
  assert.doesNotMatch(sources.join("\n"), /backend integration pending|integration not configured|Backend-3/i);
});


test("Admin dashboard fallback currency remains EUR", async () => {
  const dashboardService = await source("../src/api/adminDashboardService.js");
  assert.match(dashboardService, /currency:\s*["']EUR["']/);
  assert.doesNotMatch(dashboardService, /currency:\s*["']USD["']/);
});
