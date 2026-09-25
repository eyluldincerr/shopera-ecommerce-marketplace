import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  getAdminSettingsProfile,
  updateAdminSettingsProfile,
} from "../src/api/adminSettingsService.js";
import {
  createAdminCoupon,
  getAdminCoupons,
  setAdminCouponStatus,
  updateAdminCoupon,
} from "../src/api/adminCouponService.js";

const jsonResponse = (body, status = 200) => new Response(
  status === 204 ? null : JSON.stringify(body),
  { status, headers: { "content-type": "application/json" } },
);

test("profile uses real shared route and PATCH contains only editable fields", async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return jsonResponse({ userId: 7, fullName: "Admin", email: "read@only.test", phoneNumber: "1", role: "ADMIN", accountStatus: "ACTIVE" });
  };
  await getAdminSettingsProfile();
  await updateAdminSettingsProfile({ fullName: "New Admin", phoneNumber: "2", email: "ignored@test", userId: 999 });
  assert.match(requests[0].url, /\/api\/profile$/);
  assert.equal(requests[1].options.method, "PATCH");
  assert.deepEqual(JSON.parse(requests[1].options.body), { fullName: "New Admin", phoneNumber: "2" });
});

test("Settings renders email as read-only and contains no fake profile", async () => {
  const source = await readFile(new URL("../src/pages/admin/AdminSettingsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /name="email"[\s\S]*?readOnly/);
  assert.doesNotMatch(source, /mock user|fake profile/i);
});

test("coupons list, create, update nullable limit, and disable use backend routes", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    const method = options.method || "GET";
    if (method === "DELETE") return jsonResponse(null, 204);
    if (method === "GET") return jsonResponse([{ couponId: 4, couponCode: "REAL", status: "DISABLED", isExpired: false }]);
    return jsonResponse({ couponId: 4, couponCode: "REAL", status: "ACTIVE", isExpired: false });
  };
  await getAdminCoupons();
  await createAdminCoupon({ couponCode: "REAL", discountType: "FIXED_AMOUNT", discountValue: 5, expiryDate: "2030-01-01", minPurchaseAmount: 0, usageLimit: null });
  await updateAdminCoupon(4, { usageLimit: null });
  await setAdminCouponStatus(4, "DISABLED");
  assert.equal(requests[0].options.method, "GET");
  assert.equal(requests[1].options.method, "POST");
  assert.deepEqual(JSON.parse(requests[2].options.body), { usageLimit: null, updateUsageLimit: true });
  assert.equal(requests[3].options.method, "DELETE");
  assert.match(requests[3].url, /\/api\/admin\/coupons\/4$/);
});

test("backend ProblemDetails errors are shown to callers", async () => {
  globalThis.fetch = async () => jsonResponse({ detail: "Duplicate coupon." }, 409);
  await assert.rejects(() => createAdminCoupon({}), /Duplicate coupon/);
});
