import { COUPON_ENDPOINTS } from "../config/apiEndpoints.js";
import axiosClient from "./axiosClient.js";
import { requireCurrentSession } from "./authService.js";

const LEGACY_COUPON_KEYS = ["userCoupons", "selectedCheckoutCoupon"];

const read = (source, camel, pascal) => source?.[camel] ?? source?.[pascal];

const cleanupLegacyCouponStorage = () => {
  if (typeof localStorage === "undefined") {
    return;
  }

  LEGACY_COUPON_KEYS.forEach((key) => localStorage.removeItem(key));
};

const requireBuyer = () => {
  cleanupLegacyCouponStorage();
  return requireCurrentSession(["Buyer"]);
};

export const mapCouponDto = (dto = {}) => ({
  couponId: Number(read(dto, "couponId", "CouponId")) || 0,
  couponCode: String(read(dto, "couponCode", "CouponCode") || ""),
  discountType: String(read(dto, "discountType", "DiscountType") || ""),
  discountValue: Number(read(dto, "discountValue", "DiscountValue")) || 0,
  expiryDate: read(dto, "expiryDate", "ExpiryDate") || null,
  minPurchaseAmount:
    Number(read(dto, "minPurchaseAmount", "MinPurchaseAmount")) || 0,
  status: String(read(dto, "status", "Status") || ""),
});

export const mapCouponValidationDto = (dto = {}) => ({
  ...mapCouponDto(dto),
  subtotalAmount: Number(read(dto, "subtotalAmount", "SubtotalAmount")) || 0,
  discountAmount: Number(read(dto, "discountAmount", "DiscountAmount")) || 0,
  totalAmount: Number(read(dto, "totalAmount", "TotalAmount")) || 0,
  currencyCode: String(read(dto, "currencyCode", "CurrencyCode") || "EUR"),
});

export const getAvailableCoupons = async () => {
  requireBuyer();
  const response = await axiosClient.get(COUPON_ENDPOINTS.list);
  const data = response?.data ?? [];

  return Array.isArray(data) ? data.map(mapCouponDto) : [];
};

export const validateCoupon = async (couponCode) => {
  requireBuyer();
  const normalized = String(couponCode ?? "").trim().toUpperCase();

  if (!normalized) {
    throw new TypeError("Coupon code is required.");
  }

  const response = await axiosClient.post(COUPON_ENDPOINTS.validate, {
    couponCode: normalized,
  });

  return mapCouponValidationDto(response?.data ?? {});
};

export const applyCoupon = validateCoupon;

// Compatibility cleanup only. Coupon selection now lives in React state and
// is revalidated by the backend at checkout; it is never persisted locally.
export const clearSelectedCoupon = () => cleanupLegacyCouponStorage();
