import { BadgeDollarSign, CircleDollarSign, ReceiptText, ShoppingBag } from "lucide-react";

const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const formatMoney = (value, currencyCode) => {
  if (!currencyCode) return safeNumber(value).toFixed(2);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(safeNumber(value));
  } catch {
    return `${safeNumber(value).toFixed(2)} ${currencyCode}`;
  }
};

function PaidSalesKpiGrid({ summary = {}, currencyCode }) {
  const cards = [
    { label: "Recognized Revenue", value: formatMoney(summary.totalRevenue, currencyCode), note: "Revenue recognized from paid sales", icon: <BadgeDollarSign size={20} /> },
    { label: "Paid Sales Gross", value: formatMoney(summary.paidSalesGrossValue, currencyCode), note: "Gross value of successful paid sales", icon: <CircleDollarSign size={20} /> },
    { label: "Paid Orders", value: `${Math.max(0, Math.trunc(safeNumber(summary.paidOrders ?? summary.totalOrders)))} orders`, note: "Orders with supported paid-sales data", icon: <ShoppingBag size={20} /> },
    { label: "Average Paid Order", value: formatMoney(summary.averageOrderValue, currencyCode), note: "Average gross value per paid order", icon: <ReceiptText size={20} /> },
  ];

  return <section className="admin-paid-sales-kpi-grid" aria-label="Paid sales summary">
    {cards.map((card) => <article className="admin-paid-sales-kpi-card" key={card.label}>
      <div className="admin-paid-sales-kpi-icon">{card.icon}</div>
      <div><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></div>
    </article>)}
  </section>;
}

export default PaidSalesKpiGrid;
