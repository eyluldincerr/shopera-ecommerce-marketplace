export const COMMERCE_ERROR_CODES = Object.freeze({
  insufficientStock: "INSUFFICIENT_STOCK",
  cartStoreConflict: "CART_STORE_CONFLICT",
  cartConcurrencyConflict: "CART_CONCURRENCY_CONFLICT",
  variantUnavailable: "VARIANT_UNAVAILABLE",
  couponNotFound: "COUPON_NOT_FOUND",
  couponInactive: "COUPON_INACTIVE",
  couponExpired: "COUPON_EXPIRED",
  couponMinimumNotMet: "COUPON_MINIMUM_NOT_MET",
  couponCartEmpty: "COUPON_CART_EMPTY",
  couponUnsupported: "COUPON_DISCOUNT_TYPE_UNSUPPORTED",
});

const readInteger = (source, ...keys) => {
  for (const key of keys) {
    const value = source?.[key];

    if (value === undefined || value === null || value === "") {
      continue;
    }

    const number = Number(value);
    if (Number.isInteger(number)) {
      return number;
    }
  }

  return null;
};

const readNumber = (source, ...keys) => {
  for (const key of keys) {
    const value = source?.[key];

    if (value === undefined || value === null || value === "") {
      continue;
    }

    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
};

export const getCommerceConflictMessage = (
  error,
  t,
  scope = "cart"
) => {
  const code = error?.code || error?.data?.code || "";
  const prefix = `${scope}.errors`;

  if (code === COMMERCE_ERROR_CODES.insufficientStock) {
    const availableStock = readInteger(
      error?.data,
      "availableStock",
      "AvailableStock"
    );

    if (availableStock === 0) {
      return t(`${prefix}.outOfStock`);
    }

    if (availableStock !== null && availableStock > 0) {
      return t(`${prefix}.limitedStock`, { count: availableStock });
    }

    return t(`${prefix}.quantityUnavailable`);
  }

  if (code === COMMERCE_ERROR_CODES.cartStoreConflict) {
    return t(`${prefix}.storeConflict`);
  }

  if (code === COMMERCE_ERROR_CODES.cartConcurrencyConflict) {
    return t(`${prefix}.conflict`);
  }

  if (code === COMMERCE_ERROR_CODES.variantUnavailable) {
    return t(`${prefix}.itemUnavailable`);
  }

  if (code === COMMERCE_ERROR_CODES.couponNotFound) {
    return t(`${prefix}.couponNotFound`);
  }

  if (code === COMMERCE_ERROR_CODES.couponInactive) {
    return t(`${prefix}.couponInactive`);
  }

  if (code === COMMERCE_ERROR_CODES.couponExpired) {
    return t(`${prefix}.couponExpired`);
  }

  if (code === COMMERCE_ERROR_CODES.couponMinimumNotMet) {
    const minimum = readNumber(
      error?.data,
      "minimumPurchaseAmount",
      "MinimumPurchaseAmount"
    );

    return minimum === null
      ? t(`${prefix}.couponMinimumUnknown`)
      : t(`${prefix}.couponMinimumNotMet`, { amount: minimum.toFixed(2) });
  }

  if (code === COMMERCE_ERROR_CODES.couponCartEmpty) {
    return t(`${prefix}.couponCartEmpty`);
  }

  if (code === COMMERCE_ERROR_CODES.couponUnsupported) {
    return t(`${prefix}.couponUnsupported`);
  }

  return null;
};
