import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("paid-sales pages share four truthful KPI cards with intentional zero formatting", async () => {
  const [kpis, analytics, reports] = await Promise.all([
    source("../src/components/admin/PaidSalesKpiGrid.jsx"),
    source("../src/pages/admin/AdminAnalyticsPage.jsx"),
    source("../src/pages/admin/ManageReportsPage.jsx"),
  ]);

  for (const label of ["Recognized Revenue", "Paid Sales Gross", "Paid Orders", "Average Paid Order"]) {
    assert.match(kpis, new RegExp(`label: "${label}"`));
  }
  assert.equal((kpis.match(/label: "/g) || []).length, 4);
  assert.match(kpis, /toFixed\(2\)/);
  assert.match(kpis, /\} orders`/);
  assert.match(analytics, /<PaidSalesKpiGrid/);
  assert.match(reports, /<PaidSalesKpiGrid/);
});

test("Analytics renders supported daily series, filters, paid-order trend, and professional empty state", async () => {
  const analytics = await source("../src/pages/admin/AdminAnalyticsPage.jsx");
  const service = await source("../src/api/adminAnalyticsService.js");

  assert.match(analytics, /getAdminAnalyticsData\(nextFilters\)/);
  assert.match(analytics, /type="date"/);
  assert.match(analytics, /Currency/);
  assert.match(analytics, /Paid Sales Performance/);
  assert.match(analytics, /dataKey="paidSales" name="Paid Sales Gross"/);
  assert.match(analytics, /dataKey="revenue" name="Recognized Revenue"/);
  assert.match(analytics, /Paid Orders Trend/);
  assert.match(analytics, /No paid sales exist for the selected period\./);
  assert.match(service, /getAdminReportData\(\{/);
  assert.match(service, /currencyCode,/);
  assert.match(service, /dateFrom: from/);
  assert.match(service, /dateTo: to/);
});

test("Reports renders real daily data and exports only paid-sales fields", async () => {
  const reports = await source("../src/pages/admin/ManageReportsPage.jsx");
  const service = await source("../src/api/adminReportService.js");

  assert.match(reports, /Export Paid Sales CSV/);
  assert.match(reports, /Daily Paid Sales Data/);
  assert.match(reports, /Report period/);
  assert.match(reports, /Selected currency/);
  assert.match(reports, /Rows in report/);
  assert.doesNotMatch(reports, /LineChart|BarChart|ResponsiveContainer|admin-paid-sales-chart/);
  assert.match(reports, /\["Date", "Paid Sales Gross", "Recognized Revenue", "Paid Orders"\]/);
  assert.match(reports, /getAdminReportData\(nextFilters\)/);
  assert.match(reports, /No paid sales exist for the selected period\./);
  assert.match(service, /\/api\/Admin\/dashboard/);
  assert.match(service, /\/api\/Admin\/analytics\/sales/);
  assert.match(service, /query: \{ currencyCode: selectedCurrency, from: dateFrom, to: dateTo \}/);

  const unsupported = /Top Products|Top Stores|Inventory|Returns|Cancellations|Delivery|Registration Trend|Payment Attempts|Role Analytics/;
  assert.doesNotMatch(reports, unsupported);
});

test("Analytics does not reintroduce unsupported marketplace metrics", async () => {
  const analytics = await source("../src/pages/admin/AdminAnalyticsPage.jsx");
  assert.match(analytics, /<LineChart/);
  assert.match(analytics, /<BarChart/);
  assert.doesNotMatch(analytics, /Top Products|Top Stores|Inventory|Returns|Cancellations|Delivery|Registration Trend|Payment Attempts|Role Analytics/);
});
