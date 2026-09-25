import { HttpClientError } from "../axiosClient.js";

const read = (source, ...keys) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }

  return undefined;
};

const integer = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};

const positiveInteger = (value) => {
  const number = integer(value);
  return number && number > 0 ? number : null;
};

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

const requireReview = (dto = {}) => {
  const reviewId = positiveInteger(read(dto, "reviewId", "ReviewId", "ReviewID"));
  const productId = positiveInteger(read(dto, "productId", "ProductId", "ProductID"));
  const rating = integer(read(dto, "rating", "Rating"));

  if (!reviewId || !productId || !rating || rating < 1 || rating > 5) {
    throw new HttpClientError("Review response is invalid.", {
      code: "REVIEW_RESPONSE_INVALID",
      data: dto,
    });
  }

  return {
    reviewId,
    productId,
    buyerName:
      nullableString(read(dto, "buyerName", "BuyerName")) || "Shopera Buyer",
    rating,
    comment: nullableString(read(dto, "comment", "Comment")),
    reviewDate:
      nullableString(read(dto, "reviewDate", "ReviewDate")) || "",
  };
};

export const mapReviewDto = (dto = {}) => requireReview(dto);

export const mapProductReviewsDto = (dto = {}) => {
  const productId = positiveInteger(read(dto, "productId", "ProductId", "ProductID"));

  if (!productId) {
    throw new HttpClientError("Product review list response is invalid.", {
      code: "PRODUCT_REVIEWS_RESPONSE_INVALID",
      data: dto,
    });
  }

  const items = read(dto, "items", "Items");

  if (!Array.isArray(items)) {
    throw new HttpClientError("Product review list items are invalid.", {
      code: "PRODUCT_REVIEWS_RESPONSE_INVALID",
      data: dto,
    });
  }

  return {
    productId,
    averageRating: number(read(dto, "averageRating", "AverageRating"), 0),
    totalCount: Math.max(0, integer(read(dto, "totalCount", "TotalCount")) ?? 0),
    page: Math.max(1, integer(read(dto, "page", "Page")) ?? 1),
    pageSize: Math.max(1, integer(read(dto, "pageSize", "PageSize")) ?? 20),
    totalPages: Math.max(0, integer(read(dto, "totalPages", "TotalPages")) ?? 0),
    items: items.map(requireReview),
  };
};

export const mapMyReviewStateDto = (dto = {}) => {
  const productId = positiveInteger(read(dto, "productId", "ProductId", "ProductID"));

  if (!productId) {
    throw new HttpClientError("My review state response is invalid.", {
      code: "MY_REVIEW_STATE_RESPONSE_INVALID",
      data: dto,
    });
  }

  const rawReview = read(dto, "review", "Review");

  return {
    productId,
    canCreate: Boolean(read(dto, "canCreate", "CanCreate")),
    reasonCode: nullableString(read(dto, "reasonCode", "ReasonCode")),
    review: rawReview ? requireReview(rawReview) : null,
  };
};
