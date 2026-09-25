import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { configureHttpClientSession } from "../src/services/axiosClient.js";
import {
  createReview,
  deleteMyReview,
  getMyReviewState,
  getProductReviews,
  updateMyReview,
} from "../src/services/reviewService.js";
import {
  mapMyReviewStateDto,
  mapProductReviewsDto,
  mapReviewDto,
} from "../src/services/mappers/reviewMapper.js";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const reviewDto = (overrides = {}) => ({
  reviewId: 7,
  productId: 100,
  buyerName: "Buyer One",
  rating: 5,
  comment: "Excellent.",
  reviewDate: "2026-08-12T10:00:00Z",
  ...overrides,
});

test("Review mappers preserve review identity, rating summaries, and my-review state", () => {
  const review = mapReviewDto(reviewDto());
  assert.equal(review.reviewId, 7);
  assert.equal(review.productId, 100);
  assert.equal(review.rating, 5);

  const list = mapProductReviewsDto({
    ProductId: 100,
    AverageRating: 4.5,
    TotalCount: 2,
    Page: 1,
    PageSize: 8,
    TotalPages: 1,
    Items: [
      reviewDto(),
      reviewDto({ reviewId: 8, rating: 4 }),
    ],
  });

  assert.equal(list.averageRating, 4.5);
  assert.equal(list.totalCount, 2);
  assert.equal(list.items.length, 2);

  const mine = mapMyReviewStateDto({
    productId: 100,
    canCreate: false,
    reasonCode: "REVIEW_ALREADY_EXISTS",
    review: reviewDto(),
  });

  assert.equal(mine.canCreate, false);
  assert.equal(mine.reasonCode, "REVIEW_ALREADY_EXISTS");
  assert.equal(mine.review.reviewId, 7);
});

test("Review service uses the real review endpoints, shared JWT, and exact mutation bodies", async () => {
  const requests = [];

  configureHttpClientSession({
    getAccessToken: () => "header.payload.signature",
    onUnauthorized: () => {},
  });

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    if (url === "/api/products/100/reviews?page=1&pageSize=8") {
      return jsonResponse({
        productId: 100,
        averageRating: 5,
        totalCount: 1,
        page: 1,
        pageSize: 8,
        totalPages: 1,
        items: [reviewDto()],
      });
    }

    if (url === "/api/products/100/reviews/mine" && options.method === "GET") {
      return jsonResponse({
        productId: 100,
        canCreate: false,
        reasonCode: "REVIEW_ALREADY_EXISTS",
        review: reviewDto(),
      });
    }

    if (url === "/api/products/100/reviews" && options.method === "POST") {
      assert.deepEqual(JSON.parse(options.body), {
        rating: 4,
        comment: "Very good",
      });
      return jsonResponse(reviewDto({ rating: 4, comment: "Very good" }), 201);
    }

    if (url === "/api/products/100/reviews/mine" && options.method === "PATCH") {
      assert.deepEqual(JSON.parse(options.body), {
        rating: 3,
        comment: null,
      });
      return jsonResponse(reviewDto({ rating: 3, comment: null }));
    }

    if (url === "/api/products/100/reviews/mine" && options.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const list = await getProductReviews(100, { page: 1, pageSize: 8 });
  const mine = await getMyReviewState(100);
  const created = await createReview(100, { rating: 4, comment: " Very good " });
  const updated = await updateMyReview(100, { rating: 3, comment: "   " });
  await deleteMyReview(100);

  assert.equal(list.totalCount, 1);
  assert.equal(mine.review.reviewId, 7);
  assert.equal(created.rating, 4);
  assert.equal(updated.rating, 3);

  assert.deepEqual(
    requests.map(({ url, options }) => [options.method, url]),
    [
      ["GET", "/api/products/100/reviews?page=1&pageSize=8"],
      ["GET", "/api/products/100/reviews/mine"],
      ["POST", "/api/products/100/reviews"],
      ["PATCH", "/api/products/100/reviews/mine"],
      ["DELETE", "/api/products/100/reviews/mine"],
    ]
  );

  for (const { options } of requests) {
    assert.equal(options.headers.get("Authorization"), "Bearer header.payload.signature");
  }
});

test("Product Reviews UI is backend-backed and no longer renders the placeholder review copy", async () => {
  const [tabsSource, reviewsSource, serviceSource] = await Promise.all([
    readFile(new URL("../src/components/product/ProductTabs.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/product/ProductReviews.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/services/reviewService.js", import.meta.url), "utf8"),
  ]);

  assert.match(tabsSource, /<ProductReviews/);
  assert.doesNotMatch(tabsSource, /Customer reviews will appear here later/);
  assert.match(reviewsSource, /getProductReviews/);
  assert.match(reviewsSource, /getMyReviewState/);
  assert.match(reviewsSource, /createReview/);
  assert.match(reviewsSource, /updateMyReview/);
  assert.match(reviewsSource, /deleteMyReview/);
  assert.doesNotMatch(serviceSource, /localStorage|sessionStorage/);
});
