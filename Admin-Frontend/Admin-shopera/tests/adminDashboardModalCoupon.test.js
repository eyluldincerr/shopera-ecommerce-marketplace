import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("dashboard modal flows render through the viewport portal", async () => {
  const [portal, quickCategory, applications, products, accounts, orders, styles] = await Promise.all([
    source("../src/components/admin/AdminModalPortal.jsx"),
    source("../src/components/admin/AdminQuickCategoryManager.jsx"),
    source("../src/components/admin/PendingSellerVerification.jsx"),
    source("../src/components/admin/AdminProductOversightQueue.jsx"),
    source("../src/components/admin/AdminAccountAlerts.jsx"),
    source("../src/components/admin/AdminLatestOrders.jsx"),
    source("../src/styles/admin/adminModal.css"),
  ]);

  assert.match(portal, /createPortal\(children, document\.body\)/);
  assert.match(portal, /document\.body\.style\.overflow = "hidden"/);
  for (const widget of [quickCategory, applications, products, accounts, orders]) {
    assert.match(widget, /AdminModalPortal/);
  }
  assert.match(quickCategory, /CategoryFormModal/);
  assert.match(quickCategory, /AdminConfirmModal/);
  assert.match(applications, /SellerApplicationDetailsModal/);
  assert.match(applications, /SellerRejectionModal/);
  assert.match(products, /ProductDetailsModal/);
  assert.match(accounts, /UserDetailsModal/);
  assert.match(accounts, /SellerDetailsModal/);
  assert.match(orders, /OrderDetailsModal/);
  assert.match(orders, /getAdminOrderById\(orderId\)/);
  assert.match(styles, /min-height:\s*100dvh/);
  assert.match(styles, /max-height:\s*calc\(100dvh - 24px\)/);
});

test("Add Coupon opens the shared form on Dashboard and refreshes the real widget", async () => {
  const quickActions = await source("../src/components/admin/AdminQuickActions.jsx");
  const couponPage = await source("../src/pages/admin/ManageCouponsPage.jsx");
  const dashboard = await source("../src/pages/admin/AdminDashboardPage.jsx");
  const widget = await source("../src/components/admin/AdminCouponManager.jsx");
  const couponService = await source("../src/api/adminCouponService.js");

  const supportedLabels = quickActions.match(/\["(?:Add Category|Add Coupon|Review Brand Applications|View Product Oversight|Review Account Alerts|Inspect Orders)"/g) || [];
  assert.equal(supportedLabels.length, 6);
  assert.match(quickActions, /"Add Coupon", "coupon"/);
  assert.doesNotMatch(quickActions, /coupons\?action=create/);
  assert.match(quickActions, /onAddCoupon\?\.\(\)/);
  assert.doesNotMatch(quickActions, /Complaints|Reviews/);
  assert.match(couponPage, /<CouponFormModal/);
  assert.match(dashboard, /<AdminModalPortal isOpen=\{couponModalOpen\}>/);
  assert.match(dashboard, /createAdminCoupon\(values\)/);
  assert.match(dashboard, /admin-coupons-updated/);
  assert.match(widget, /getAdminCoupons\(\)/);
  assert.match(widget, /<CouponFormModal/);
  assert.match(widget, /updateAdminCoupon\(editing\.couponId, values\)/);
  assert.match(widget, /<AdminConfirmModal/);
  assert.match(widget, /setAdminCouponStatus\(statusAction\.coupon\.couponId, nextStatus\)/);
  assert.match(widget, /nextStatus === "ACTIVE"/);
  assert.match(widget, /canEnableCoupon\(coupon\)/);
  assert.match(widget, /admin-data-updated/);
  assert.match(widget, /No coupons have been created yet\./);
  assert.match(widget, /effectiveStatus === "ACTIVE"/);
  assert.match(couponService, /\/api\/admin\/coupons/);
});

test("Admin login preserves the official logo on a contrasting responsive panel", async () => {
  const login = await source("../src/pages/LoginPage.jsx");
  const styles = await source("../src/styles/login.css");

  assert.match(login, /shoperalogo\.png/);
  assert.match(login, /shopera-login-logo-panel/);
  assert.match(login, /alt="Shopera"/);
  assert.match(login, /<form[^>]+onSubmit=\{submit\}/);
  assert.match(styles, /\.shopera-login-logo-panel\{[^}]*background:#241942/);
  assert.match(styles, /@media\(max-width:480px\)/);
  assert.doesNotMatch(styles, /filter:/);
});
