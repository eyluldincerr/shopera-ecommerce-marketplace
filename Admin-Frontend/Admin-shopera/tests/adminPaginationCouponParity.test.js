import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canEnableCoupon } from "../src/utils/couponUtils.js";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Product and Order oversight use the shared pagination footer", async () => {
  const [component, products, orders, tableStyles] = await Promise.all([
    source("../src/components/admin/AdminPagination.jsx"),
    source("../src/pages/admin/ManageProductsPage.jsx"),
    source("../src/pages/admin/ManageOrdersPage.jsx"),
    source("../src/styles/admin/adminTable.css"),
  ]);

  assert.match(products, /<AdminPagination[^>]+itemLabel="products"/);
  assert.match(orders, /<AdminPagination[^>]+itemLabel="orders"/);
  assert.match(component, /type="button" disabled=\{currentPage <= 1 \|\| isLoading\}/);
  assert.match(component, /type="button" disabled=\{currentPage >= totalPages \|\| isLoading\}/);
  assert.match(component, /\{totalPages > 1 && <button/);
  assert.match(component, /Page \{currentPage\} of \{totalPages\}/);
  assert.match(tableStyles, /\.admin-data-table-wrapper[^}]*overflow-x: auto/s);
  assert.match(tableStyles, /\.admin-table-pagination[^}]*margin-top: 16px/s);
  assert.doesNotMatch(products, /className="admin-pagination"/);
  assert.doesNotMatch(orders, /className="admin-pagination"/);
});

test("coupon enable eligibility rejects expired or non-disabled coupons", () => {
  const now = new Date("2030-01-01T00:00:00Z").getTime();
  assert.equal(canEnableCoupon({ status: "DISABLED", expiryDate: "2030-02-01" }, now), true);
  assert.equal(canEnableCoupon({ status: "DISABLED", expiryDate: "2029-12-31" }, now), false);
  assert.equal(canEnableCoupon({ status: "ACTIVE", expiryDate: "2030-02-01" }, now), false);
});

test("Dashboard and Coupon Management expose the same safe status actions", async () => {
  const [dashboard, page, service] = await Promise.all([
    source("../src/components/admin/AdminCouponManager.jsx"),
    source("../src/pages/admin/ManageCouponsPage.jsx"),
    source("../src/api/adminCouponService.js"),
  ]);

  for (const sourceText of [dashboard, page]) {
    assert.match(sourceText, /coupon\.effectiveStatus === "ACTIVE"/);
    assert.match(sourceText, /coupon\.effectiveStatus === "DISABLED"/);
    assert.match(sourceText, /canEnableCoupon\(coupon\)/);
    assert.match(sourceText, />Disable</);
    assert.match(sourceText, />Enable</);
  }
  assert.match(dashboard, /AdminModalPortal isOpen=\{Boolean\(statusAction\)\}/);
  assert.match(dashboard, /setAdminCouponStatus\(statusAction\.coupon\.couponId, nextStatus\)/);
  assert.match(dashboard, /await load\(\)/);
  assert.match(dashboard, /admin-data-updated/);
  assert.doesNotMatch(dashboard, /useNavigate|navigate\(/);
  assert.match(service, /api\.delete\(`\/api\/admin\/coupons\/\$\{couponId\}`\)/);
  assert.match(service, /api\.patch\(`\/api\/admin\/coupons\/\$\{couponId\}`/);
});
