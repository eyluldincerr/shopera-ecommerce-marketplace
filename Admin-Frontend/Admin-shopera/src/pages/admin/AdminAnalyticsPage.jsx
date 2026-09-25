import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, RefreshCw, RotateCcw } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import PaidSalesKpiGrid from "../../components/admin/PaidSalesKpiGrid";
import { getAdminAnalyticsData } from "../../api/adminAnalyticsService";

const formatDate = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ currencyCode: "", from: "", to: "" });
  const [draft, setDraft] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextFilters = filters) => {
    if (nextFilters.from && nextFilters.to && nextFilters.from > nextFilters.to) {
      setError("The start date cannot be later than the end date.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await getAdminAnalyticsData(nextFilters);
      setData(response);
      const currencyCode = nextFilters.currencyCode || response.availableCurrencies?.[0] || response.currencyCode || "";
      const applied = { ...nextFilters, currencyCode };
      setFilters(applied);
      setDraft(applied);
    } catch (requestError) {
      setError(requestError.message || "Paid-sales analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load({ currencyCode: "", from: "", to: "" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const points = useMemo(() => (data?.dailyPerformance || []).map((point) => ({
    ...point,
    chartDate: formatDate(point.date),
    paidSales: Number(point.paidSales || 0),
    revenue: Number(point.revenue || 0),
    orderCount: Number(point.orderCount || 0),
  })), [data]);

  const reset = () => load({ currencyCode: data?.availableCurrencies?.[0] || "", from: "", to: "" });

  return <AdminPageLayout>
    <AdminPageHeader title="Analytics" description="Analyze real paid-sales and recognized revenue performance by currency and date.">
      <button type="button" className="admin-report-refresh-button" onClick={() => load(filters)} disabled={loading}><RefreshCw size={16} className={loading ? "admin-report-refresh-icon" : ""} />Refresh</button>
    </AdminPageHeader>

    <section className="admin-paid-sales-filter-card">
      <div className="admin-report-filter-title"><CalendarRange size={19} /><div><strong>Paid-sales filters</strong><span>Choose a supported currency and order-date range.</span></div></div>
      <div className="admin-paid-sales-filter-controls">
        <label><span>Currency</span><select value={draft.currencyCode} onChange={(event) => setDraft({ ...draft, currencyCode: event.target.value })} disabled={(data?.availableCurrencies || []).length === 0}><option value="">No currency</option>{(data?.availableCurrencies || []).map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
        <label><span>From</span><input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label>
        <label><span>To</span><input type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label>
        <button type="button" className="admin-report-apply-button" onClick={() => load(draft)} disabled={loading}>Apply</button>
        <button type="button" className="admin-report-reset-button" onClick={reset} disabled={loading}><RotateCcw size={15} />Reset</button>
      </div>
    </section>

    {error && <div className="admin-page-notice admin-page-notice-error" role="alert">{error}<button type="button" onClick={() => load(filters)}>Retry</button></div>}
    {loading && !data ? <div className="admin-page-loading">Loading paid-sales analytics...</div> : <>
      <PaidSalesKpiGrid summary={data?.summary} currencyCode={data?.currencyCode} />
      <section className="admin-paid-sales-chart-card">
        <div className="admin-paid-sales-section-heading"><div><h2>Paid Sales Performance</h2><p>Daily gross paid sales and recognized revenue.</p></div><span>{data?.currencyCode || "No currency selected"}</span></div>
        {points.length === 0 ? <div className="admin-paid-sales-empty"><strong>No paid sales exist for the selected period.</strong><span>Try changing the date range or currency.</span></div> : <div className="admin-paid-sales-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 12, right: 18, left: 8, bottom: 4 }}><CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="chartDate" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="paidSales" name="Paid Sales Gross" stroke="#3152d8" strokeWidth={3} dot={false} /><Line type="monotone" dataKey="revenue" name="Recognized Revenue" stroke="#8b5cf6" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div>}
      </section>
      {points.length > 0 && <section className="admin-paid-sales-chart-card"><div className="admin-paid-sales-section-heading"><div><h2>Paid Orders Trend</h2><p>Daily count provided by the paid-sales endpoint.</p></div></div><div className="admin-paid-sales-chart admin-paid-sales-chart-small"><ResponsiveContainer width="100%" height="100%"><BarChart data={points}><CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="chartDate" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="orderCount" name="Paid Orders" fill="#3152d8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>}
    </>}
  </AdminPageLayout>;
}

export default AdminAnalyticsPage;
