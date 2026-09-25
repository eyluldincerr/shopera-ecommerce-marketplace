import { api } from "./apiClient.js";
import { requireAuthenticatedAdmin } from "../auth/authSession.js";

export const getSalesDateRange = (preset, now = new Date()) => {
  const to = new Date(now);
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  if (preset === "week") {
    const day = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - day);
  } else if (preset === "month") {
    from.setDate(1);
  } else if (preset === "year") {
    from.setMonth(0, 1);
  } else {
    throw new Error("Unsupported sales date range.");
  }
  const format = (value) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0")].join("-");
  return { from: format(from), to: format(to) };
};

export const getAdminSalesAnalytics = async ({ currencyCode, from, to }) => {
  requireAuthenticatedAdmin();
  return api.get("/api/Admin/analytics/sales", { query: { currencyCode, from, to } });
};
