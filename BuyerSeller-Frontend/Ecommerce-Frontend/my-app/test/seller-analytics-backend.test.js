import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { mapSellerAnalyticsDto } from "../src/services/mappers/sellerAnalyticsMapper.js";

const sampleDto = {
  hasStore: true,
  storeId: 30,
  currencyCode: "EUR",
  statistics: [
    { metricId: "NET_REVENUE", value: 270, changePercent: 12.5 },
    { metricId: "TOTAL_ORDERS", value: 2, changePercent: null },
    { metricId: "UNITS_SOLD", value: 4, changePercent: -10 },
    { metricId: "AVERAGE_ORDER_VALUE", value: 135, changePercent: 5 },
  ],
  financialSummary: {
    grossSalesAmount: 300,
    sellerDiscountAmount: 25,
    commissionAmount: 5,
    refundAmount: 0,
    costOfGoodsAmount: 160,
    sellerNetAmount: 270,
    estimatedProfitAmount: 110,
  },
  salesOverview: [
    { date: "2026-08-11T00:00:00Z", bucket: "DAY", value: 220 },
  ],
  salesByCategory: [
    { categoryId: 40, name: "Electronics", revenue: 200, percentage: 66.7 },
  ],
  monthlyRevenue: [
    { year: 2026, month: 8, value: 270 },
  ],
  topSellingProducts: [
    {
      productId: 100,
      name: "Laptop",
      currentPrice: 100,
      unitsSold: 2,
      revenue: 200,
      rating: 5,
      reviewCount: 1,
      imageUrl: "/api/seller/products/100/images/500/content",
    },
  ],
  topCategories: [
    { categoryId: 40, name: "Electronics", revenue: 200, percentage: 66.7 },
  ],
  recentReviews: [
    {
      reviewId: 900,
      productId: 100,
      buyerName: "Review Buyer",
      productName: "Laptop",
      rating: 5,
      comment: "Excellent",
      reviewDate: "2026-08-13T08:00:00Z",
      imageUrl: "/api/seller/products/100/images/500/content",
    },
  ],
};

test("seller analytics mapper preserves authoritative financial values", () => {
  const result = mapSellerAnalyticsDto(sampleDto);

  assert.equal(result.currencyCode, "EUR");
  assert.equal(result.statistics[0].metricId, "NET_REVENUE");
  assert.equal(result.statistics[0].value, 270);
  assert.equal(result.statistics[2].changePercent, -10);
  assert.equal(result.financialSummary.costOfGoodsAmount, 160);
  assert.equal(result.financialSummary.estimatedProfitAmount, 110);
  assert.equal(result.salesByCategory[0].revenue, 200);
  assert.equal(result.topSellingProducts[0].sales, 2);
  assert.equal(result.topSellingProducts[0].image, sampleDto.topSellingProducts[0].imageUrl);
  assert.equal(result.recentReviews[0].customer, "Review Buyer");
});

test("Seller Analytics runtime uses backend API and contains no demo analytics source", async () => {
  const [service, adapter, page] = await Promise.all(
    [
      "src/services/sellerService.js",
      "src/services/adapters/sellerAnalyticsHttpAdapter.js",
      "src/pages/seller/SellerAnalyticsPage.jsx",
    ].map((path) =>
      readFile(new URL(`../${path}`, import.meta.url), "utf8")
    )
  );

  assert.match(service, /sellerAnalyticsHttpAdapter\.getAnalytics/);
  assert.match(adapter, /\/api\/seller\/analytics|SELLER_ANALYTICS_ENDPOINTS/);
  assert.doesNotMatch(`${service}\n${page}`, /Demo estimate|isDemoEstimate|sellerAnalyticsData/);
  assert.match(page, /financialSummary/);
  assert.match(page, /AuthenticatedImage/);
});
