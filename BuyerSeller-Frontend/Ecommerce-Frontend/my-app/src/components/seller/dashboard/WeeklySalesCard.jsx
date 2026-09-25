import { useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "../../../utils/formatCurrency";
import { getWeeklySalesChartModel } from "../../../utils/sellerDashboard";
import DashboardEmptyIcon from "./DashboardEmptyIcon";

const formatSaleCurrency = (value, currencyCode) => {
  try {
    return formatCurrency(value, currencyCode || "EUR");
  } catch {
    return String(Number(value) || 0);
  }
};

function WeeklySalesCard({ weeklySales = [] }) {
  const { t, i18n } = useTranslation();
  const [activeSaleIndex, setActiveSaleIndex] =
    useState(null);
  const chart = getWeeklySalesChartModel(weeklySales);
  const activeSale =
    activeSaleIndex === null
      ? null
      : chart.sales[activeSaleIndex] || null;
  const activePoint =
    activeSaleIndex === null
      ? null
      : chart.points[activeSaleIndex] || null;
  const formatDay = (sale) => {
    const date = new Date(sale?.date);

    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(i18n.language, {
          weekday: "short",
          day: "numeric",
        }).format(date);
  };

  const handleChartPointerMove = (event) => {
    if (!chart.hasSales || chart.sales.length === 0) {
      return;
    }

    const bounds =
      event.currentTarget.getBoundingClientRect();

    if (!Number.isFinite(bounds.width) || bounds.width <= 0) {
      return;
    }

    const relativeX = Math.min(
      Math.max(
        (event.clientX - bounds.left) / bounds.width,
        0
      ),
      1
    );
    const nearestIndex = Math.round(
      relativeX * (chart.sales.length - 1)
    );

    setActiveSaleIndex(nearestIndex);
  };

  return (
    <article className="seller-dashboard-card seller-weekly-sales">
      <div className="seller-dashboard-card__header">
        <div>
          <h2>{t("dashboard.weeklySales")}</h2>
          <small>{t("dashboard.currentData")}</small>
        </div>

        <select
          className="seller-dashboard-card__select"
          value="week"
          disabled
          title={t("dashboard.salesPeriodUnavailable")}
          aria-label={t("dashboard.salesPeriod")}
          onChange={() => {}}
        >
          <option value="week">
            {t("dashboard.lastSevenDays")}
          </option>
        </select>
      </div>

      {!chart.hasSales ? (
        <div className="seller-dashboard-widget-empty seller-dashboard-widget-empty--chart">
          <span className="seller-dashboard-widget-empty__icon">
            <DashboardEmptyIcon type="chart" />
          </span>
          <strong>
            {t("dashboard.noCompletedSalesThisWeek")}
          </strong>
          <p>{t("dashboard.weeklySalesEmptyDescription")}</p>
        </div>
      ) : (
        <div className="seller-line-chart">
          <div
            className="seller-line-chart__area"
            onPointerMove={handleChartPointerMove}
            onPointerLeave={() => setActiveSaleIndex(null)}
          >
            <div className="seller-line-chart__grid" />

            <svg
              className="seller-line-chart__svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-label={t("dashboard.weeklySalesChart")}
            >
              <defs>
                <linearGradient
                  id="sellerChartFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#4a37e6"
                    stopOpacity="0.28"
                  />
                  <stop
                    offset="100%"
                    stopColor="#4a37e6"
                    stopOpacity="0.02"
                  />
                </linearGradient>
              </defs>

              <polygon
                points={`0,100 ${chart.linePoints} 100,100`}
                fill="url(#sellerChartFill)"
              />
              <polyline
                points={chart.linePoints}
                fill="none"
                stroke="#3b2ee5"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {chart.points.map((point, index) => (
                <circle
                  key={chart.sales[index].id}
                  cx={point.x}
                  cy={point.y}
                  r={
                    activeSaleIndex === index
                      ? "2.2"
                      : "1.3"
                  }
                  fill={
                    activeSaleIndex === index
                      ? "#ffffff"
                      : "#3b2ee5"
                  }
                  stroke="#3b2ee5"
                  strokeWidth={
                    activeSaleIndex === index
                      ? "1.2"
                      : "0"
                  }
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {activePoint ? (
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
              ) : null}
            </svg>

            {activeSale && activePoint ? (
              <div
                className={`seller-line-chart__tooltip ${
                  activePoint.x < 14
                    ? "seller-line-chart__tooltip--start"
                    : activePoint.x > 86
                      ? "seller-line-chart__tooltip--end"
                      : ""
                } ${
                  activePoint.y < 28
                    ? "seller-line-chart__tooltip--below"
                    : ""
                }`}
                style={{
                  left: `${activePoint.x}%`,
                  top: `${Math.max(activePoint.y, 18)}%`,
                }}
              >
                <span>{formatDay(activeSale)}</span>
                <strong>
                  {formatSaleCurrency(
                    activeSale.value,
                    activeSale.currencyCode
                  )}
                </strong>
              </div>
            ) : null}

            <div className="seller-line-chart__days">
              {chart.sales.map((sale, index) => (
                <span
                  key={sale.id}
                  className={
                    activeSaleIndex === index
                      ? "seller-line-chart__day--active"
                      : ""
                  }
                >
                  {formatDay(sale)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default WeeklySalesCard;
