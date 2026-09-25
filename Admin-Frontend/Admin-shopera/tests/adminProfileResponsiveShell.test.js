import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Admin header loads authoritative profile and derives greeting and initials", async () => {
  const header = await source("../src/components/admin/AdminHeader.jsx");
  assert.match(header, /getAdminSettingsProfile/);
  assert.match(header, /setAdminProfile\(await getAdminSettingsProfile\(\)\)/);
  assert.match(header, /Hello, \{firstName\}/);
  assert.match(header, /createInitials\([\s\S]*profileDisplayName/);
  assert.doesNotMatch(header, /VITE_MOCK_AUTH_USER_ID/);
  assert.doesNotMatch(header, /const firstName[\s\S]*?\|\|\s*"Admin"/);
});

test("Settings publishes the saved profile immediately without changing auth authority", async () => {
  const settings = await source("../src/pages/admin/AdminSettingsPage.jsx");
  const header = await source("../src/components/admin/AdminHeader.jsx");
  const session = await source("../src/auth/authSession.js");
  assert.match(settings, /new CustomEvent\("admin-profile-updated", \{[\s\S]*detail: updatedProfile/);
  assert.match(header, /event\.detail[\s\S]*setAdminProfile\(event\.detail\)/);
  assert.match(header, /requireAuthenticatedAdmin\(\)/);
  assert.match(session, /getAccessToken[\s\S]*?\.token/);
  assert.doesNotMatch(settings, /setAuthenticated|sessionStorage/);
});

test("responsive Admin shell owns Dashboard and retains all breakpoint layouts", async () => {
  const dashboard = await source("../src/pages/admin/AdminDashboardPage.jsx");
  const shell = await source("../src/components/admin/AdminPageLayout.jsx");
  const dashboardCss = await source("../src/styles/admin/adminDashboard.css");
  const sidebarCss = await source("../src/styles/admin/adminSidebar.css");
  const config = await import("../src/config/adminDashboardWidgets.js");

  assert.match(dashboard, /<AdminPageLayout contentClassName="admin-dashboard-content">/);
  assert.match(shell, /isMobileNavigationOpen/);
  assert.match(dashboardCss, /\.shopera-admin-main\s*\{[\s\S]*?width:\s*0;[\s\S]*?min-width:\s*0;/);
  assert.match(sidebarCss, /@media \(max-width: 850px\)[\s\S]*position:\s*fixed;[\s\S]*translateX\(-105%\)/);
  assert.deepEqual(Object.keys(config.DASHBOARD_BREAKPOINTS), ["lg", "md", "sm", "xs", "xxs"]);
  assert.equal(config.DASHBOARD_WIDGETS.length, 13);
  assert.equal(new Set(config.DASHBOARD_WIDGETS.map(({ id }) => id)).size, 13);
});

test("Dashboard width follows its observed container without a desktop fallback", async () => {
  const dashboard = await source("../src/pages/admin/AdminDashboardPage.jsx");
  const dashboardCss = await source("../src/styles/admin/adminDashboard.css");

  assert.match(dashboard, /container\.getBoundingClientRect\(\)\.width/);
  assert.match(dashboard, /new ResizeObserver/);
  assert.match(dashboard, /contentRect\.width/);
  assert.match(dashboard, /observer\.disconnect\(\)/);
  assert.match(dashboard, /width=\{width\}/);
  assert.doesNotMatch(dashboard, /initialWidth:\s*1200/);
  assert.doesNotMatch(dashboard, /window\.innerWidth/);
  assert.match(dashboard, /useState\(1\)/);
  assert.match(dashboard, /setContainer\(node\)/);
  assert.match(dashboard, /\[container\]/);
  assert.doesNotMatch(dashboard, /\{width > 0 && \(/);
  assert.match(dashboardCss, /admin-dashboard-grid-container[\s\S]*?max-width:\s*100%;[\s\S]*?min-width:\s*0;/);
});

test("Dashboard renders visible widgets while container measurement is established", async () => {
  const dashboard = await source("../src/pages/admin/AdminDashboardPage.jsx");
  const config = await import("../src/config/adminDashboardWidgets.js");
  const layoutService = await import("../src/api/adminDashboardLayoutService.js");

  assert.match(dashboard, /<Responsive[\s\S]*width=\{width\}/);
  assert.match(dashboard, /visibleWidgets\.map\(\(widget\)/);
  assert.equal(config.DASHBOARD_WIDGETS.length, 13);
  assert.equal(config.DEFAULT_DASHBOARD_LAYOUTS.lg.length, 13);
  assert.equal(layoutService.ADMIN_DASHBOARD_SCHEMA_VERSION, 2);
});

test("Quick Actions wraps from container width and widget content can shrink", async () => {
  const dashboardCss = await source("../src/styles/admin/adminDashboard.css");
  assert.match(dashboardCss, /container-type:\s*inline-size/);
  assert.match(dashboardCss, /@container \(max-width: 900px\)[\s\S]*admin-quick-actions[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(dashboardCss, /@container \(max-width: 380px\)[\s\S]*admin-quick-actions[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(dashboardCss, /admin-quick-actions button[\s\S]*?min-width:\s*0;[\s\S]*?overflow-wrap:\s*anywhere/);
});

test("Quick Actions excludes unsupported complaints and review workflows", async () => {
  const quickActions = await source("../src/components/admin/AdminQuickActions.jsx");
  assert.doesNotMatch(quickActions, /Review Complaints/);
  assert.doesNotMatch(quickActions, /Moderate Reviews/);
  assert.match(quickActions, /Add Category/);
  assert.match(quickActions, /Review Brand Applications/);
  assert.match(quickActions, /View Product Oversight/);
  assert.match(quickActions, /Review Account Alerts/);
  assert.match(quickActions, /Inspect Orders/);
});
