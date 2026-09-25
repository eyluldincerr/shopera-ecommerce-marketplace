// src/pages/seller/SellerAnalyticsPage.jsx

import { useCallback, useEffect, useState } from "react";

import {
  getSellerAnalytics,
  subscribeSellerData,
} from "../../services/sellerService";
import SellerAsyncState from "../../components/seller/SellerAsyncState";
import AuthenticatedImage from "../../components/common/AuthenticatedImage";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";

import { useTranslation } from "react-i18next";

const formatCurrencyValue = (
  value,
  currencyCode = "EUR",
  locale,
  compact = false
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode || "EUR",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }).format(Number(value) || 0);

const formatIntegerValue = (value, locale) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getAxisLabels = (maximum, currencyCode, locale) =>
  Array.from({ length: 6 }, (_, index) =>
    formatCurrencyValue(
      (maximum * (5 - index)) / 5,
      currencyCode,
      locale,
      true
    )
  );

function AnalyticsEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="seller-analytics-chart-empty">
      <span aria-hidden="true">▥</span>
      <strong>{t("analytics.noSalesData")}</strong>
      <p>{t("analytics.noSalesDataDescription")}</p>
    </div>
  );
}

function AnalyticsStatisticIcon({ type }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (type === "dollar") {
    return (
      <svg {...commonProps}>
        <path d="M12 2v20" />
        <path d="M17 6.5c-1-1-2.3-1.5-4-1.5-2.5 0-4 1.1-4 3s1.5 2.7 4 3.2 4 1.3 4 3.3-1.8 3.5-4.5 3.5-3.5-.6-4.5-1.7" />
      </svg>
    );
  }

  if (type === "bag") {
    return (
      <svg {...commonProps}>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }

  if (type === "products") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5" />
        <path d="M12 12v9" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4 18V9" />
      <path d="M10 18V5" />
      <path d="M16 18v-7" />
      <path d="M22 18V3" />
    </svg>
  );
}

function SalesOverviewChart({ sales = [], period, currencyCode }) {
  const { t, i18n } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(null);
  const getSaleLabel = (sale) => {
    const date = new Date(sale.date);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    if (sale.bucket === "MONTH" || period === "ALL_TIME") {
      return new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        year: "2-digit",
      }).format(date);
    }

    return new Intl.DateTimeFormat(i18n.language, {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  if (!sales.some((sale) => Number(sale.value) > 0)) {
    return <AnalyticsEmptyState />;
  }

  const highestValue = Math.max(
  ...sales.map((sale) => Number(sale.value) || 0)
);

const maxValue = highestValue * 1.2;
const axisLabels = getAxisLabels(maxValue, currencyCode, i18n.language);

  const getPoint = (sale, index) => {
    const x =
      sales.length === 1
        ? 50
        : (index / (sales.length - 1)) * 100;

    const y = 90 - (sale.value / maxValue) * 75;

    return { x, y };
  };

  const linePoints = sales
    .map((sale, index) => {
      const point = getPoint(sale, index);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  const activeSale =
    activeIndex !== null ? sales[activeIndex] : null;

  const activePoint =
    activeIndex !== null
      ? getPoint(sales[activeIndex], activeIndex)
      : null;

  const handleMouseMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - bounds.left;

    const relativeX = Math.min(
      Math.max(mouseX / bounds.width, 0),
      1
    );

    const nearestIndex = Math.round(
      relativeX * (sales.length - 1)
    );

    setActiveIndex(nearestIndex);
  };

  return (
    <div className="seller-analytics-sales-chart">
      <div className="seller-analytics-sales-chart__labels">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div
        className="seller-analytics-sales-chart__area"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <div className="seller-analytics-sales-chart__grid" />

        <svg
          className="seller-analytics-sales-chart__svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-label={t("analytics.salesOverviewChart")}
        >
          <defs>
            <linearGradient
              id="sellerAnalyticsSalesFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#4a37e6"
                stopOpacity="0.26"
              />

              <stop
                offset="100%"
                stopColor="#4a37e6"
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          <polygon
            points={`0,100 ${linePoints} 100,100`}
            fill="url(#sellerAnalyticsSalesFill)"
          />

          <polyline
            points={linePoints}
            fill="none"
            stroke="#3b2ee5"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />

          {sales.map((sale, index) => {
            const point = getPoint(sale, index);
            const isActive = activeIndex === index;

            return (
              <circle
                key={sale.id}
                cx={point.x}
                cy={point.y}
                r={isActive ? "2.2" : "1.4"}
                fill={isActive ? "#ffffff" : "#3b2ee5"}
                stroke="#3b2ee5"
                strokeWidth={isActive ? "1.2" : "0"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {activePoint && (
            <line
              x1={activePoint.x}
              y1="0"
              x2={activePoint.x}
              y2="100"
              stroke="#7166e8"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {activeSale && activePoint && (
          <div
            className="seller-analytics-sales-chart__tooltip"
            style={{
              left: `${activePoint.x}%`,
              top: `${activePoint.y}%`,
            }}
          >
            <span>{getSaleLabel(activeSale)}</span>

            <strong>
              {formatCurrencyValue(
                activeSale.value,
                currencyCode,
                i18n.language
              )}
            </strong>
          </div>
        )}

        <div className="seller-analytics-sales-chart__days">
          {sales.map((sale) => (
            <span key={sale.id}>{getSaleLabel(sale)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryDonut({ categories = [], currencyCode }) {
  const { t, i18n } = useTranslation();
  if (!categories.some((category) => Number(category.revenue) > 0)) {
    return <AnalyticsEmptyState />;
  }
  const gradientParts = [];
  let currentStart = 0;

  categories.forEach((category, index) => {
    const end = currentStart + category.percentage;

    gradientParts.push(
      `var(--seller-analytics-category-${index + 1}) ${currentStart}% ${end}%`
    );

    currentStart = end;
  });

  return (
    <div className="seller-analytics-category-chart">
      <div
        className="seller-analytics-category-chart__donut"
        style={{
          background: `conic-gradient(${gradientParts.join(", ")})`,
        }}
        aria-label={t("analytics.salesByCategoryChart")}
      >
        <div className="seller-analytics-category-chart__center" />
      </div>

      <div className="seller-analytics-category-chart__legend">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="seller-analytics-category-chart__legend-item"
          >
            <span
              className={`seller-analytics-category-chart__dot seller-analytics-category-chart__dot--${
                index + 1
              }`}
            />

            <div>
              <strong>{category.name}</strong>
              <small>
                {formatCurrencyValue(
                  category.revenue,
                  currencyCode,
                  i18n.language
                )}
              </small>
            </div>

            <span>{category.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyRevenueChart({ monthlyRevenue = [], currencyCode }) {
  const { i18n } = useTranslation();
  if (!monthlyRevenue.some((month) => Number(month.value) > 0)) {
    return <AnalyticsEmptyState />;
  }

  const maxValue = Math.max(
    ...monthlyRevenue.map((month) => month.value)
  );
  const axisLabels = getAxisLabels(maxValue, currencyCode, i18n.language);

  return (
    <div className="seller-analytics-monthly-chart">
      <div className="seller-analytics-monthly-chart__labels">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="seller-analytics-monthly-chart__content">
        <div className="seller-analytics-monthly-chart__grid" />

        <div className="seller-analytics-monthly-chart__bars">
          {monthlyRevenue.map((month) => (
            <div
              key={month.id}
              className="seller-analytics-monthly-chart__item"
            >
              <div className="seller-analytics-monthly-chart__bar-area">
                <span
                  className="seller-analytics-monthly-chart__bar"
                  style={{
                    height: `${(month.value / maxValue) * 100}%`,
                  }}
                  title={`${new Intl.DateTimeFormat(i18n.language, {
                    month: "long",
                  }).format(new Date(month.year || 2000, (month.month || 1) - 1, 1))}: ${formatCurrencyValue(
                    month.value,
                    currencyCode,
                    i18n.language
                  )}`}
                />
              </div>

              <span>
                {new Intl.DateTimeFormat(i18n.language, {
                  month: "short",
                }).format(
                  new Date(month.year || 2000, (month.month || 1) - 1, 1)
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderStars(rating) {
  const roundedRating = Math.round(Number(rating));

  return Array.from({ length: 5 }, (_, index) => (
    <span
      key={index}
      className={
        index < roundedRating
          ? "seller-analytics-star seller-analytics-star--active"
          : "seller-analytics-star"
      }
    >
      ★
    </span>
  ));
}

function SellerAnalyticsContent() {
  const { t, i18n } = useTranslation();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [salesPeriod, setSalesPeriod] = useState("ALL_TIME");
  const [categoryPeriod, setCategoryPeriod] = useState("ALL_TIME");
  const [yearOffset, setYearOffset] = useState(0);
  const [hasStore, setHasStore] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  const loadAnalytics = useCallback(
    async (retry = false) => {
      try {
        setLoadError("");
        setIsRetrying(retry);

        const data = await getSellerAnalytics({
          salesPeriod,
          categoryPeriod,
          yearOffset,
        });

        setAnalyticsData(data);
        setHasStore(data.hasStore !== false);
      } catch (error) {
        setLoadError(error.message || t("common.errorDescription"));
      } finally {
        setIsRetrying(false);
      }
    },
    [categoryPeriod, salesPeriod, t, yearOffset]
  );

  useEffect(() => {
    void loadAnalytics();

    const unsubscribe = subscribeSellerData(() => {
      void loadAnalytics();
    });

    return () => {
      unsubscribe();
    };
  }, [loadAnalytics]);

  if (isRetrying) {
    return <SellerAsyncState status="retrying" />;
  }

  if (loadError) {
    return (
      <SellerAsyncState
        status="error"
        error={loadError}
        onRetry={() => loadAnalytics(true)}
      />
    );
  }

  if (!analyticsData) {
    return <SellerAsyncState status="loading" />;
  }

  if (!hasStore) {
    return (
      <SellerAsyncState
        status="empty"
        title={t("analytics.noSalesData")}
        description={t("analytics.noSalesDataDescription")}
      />
    );
  }

  const {
    currencyCode,
    statistics,
    financialSummary,
    salesOverview,
    salesByCategory,
    monthlyRevenue,
    topSellingProducts,
    topCategories,
    recentReviews,
  } = analyticsData;

  const formatStatisticValue = (statistic) =>
    statistic.valueType === "currency"
      ? formatCurrencyValue(statistic.value, currencyCode, i18n.language)
      : formatIntegerValue(statistic.value, i18n.language);

  const financialItems = [
    ["grossSalesAmount", "analytics.grossSales"],
    ["sellerDiscountAmount", "analytics.sellerDiscounts"],
    ["commissionAmount", "analytics.commission"],
    ["refundAmount", "analytics.refunds"],
    ["costOfGoodsAmount", "analytics.costOfGoods"],
    ["sellerNetAmount", "analytics.netRevenue"],
    ["estimatedProfitAmount", "analytics.estimatedProfit"],
  ];

  const handleExportReport = () => {
    const csvRows = [];

    csvRows.push([t("analytics.reportTitle")]);
    csvRows.push([
      t("analytics.generatedAt"),
      new Date().toLocaleString(i18n.language),
    ]);
    csvRows.push([t("analytics.currency"), currencyCode]);
    csvRows.push([]);

    csvRows.push([t("analytics.summary")]);
    csvRows.push([t("analytics.metric"), t("analytics.value")]);
    statistics.forEach((statistic) => {
      csvRows.push([t(statistic.titleKey), statistic.value]);
    });

    csvRows.push([]);
    csvRows.push([t("analytics.financialSummary")]);
    csvRows.push([t("analytics.metric"), t("analytics.value")]);
    financialItems.forEach(([key, labelKey]) => {
      csvRows.push([t(labelKey), financialSummary[key] ?? 0]);
    });

    csvRows.push([]);
    csvRows.push([t("analytics.topSellingProducts")]);
    csvRows.push([
      t("analytics.product"),
      t("analytics.price"),
      t("analytics.unitsSold"),
      t("analytics.rating"),
      t("analytics.reviews"),
      t("analytics.revenue"),
    ]);
    topSellingProducts.forEach((product) => {
      csvRows.push([
        product.name,
        product.price ?? "",
        product.sales,
        product.rating,
        product.reviews,
        product.revenue,
      ]);
    });

    csvRows.push([]);
    csvRows.push([t("analytics.salesByCategory")]);
    csvRows.push([
      t("analytics.category"),
      t("analytics.revenue"),
      t("analytics.percentage"),
    ]);
    salesByCategory.forEach((category) => {
      csvRows.push([
        category.name,
        category.revenue,
        `${category.percentage}%`,
      ]);
    });

    csvRows.push([]);
    csvRows.push([t("analytics.recentReviews")]);
    csvRows.push([
      t("analytics.customer"),
      t("analytics.product"),
      t("analytics.rating"),
      t("analytics.comment"),
      t("analytics.date"),
    ]);
    recentReviews.forEach((review) => {
      csvRows.push([
        review.customer,
        review.product,
        review.rating,
        review.comment,
        review.date || "",
      ]);
    });

    const escapeCsvValue = (value) => {
      const stringValue = String(value ?? "");
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csvContent = csvRows
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    const formattedDate = new Date().toISOString().slice(0, 10);

    downloadLink.href = downloadUrl;
    downloadLink.download = `shopera-analytics-report-${formattedDate}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="seller-analytics-content">
      <section className="seller-analytics-heading">
        <div>
          <h1>{t("analytics.title")}</h1>
          <p>{t("analytics.subtitle")}</p>
        </div>

        <div className="seller-analytics-heading__actions">
          <button
            type="button"
            className="seller-analytics-export-button"
            onClick={handleExportReport}
          >
            <span aria-hidden="true">⇩</span>
            {t("analytics.exportReport")}
          </button>
        </div>
      </section>

      <section className="seller-analytics-statistics">
        {statistics.map((statistic) => {
          const change = statistic.changePercent;
          const direction =
            change === null || change === undefined
              ? "none"
              : change > 0
                ? "up"
                : change < 0
                  ? "down"
                  : "flat";
          const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "•";

          return (
            <article key={statistic.id} className="seller-analytics-stat-card">
              <div
                className={`seller-analytics-stat-card__icon seller-analytics-stat-card__icon--${statistic.color}`}
              >
                <AnalyticsStatisticIcon type={statistic.icon} />
              </div>

              <div className="seller-analytics-stat-card__content">
                <span>{t(statistic.titleKey)}</span>
                <strong>{formatStatisticValue(statistic)}</strong>

                <div className="seller-analytics-stat-card__bottom">
                  <span
                    className={`seller-analytics-trend seller-analytics-trend--${direction}`}
                  >
                    {change === null || change === undefined
                      ? "—"
                      : `${arrow} ${Math.abs(change).toFixed(1)}%`}
                  </span>
                  <small>
                    {change === null || change === undefined
                      ? t("analytics.noComparison")
                      : t("analytics.vsLastWeek")}
                  </small>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="seller-analytics-card seller-analytics-financial-card">
        <div className="seller-analytics-card__header">
          <div>
            <h2>{t("analytics.financialSummary")}</h2>
            <p className="seller-analytics-card__description">
              {t("analytics.financialSummaryDescription")}
            </p>
          </div>
        </div>

        <div className="seller-analytics-financial-grid">
          {financialItems.map(([key, labelKey]) => (
            <div key={key} className="seller-analytics-financial-item">
              <span>{t(labelKey)}</span>
              <strong>
                {formatCurrencyValue(
                  financialSummary[key],
                  currencyCode,
                  i18n.language
                )}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className="seller-analytics-charts-grid">
        <article className="seller-analytics-card seller-analytics-overview-card">
          <div className="seller-analytics-card__header">
            <h2>{t("analytics.salesOverview")}</h2>
            <select
              value={salesPeriod}
              onChange={(event) => setSalesPeriod(event.target.value)}
              aria-label={t("analytics.salesOverviewPeriod")}
            >
              <option value="ALL_TIME">{t("analytics.allTime")}</option>
              <option value="WEEK">{t("analytics.thisWeek")}</option>
              <option value="MONTH">{t("analytics.thisMonth")}</option>
            </select>
          </div>

          <SalesOverviewChart
            sales={salesOverview}
            period={salesPeriod}
            currencyCode={currencyCode}
          />
        </article>

        <article className="seller-analytics-card seller-analytics-category-card">
          <div className="seller-analytics-card__header">
            <h2>{t("analytics.salesByCategory")}</h2>
            <select
              value={categoryPeriod}
              onChange={(event) => setCategoryPeriod(event.target.value)}
              aria-label={t("analytics.categorySalesPeriod")}
            >
              <option value="ALL_TIME">{t("analytics.allTime")}</option>
              <option value="WEEK">{t("analytics.thisWeek")}</option>
              <option value="MONTH">{t("analytics.thisMonth")}</option>
            </select>
          </div>

          <CategoryDonut
            categories={salesByCategory}
            currencyCode={currencyCode}
          />
        </article>

        <article className="seller-analytics-card seller-analytics-monthly-card">
          <div className="seller-analytics-card__header">
            <h2>{t("analytics.monthlyRevenue")}</h2>
            <select
              value={yearOffset}
              onChange={(event) => setYearOffset(Number(event.target.value))}
              aria-label={t("analytics.monthlyRevenuePeriod")}
            >
              <option value={0}>{t("analytics.latestSalesYear")}</option>
              <option value={-1}>{t("analytics.lastYear")}</option>
            </select>
          </div>

          <MonthlyRevenueChart
            monthlyRevenue={monthlyRevenue}
            currencyCode={currencyCode}
          />
        </article>
      </section>

      <section className="seller-analytics-bottom-grid">
        <article className="seller-analytics-card seller-analytics-products-card">
          <div className="seller-analytics-card__header">
            <h2>{t("analytics.topSellingProducts")}</h2>
          </div>

          {topSellingProducts.length === 0 ? (
            <AnalyticsEmptyState />
          ) : (
            <div className="seller-analytics-products">
              {topSellingProducts.map((product) => (
                <article key={product.id} className="seller-analytics-product">
                  <div className="seller-analytics-product__visual">
                    <AuthenticatedImage
                      src={product.image}
                      alt={product.name}
                      fallback={<span>{product.symbol}</span>}
                    />
                  </div>

                  <div className="seller-analytics-product__information">
                    <h3>{product.name}</h3>
                    <strong>
                      {product.price === null
                        ? "—"
                        : formatCurrencyValue(
                            product.price,
                            currencyCode,
                            i18n.language
                          )}
                    </strong>

                    <div className="seller-analytics-product__rating">
                      <span>★ {Number(product.rating).toFixed(1)}</span>
                      <small>({product.reviews})</small>
                    </div>

                    <p>{t("analytics.salesCount", { count: product.sales })}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="seller-analytics-card seller-analytics-categories-card">
          <div className="seller-analytics-card__header">
            <h2>{t("analytics.topCategories")}</h2>
          </div>

          {topCategories.length === 0 ? (
            <AnalyticsEmptyState />
          ) : (
            <div className="seller-analytics-categories">
              {topCategories.map((category, index) => {
                const colors = ["purple", "orange", "blue", "pink", "green"];
                const color = colors[index % colors.length];

                return (
                  <div key={category.id} className="seller-analytics-category-row">
                    <div
                      className={`seller-analytics-category-row__icon seller-analytics-category-row__icon--${color}`}
                    >
                      ▣
                    </div>

                    <div className="seller-analytics-category-row__content">
                      <div>
                        <strong>{category.name}</strong>
                        <span>{category.percentage}%</span>
                      </div>

                      <div className="seller-analytics-category-row__progress">
                        <span style={{ width: `${category.percentage}%` }} />
                      </div>

                      <small>
                        {formatCurrencyValue(
                          category.revenue,
                          currencyCode,
                          i18n.language
                        )}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="seller-analytics-card seller-analytics-reviews-card">
          <div className="seller-analytics-card__header">
            <h2>{t("analytics.recentReviews")}</h2>
          </div>

          {recentReviews.length === 0 ? (
            <AnalyticsEmptyState />
          ) : (
            <div className="seller-analytics-reviews">
              {recentReviews.map((review) => (
                <article key={review.id} className="seller-analytics-review">
                  <div className="seller-analytics-review__avatar">
                    {review.customer.charAt(0)}
                  </div>

                  <div className="seller-analytics-review__content">
                    <div className="seller-analytics-review__top">
                      <div>
                        <strong>{review.customer}</strong>
                        <span>{review.product}</span>
                      </div>

                      <div className="seller-analytics-review__rating">
                        <div>{renderStars(review.rating)}</div>
                        <span>{Number(review.rating).toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="seller-analytics-review__meta">
                      <p>{review.comment || t("analytics.noReviewComment")}</p>
                      <span>
                        {review.date
                          ? new Intl.DateTimeFormat(i18n.language, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }).format(new Date(review.date))
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="seller-analytics-review__product">
                    <AuthenticatedImage
                      src={review.image}
                      alt={review.product}
                      fallback={<span>{review.symbol}</span>}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function SellerAnalyticsPage() {
  return (
    <SellerPageShell>
      <SellerAnalyticsContent />
    </SellerPageShell>
  );
}

export default SellerAnalyticsPage;
