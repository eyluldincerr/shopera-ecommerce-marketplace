import { api } from "./apiClient.js";
import { adminCouponsData } from "../data/adminOrdersData.js";
import { getEffectiveCouponStatus, normalizeCouponCode } from "../utils/couponUtils.js";

const mapCoupon = (coupon) => ({
  ...coupon,
  effectiveStatus: coupon.isExpired ? "EXPIRED" : getEffectiveCouponStatus(coupon),
});

// Existing customer/order preview consumers keep their established read-only
// contract; Admin persistence below is exclusively backend-backed.
export const getAdminCouponRecordById = (couponId) =>
  adminCouponsData.find((coupon) => Number(coupon.couponId) === Number(couponId)) || null;

export const getCouponByCode = (couponCode) => {
  const coupon = adminCouponsData.find(
    (item) => normalizeCouponCode(item.couponCode) === normalizeCouponCode(couponCode),
  );
  return coupon ? mapCoupon(coupon) : null;
};

export const getAdminCoupons = async () =>
  (await api.get("/api/admin/coupons")).map(mapCoupon);

export const getAdminCouponById = async (couponId) => {
  const coupons = await getAdminCoupons();
  const coupon = coupons.find((item) => Number(item.couponId) === Number(couponId));
  if (!coupon) throw new Error("Coupon could not be found.");
  return coupon;
};

export const createAdminCoupon = async (values) =>
  mapCoupon(await api.post("/api/admin/coupons", { ...values, status: values.status || "ACTIVE" }));

export const updateAdminCoupon = async (couponId, values) =>
  mapCoupon(await api.patch(`/api/admin/coupons/${couponId}`, {
    ...values,
    updateUsageLimit: Object.hasOwn(values, "usageLimit"),
  }));

export const setAdminCouponStatus = async (couponId, status) => {
  if (status === "DISABLED") {
    await api.delete(`/api/admin/coupons/${couponId}`);
  } else {
    await api.patch(`/api/admin/coupons/${couponId}`, { status });
  }
  return getAdminCouponById(couponId);
};
