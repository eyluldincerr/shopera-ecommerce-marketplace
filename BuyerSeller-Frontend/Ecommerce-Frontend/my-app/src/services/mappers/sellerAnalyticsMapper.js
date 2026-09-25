const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toOptionalFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeCurrency = (value) => {
  const code = String(value || "EUR").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "EUR";
};

const statisticPresentation = Object.freeze({
  NET_REVENUE: {
    titleKey: "analytics.netRevenue",
    icon: "dollar",
    color: "green",
    valueType: "currency",
  },
  TOTAL_ORDERS: {
    titleKey: "analytics.orders",
    icon: "bag",
    color: "orange",
    valueType: "integer",
  },
  UNITS_SOLD: {
    titleKey: "analytics.unitsSold",
    icon: "products",
    color: "blue",
    valueType: "integer",
  },
  AVERAGE_ORDER_VALUE: {
    titleKey: "analytics.averageOrderValue",
    icon: "average",
    color: "pink",
    valueType: "currency",
  },
});

const mapStatistics = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const metricId = String(item?.metricId || "").trim().toUpperCase();
      const presentation = statisticPresentation[metricId];

      if (!presentation) {
        return null;
      }

      return {
        id: metricId || index + 1,
        metricId,
        titleKey: presentation.titleKey,
        icon: presentation.icon,
        color: presentation.color,
        valueType: presentation.valueType,
        value: toFiniteNumber(item?.value),
        changePercent: toOptionalFiniteNumber(item?.changePercent),
      };
    })
    .filter(Boolean);

const mapCategory = (item, index) => ({
  id: Number(item?.categoryId) || index + 1,
  name: String(item?.name || "").trim() || "—",
  revenue: toFiniteNumber(item?.revenue),
  percentage: toFiniteNumber(item?.percentage),
});

const mapReview = (item, index) => ({
  id: Number(item?.reviewId) || index + 1,
  productId: Number(item?.productId) || null,
  customer: String(item?.buyerName || "").trim() || "—",
  product: String(item?.productName || "").trim() || "—",
  rating: toFiniteNumber(item?.rating),
  comment: String(item?.comment || "").trim(),
  date: item?.reviewDate || null,
  image: String(item?.imageUrl || "").trim(),
  symbol: String(item?.productName || "?").trim().charAt(0).toUpperCase() || "?",
});

export const mapSellerAnalyticsDto = (dto = {}) => {
  const currencyCode = normalizeCurrency(dto?.currencyCode);

  return {
    hasStore: dto?.hasStore !== false,
    storeId: Number(dto?.storeId) || null,
    currencyCode,
    statistics: mapStatistics(dto?.statistics),
    financialSummary: {
      grossSalesAmount: toFiniteNumber(dto?.financialSummary?.grossSalesAmount),
      sellerDiscountAmount: toFiniteNumber(dto?.financialSummary?.sellerDiscountAmount),
      commissionAmount: toFiniteNumber(dto?.financialSummary?.commissionAmount),
      refundAmount: toFiniteNumber(dto?.financialSummary?.refundAmount),
      costOfGoodsAmount: toFiniteNumber(dto?.financialSummary?.costOfGoodsAmount),
      sellerNetAmount: toFiniteNumber(dto?.financialSummary?.sellerNetAmount),
      estimatedProfitAmount: toFiniteNumber(dto?.financialSummary?.estimatedProfitAmount),
    },
    salesOverview: (Array.isArray(dto?.salesOverview) ? dto.salesOverview : []).map(
      (item, index) => ({
        id: index + 1,
        date: item?.date || null,
        bucket: String(item?.bucket || "DAY").toUpperCase(),
        value: toFiniteNumber(item?.value),
      })
    ),
    salesByCategory: (Array.isArray(dto?.salesByCategory)
      ? dto.salesByCategory
      : []
    ).map(mapCategory),
    monthlyRevenue: (Array.isArray(dto?.monthlyRevenue)
      ? dto.monthlyRevenue
      : []
    ).map((item, index) => ({
      id: `${item?.year || "year"}-${item?.month || index + 1}`,
      year: Number(item?.year) || null,
      month: Number(item?.month) || index + 1,
      value: toFiniteNumber(item?.value),
    })),
    topSellingProducts: (Array.isArray(dto?.topSellingProducts)
      ? dto.topSellingProducts
      : []
    ).map((item, index) => ({
      id: Number(item?.productId) || index + 1,
      productId: Number(item?.productId) || null,
      name: String(item?.name || "").trim() || "—",
      price: toOptionalFiniteNumber(item?.currentPrice),
      sales: toFiniteNumber(item?.unitsSold),
      revenue: toFiniteNumber(item?.revenue),
      rating: toFiniteNumber(item?.rating),
      reviews: toFiniteNumber(item?.reviewCount),
      image: String(item?.imageUrl || "").trim(),
      symbol: String(item?.name || "?").trim().charAt(0).toUpperCase() || "?",
    })),
    topCategories: (Array.isArray(dto?.topCategories) ? dto.topCategories : []).map(
      mapCategory
    ),
    recentReviews: (Array.isArray(dto?.recentReviews) ? dto.recentReviews : []).map(
      mapReview
    ),
  };
};

export default mapSellerAnalyticsDto;
