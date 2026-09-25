export const COUPON_DISCOUNT_TYPES = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
];

export const COUPON_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "DISABLED",
];

export const normalizeCouponCode = (couponCode) =>
  String(couponCode || "").trim().toUpperCase();

export const normalizeCouponEnum = (value) =>
  String(value || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();

export const getCouponExpiryTimestamp = (expiryDate) => {
  const timestamp = new Date(expiryDate).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const getEffectiveCouponStatus = (
  coupon,
  now = Date.now(),
) => {
  const storedStatus = normalizeCouponEnum(coupon?.status);

  if (!COUPON_STATUSES.includes(storedStatus)) {
    return null;
  }

  if (storedStatus === "DISABLED") {
    return "DISABLED";
  }

  const expiryTimestamp = getCouponExpiryTimestamp(
    coupon?.expiryDate,
  );

  if (
    storedStatus === "EXPIRED" ||
    expiryTimestamp === null ||
    expiryTimestamp < now
  ) {
    return "EXPIRED";
  }

  return "ACTIVE";
};

export const canEnableCoupon = (coupon, now = Date.now()) => {
  if (normalizeCouponEnum(coupon?.status) !== "DISABLED") return false;
  const expiryTimestamp = getCouponExpiryTimestamp(coupon?.expiryDate);
  return expiryTimestamp !== null && expiryTimestamp >= now;
};

export const calculateCouponDiscount = (coupon, subtotal) => {
  const numericSubtotal = Number(subtotal);

  if (
    !Number.isFinite(numericSubtotal) ||
    numericSubtotal < 0 ||
    getEffectiveCouponStatus(coupon) !== "ACTIVE"
  ) {
    return 0;
  }

  const minimumPurchase = Number(coupon?.minPurchaseAmount || 0);

  if (numericSubtotal < minimumPurchase) {
    return 0;
  }

  const discountValue = Number(coupon?.discountValue);
  let discount = 0;

  if (coupon?.discountType === "PERCENTAGE") {
    discount = numericSubtotal * (discountValue / 100);
  } else if (coupon?.discountType === "FIXED_AMOUNT") {
    discount = discountValue;
  }

  return Number.isFinite(discount)
    ? Math.min(Math.max(discount, 0), numericSubtotal)
    : 0;
};
