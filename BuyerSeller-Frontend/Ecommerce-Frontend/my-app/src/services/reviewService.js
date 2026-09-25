import reviewHttpAdapter from "./adapters/reviewHttpAdapter.js";

const normalizeRating = (rating) => {
  const normalized = Number(rating);

  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 5) {
    throw new Error("REVIEW_RATING_INVALID");
  }

  return normalized;
};

const normalizeComment = (comment) => {
  const normalized = String(comment ?? "").trim();

  if (normalized.length > 2000) {
    throw new Error("REVIEW_COMMENT_TOO_LONG");
  }

  return normalized || null;
};

export const getProductReviews = async (productId, options = {}) =>
  reviewHttpAdapter.list(productId, options);

export const getMyReviewState = async (productId, options = {}) =>
  reviewHttpAdapter.mine(productId, options);

export const createReview = async (
  productId,
  { rating, comment } = {},
  options = {}
) =>
  reviewHttpAdapter.create(
    productId,
    {
      rating: normalizeRating(rating),
      comment: normalizeComment(comment),
    },
    options
  );

export const updateMyReview = async (
  productId,
  { rating, comment } = {},
  options = {}
) =>
  reviewHttpAdapter.updateMine(
    productId,
    {
      rating: normalizeRating(rating),
      comment: normalizeComment(comment),
    },
    options
  );

export const deleteMyReview = async (productId, options = {}) =>
  reviewHttpAdapter.deleteMine(productId, options);
