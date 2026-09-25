import {
  useMemo,
  useState,
  useEffect,
} from "react";

import {
  ArrowUpRight,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAdminSalesAnalytics, getSalesDateRange } from "../../api/adminSalesAnalyticsService.js";

const formatCurrency = (value, currencyCode) => new Intl.NumberFormat(
  "en-US", { style: "currency", currency: currencyCode || "EUR" },
).format(Number(value || 0));

const numberFormatter =
  new Intl.NumberFormat("en-US");

const rangeLabels = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

const getDateTimestamp = (
  dateValue
) => {
  if (!dateValue) {
    return null;
  }

  const normalizedDateValue =
    String(dateValue).includes("T")
      ? String(dateValue)
      : `${dateValue}T00:00:00`;

  const date =
    new Date(normalizedDateValue);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date.getTime();
};

const formatChartDate = (
  record
) => {
  if (record.date) {
    return record.date;
  }

  const timestamp =
    getDateTimestamp(
      record.rawDate
    );

  if (!timestamp) {
    return "";
  }

  return new Date(
    timestamp
  ).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
};

function AdminSalesAnalytics({
  salesData = [],
  currencies = [],
}) {
  const navigate =
    useNavigate();

  const [
    selectedRange,
    setSelectedRange,
  ] = useState("month");
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] || "");
  const [serverSalesData, setServerSalesData] = useState(salesData);
  const [analyticsState, setAnalyticsState] = useState({ loading: false, error: "" });

  useEffect(() => {
    if (!selectedCurrency && currencies.length > 0) setSelectedCurrency(currencies[0]);
  }, [currencies, selectedCurrency]);

  useEffect(() => {
    if (!selectedCurrency) { setServerSalesData([]); return; }
    let active = true;
    const load = async () => {
      try {
        setAnalyticsState({ loading: true, error: "" });
        const range = getSalesDateRange(selectedRange);
        const response = await getAdminSalesAnalytics({ currencyCode: selectedCurrency, ...range });
        if (active) setServerSalesData((response.points || []).map((point) => ({
          rawDate: point.date, date: point.date, revenue: point.recognizedRevenue,
          paidSales: point.paidSales, orders: point.paidOrderCount,
          orderCount: point.paidOrderCount, currencyCode: response.currencyCode,
        })));
      } catch (error) {
        if (active) setAnalyticsState({ loading: false, error: error.message || "Sales analytics could not be loaded." });
        return;
      }
      if (active) setAnalyticsState({ loading: false, error: "" });
    };
    load();
    return () => { active = false; };
  }, [selectedCurrency, selectedRange]);

  const filteredSalesData =
    useMemo(() => {
      const datedRecords =
        serverSalesData
          .map((record) => {
            const timestamp =
              getDateTimestamp(
                record.rawDate ||
                  record.date
              );

            return {
              ...record,

              date:
                formatChartDate(
                  record
                ),

              revenue:
                Number(
                  record.revenue ||
                    0
                ),

              orders:
                Number(
                  record.orders ||
                    record.orderCount ||
                    0
                ),

              timestamp,
            };
          })
          .filter(
            (record) =>
              record.timestamp !==
              null
          )
          .sort(
            (
              firstRecord,
              secondRecord
            ) =>
              firstRecord.timestamp -
              secondRecord.timestamp
          );

      if (
        datedRecords.length ===
        0
      ) {
        return [];
      }

      const latestRecord =
        datedRecords[
          datedRecords.length - 1
        ];

      const latestDate =
        new Date(
          latestRecord.timestamp
        );

      const startDate =
        new Date(latestDate);

      if (
        selectedRange ===
        "week"
      ) {
        startDate.setDate(
          latestDate.getDate() -
            6
        );
      }

      if (
        selectedRange ===
        "month"
      ) {
        startDate.setDate(1);
      }

      if (
        selectedRange ===
        "year"
      ) {
        startDate.setMonth(
          0,
          1
        );
      }

      startDate.setHours(
        0,
        0,
        0,
        0
      );

      return datedRecords
        .filter(
          (record) =>
            record.timestamp >=
              startDate.getTime() &&
            record.timestamp <=
              latestDate.getTime()
        )
        .map(
          ({
            timestamp: _timestamp,
            ...chartRecord
          }) => chartRecord
        );
    }, [
      serverSalesData,
      selectedRange,
    ]);

  const summary = useMemo(() => {
    const totalRevenue =
      filteredSalesData.reduce(
        (
          total,
          record
        ) =>
          total +
          Number(
            record.revenue ||
              0
          ),
        0
      );

    const totalPaidOrders =
      filteredSalesData.reduce(
        (
          total,
          record
        ) =>
          total +
          Number(
            record.orders ||
              0
          ),
        0
      );

    const averageOrderValue =
      totalPaidOrders > 0
        ? totalRevenue /
          totalPaidOrders
        : 0;

    return {
      totalRevenue,
      totalPaidOrders,
      averageOrderValue,
    };
  }, [filteredSalesData]);

  const openDetailedAnalytics =
    () => {
      navigate(
        "/admin/analytics"
      );
    };

  return (
    <article className="admin-panel admin-sales-panel">
      <div className="admin-panel-header">
        <div>
          <h3>
            Paid Sales Analytics
          </h3>

          <div className="admin-chart-legends">
            <span className="admin-revenue-legend">
              Recognized Revenue
            </span>

            <span className="admin-orders-legend">
              Paid Orders
            </span>
          </div>
        </div>

        <div className="admin-sales-header-actions">
          <select value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)}
            aria-label="Paid sales analytics currency" disabled={currencies.length === 0}>
            {currencies.length === 0 ? <option value="">No recognized currencies</option> :
              currencies.map((currency) => <option value={currency} key={currency}>{currency}</option>)}
          </select>
          <select
            value={selectedRange}
            onChange={(event) =>
              setSelectedRange(
                event.target.value
              )
            }
            aria-label="Paid sales analytics date range"
          >
            <option value="month">
              This Month
            </option>

            <option value="week">
              This Week
            </option>

            <option value="year">
              This Year
            </option>
          </select>

          <button
            type="button"
            onClick={
              openDetailedAnalytics
            }
          >
            View Details
            <ArrowUpRight
              size={15}
            />
          </button>
        </div>
      </div>

      <div className="admin-sales-chart">
        {analyticsState.error && <p className="admin-widget-notice error" role="alert">{analyticsState.error}</p>}
        {analyticsState.loading && <p className="admin-widget-state">Loading sales analytics...</p>}
        {!analyticsState.loading && !analyticsState.error && currencies.length === 0 &&
          <p className="admin-widget-state">No recognized currencies are available.</p>}
        {!analyticsState.loading && !analyticsState.error && currencies.length > 0 && filteredSalesData.length >
        0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            debounce={50}
          >
            <LineChart
              data={
                filteredSalesData
              }
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="revenue"
                tick={{
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(
                  value
                ) =>
                  `$${numberFormatter.format(
                    Number(
                      value ||
                        0
                    )
                  )}`
                }
              />

              <YAxis
                yAxisId="orders"
                orientation="right"
                tick={{
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={
                  false
                }
              />

              <Tooltip
                formatter={(
                  value,
                  name
                ) => {
                  if (
                    name ===
                    "Recognized Revenue"
                  ) {
                    return [
                      formatCurrency(value, selectedCurrency),
                      "Recognized Revenue",
                    ];
                  }

                  return [
                    numberFormatter.format(
                      Number(
                        value ||
                          0
                      )
                    ),
                    "Paid Orders",
                  ];
                }}
              />

              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Recognized Revenue"
                stroke="#214fe7"
                strokeWidth={3}
                dot={false}
              />

              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                name="Paid Orders"
                stroke="#9585f5"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="admin-sales-chart-empty">
            No paid sales data is
            available for the
            selected period.
          </div>
        )}
      </div>

      <div className="admin-chart-summary">
        <div>
          <span>
            Recognized Revenue
          </span>

          <strong>
            {formatCurrency(summary.totalRevenue, selectedCurrency)}
          </strong>

          <small>
            {
              rangeLabels[
                selectedRange
              ]
            }
          </small>
        </div>

        <div>
          <span>Paid Orders</span>

          <strong>
            {numberFormatter.format(
              summary.totalPaidOrders
            )}
          </strong>

          <small>
            {
              rangeLabels[
                selectedRange
              ]
            }
          </small>
        </div>

        <div>
          <span>
            Average Order Value
          </span>

          <strong>
            {formatCurrency(summary.averageOrderValue, selectedCurrency)}
          </strong>

          <small>
            Revenue per paid order
          </small>
        </div>
      </div>
    </article>
  );
}

export default AdminSalesAnalytics;
