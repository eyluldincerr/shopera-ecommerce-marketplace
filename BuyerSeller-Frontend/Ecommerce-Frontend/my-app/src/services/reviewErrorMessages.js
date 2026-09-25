const REVIEW_ERROR_KEYS = Object.freeze({
  REVIEW_DELIVERED_ORDER_REQUIRED: "productReviews.eligibility.deliveredRequired",
  REVIEW_ALREADY_EXISTS: "productReviews.eligibility.alreadyReviewed",
  PRODUCT_NOT_REVIEWABLE: "productReviews.eligibility.productUnavailable",
  REVIEW_NOT_FOUND: "productReviews.errors.notFound",
  REVIEW_INVALID: "productReviews.errors.invalid",
  BUYER_FORBIDDEN: "productReviews.eligibility.buyerOnly",
  INVALID_PRODUCT_ID: "productReviews.errors.unavailable",
});

export const getReviewErrorMessage = (
  error,
  t,
  fallbackKey = "productReviews.errors.general"
) => {
  if (error?.isNetworkError || error?.code === "NETWORK_ERROR") {
    return t("productReviews.errors.network");
  }

  const key = REVIEW_ERROR_KEYS[error?.code];

  if (key) {
    return t(key);
  }

  if (error?.status === 401) {
    return t("productReviews.eligibility.signInRequired");
  }

  if (error?.status === 403) {
    return t("productReviews.eligibility.buyerOnly");
  }

  return t(fallbackKey);
};
