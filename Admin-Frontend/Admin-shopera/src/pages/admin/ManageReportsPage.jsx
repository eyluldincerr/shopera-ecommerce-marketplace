import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, CalendarRange, RefreshCw, RotateCcw } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import PaidSalesKpiGrid from "../../components/admin/PaidSalesKpiGrid";
import { getAdminReportData } from "../../api/adminReportService";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const money = (value) => Number(value || 0).toFixed(2);
const displayDate = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function ManageReportsPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ currencyCode: "", dateFrom: "", dateTo: "" });
  const [draft, setDraft] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextFilters = filters) => {
    if (nextFilters.dateFrom && nextFilters.dateTo && nextFilters.dateFrom > nextFilters.dateTo) {
      setError("The start date cannot be later than the end date.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await getAdminReportData(nextFilters);
      setData(response);
      const applied = { ...nextFilters, currencyCode: nextFilters.currencyCode || response.availableCurrencies?.[0] || response.currencyCode || "" };
      setFilters(applied);
      setDraft(applied);
    } catch (requestError) {
      setError(requestError.message || "Paid-sales report could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load({ currencyCode: "", dateFrom: "", dateTo: "" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const points = useMemo(() => (data?.dailySales || []).map((point) => ({ ...point, chartDate: displayDate(point.date) })), [data]);
  const reset = () => load({ currencyCode: data?.availableCurrencies?.[0] || "", dateFrom: "", dateTo: "" });

  const exportPaidSalesCsv = () => {
    if (!data) return;
    const rows = [
      ["SHOPERA PAID SALES REPORT"],
      ["Currency", data.currencyCode || ""],
      ["From", filters.dateFrom || "All dates"],
      ["To", filters.dateTo || "All dates"],
      [],
      ["Date", "Paid Sales Gross", "Recognized Revenue", "Paid Orders"],
      ...points.map((point) => [point.date, money(point.paidSales), money(point.revenue), Number(point.orderCount || 0)]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shopera-paid-sales-${data.currencyCode || "report"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <AdminPageLayout>
    <AdminPageHeader title="Reports" description="Review and export real paid-sales and recognized revenue data.">
      <div className="admin-report-header-actions"><button type="button" className="admin-report-refresh-button admin-report-export-button" onClick={exportPaidSalesCsv} disabled={!data || loading}><Download size={16} />Export Paid Sales CSV</button><button type="button" className="admin-report-refresh-button" onClick={() => load(filters)} disabled={loading}><RefreshCw size={16} className={loading ? "admin-report-refresh-icon" : ""} />Refresh</button></div>
    </AdminPageHeader>

    <section className="admin-paid-sales-filter-card"><div className="admin-report-filter-title"><CalendarRange size={19} /><div><strong>Paid-sales report filters</strong><span>Limit the report by supported currency and order date.</span></div></div><div className="admin-paid-sales-filter-controls">
      <label><span>Currency</span><select value={draft.currencyCode} onChange={(event) => setDraft({ ...draft, currencyCode: event.target.value })} disabled={(data?.availableCurrencies || []).length === 0}><option value="">No currency</option>{(data?.availableCurrencies || []).map((currency) => <option value={currency} key={currency}>{currency}</option>)}</select></label>
      <label><span>Start date</span><input type="date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })} /></label>
      <label><span>End date</span><input type="date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })} /></label>
      <button type="button" className="admin-report-apply-button" onClick={() => load(draft)} disabled={loading}>Apply</button><button type="button" className="admin-report-reset-button" onClick={reset} disabled={loading}><RotateCcw size={15} />Reset</button>
    </div></section>

    {error && <div className="admin-page-notice admin-page-notice-error" role="alert">{error}<button type="button" onClick={() => load(filters)}>Retry</button></div>}
    {loading && !data ? <div className="admin-page-loading">Loading paid-sales report...</div> : <>
      <PaidSalesKpiGrid summary={data?.summary} currencyCode={data?.currencyCode} />
      <section className="admin-paid-sales-table-card admin-paid-sales-report-table"><div className="admin-paid-sales-section-heading"><div><h2>Daily Paid Sales Data</h2><p>Structured paid-sales records ready for review and export.</p></div><span>{data?.currencyCode || "No currency selected"}</span></div>
        <dl className="admin-paid-sales-report-meta"><div><dt>Report period</dt><dd>{filters.dateFrom || "All dates"} – {filters.dateTo || "Present"}</dd></div><div><dt>Selected currency</dt><dd>{data?.currencyCode || "None"}</dd></div><div><dt>Rows in report</dt><dd>{points.length}</dd></div></dl>
        <div className="admin-paid-sales-table-wrap"><table><thead><tr><th>Date</th><th>Paid Sales Gross</th><th>Recognized Revenue</th><th>Paid Orders</th></tr></thead><tbody>{points.map((point) => <tr key={point.date}><td>{point.date}</td><td>{money(point.paidSales)} {data?.currencyCode}</td><td>{money(point.revenue)} {data?.currencyCode}</td><td>{Number(point.orderCount || 0)}</td></tr>)}{points.length === 0 && <tr><td colSpan={4}><div className="admin-paid-sales-report-empty"><strong>No paid sales exist for the selected period.</strong><span>Try changing the date range or currency.</span></div></td></tr>}</tbody></table></div>
      </section>
    </>}
  </AdminPageLayout>;
}

export default ManageReportsPage;
