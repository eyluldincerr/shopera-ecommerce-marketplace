export const DASHBOARD_BREAKPOINTS = {
  lg: 1100,
  md: 800,
  sm: 520,
  xs: 300,
  xxs: 0,
};

export const DASHBOARD_COLUMNS = { lg: 10, md: 6, sm: 2, xs: 1, xxs: 1 };
export const DASHBOARD_BREAKPOINT_NAMES = ["lg", "md", "sm", "xs", "xxs"];

const dimensions = (widths, heights) => ({ widths, heights });

export const OPERATIONAL_MANAGEMENT_HEIGHTS = {
  lg: 12,
  md: 13,
  sm: 14,
  xs: 12,
  xxs: 13,
};

export const OPERATIONAL_MANAGEMENT_WIDGET_IDS = [
  "pending-brand-applications",
  "quick-category-manager",
  "product-oversight",
  "account-alerts",
  "sales-analytics",
  "coupon-manager",
];

export const DASHBOARD_WIDGETS = [
  { id: "total-users", title: "Total Users", size: "stat", statisticId: 1, ...dimensions({ lg: 2, md: 2, sm: 2, xs: 1, xxs: 1 }, { lg: 7, md: 7, sm: 7, xs: 7, xxs: 7 }) },
  { id: "approved-stores", title: "Approved Stores", size: "stat", statisticId: 2, ...dimensions({ lg: 2, md: 2, sm: 2, xs: 1, xxs: 1 }, { lg: 7, md: 7, sm: 7, xs: 7, xxs: 7 }) },
  { id: "pending-store-applications-stat", title: "Pending Store Applications", size: "stat", statisticId: 3, ...dimensions({ lg: 2, md: 2, sm: 2, xs: 1, xxs: 1 }, { lg: 7, md: 7, sm: 7, xs: 7, xxs: 7 }) },
  { id: "total-orders", title: "Total Orders", size: "stat", statisticId: 4, ...dimensions({ lg: 2, md: 2, sm: 2, xs: 1, xxs: 1 }, { lg: 7, md: 7, sm: 7, xs: 7, xxs: 7 }) },
  { id: "recognized-revenue", title: "Recognized Revenue", size: "stat", statisticId: 5, ...dimensions({ lg: 2, md: 2, sm: 2, xs: 1, xxs: 1 }, { lg: 7, md: 7, sm: 7, xs: 7, xxs: 7 }) },
  { id: "quick-actions", title: "Quick Actions", size: "operational-wide", ...dimensions({ lg: 10, md: 6, sm: 2, xs: 1, xxs: 1 }, { lg: 6, md: 7, sm: 9, xs: 10, xxs: 14 }) },
  { id: "pending-brand-applications", title: "Pending Brand Applications", size: "side-panel", ...dimensions({ lg: 5, md: 3, sm: 2, xs: 1, xxs: 1 }, OPERATIONAL_MANAGEMENT_HEIGHTS) },
  { id: "quick-category-manager", title: "Quick Category Manager", size: "operational", ...dimensions({ lg: 5, md: 3, sm: 2, xs: 1, xxs: 1 }, OPERATIONAL_MANAGEMENT_HEIGHTS) },
  { id: "product-oversight", title: "Product Oversight", size: "operational", ...dimensions({ lg: 5, md: 3, sm: 2, xs: 1, xxs: 1 }, OPERATIONAL_MANAGEMENT_HEIGHTS) },
  { id: "account-alerts", title: "User & Store Account Alerts", size: "operational", ...dimensions({ lg: 5, md: 3, sm: 2, xs: 1, xxs: 1 }, OPERATIONAL_MANAGEMENT_HEIGHTS) },
  { id: "sales-analytics", title: "Paid Sales Analytics", size: "analytics", ...dimensions({ lg: 5, md: 3, sm: 2, xs: 1, xxs: 1 }, OPERATIONAL_MANAGEMENT_HEIGHTS) },
  { id: "coupon-manager", title: "Coupon Manager", size: "operational", ...dimensions({ lg: 5, md: 3, sm: 2, xs: 1, xxs: 1 }, OPERATIONAL_MANAGEMENT_HEIGHTS) },
  { id: "latest-orders", title: "Orders Needing Attention", size: "orders", ...dimensions({ lg: 10, md: 6, sm: 2, xs: 1, xxs: 1 }, { lg: 9, md: 10, sm: 10, xs: 9, xxs: 10 }) },
];

export const DASHBOARD_WIDGET_MAP = new Map(DASHBOARD_WIDGETS.map((widget) => [widget.id, widget]));

const lgPositions = {
  "total-users": [0, 0], "approved-stores": [2, 0], "pending-store-applications-stat": [4, 0], "total-orders": [6, 0], "recognized-revenue": [8, 0],
  "quick-actions": [0, 7], "pending-brand-applications": [0, 13], "quick-category-manager": [5, 13],
  "product-oversight": [0, 25], "account-alerts": [5, 25],
  "sales-analytics": [0, 37], "coupon-manager": [5, 37], "latest-orders": [0, 49],
};

const createSequentialLayout = (breakpoint) => {
  let y = 0;
  return DASHBOARD_WIDGETS.map((widget) => {
    const item = { i: widget.id, x: 0, y, w: widget.widths[breakpoint], h: widget.heights[breakpoint] };
    y += item.h;
    return item;
  });
};

export const DEFAULT_DASHBOARD_LAYOUTS = {
  lg: DASHBOARD_WIDGETS.map((widget) => {
    const [x, y] = lgPositions[widget.id];
    return { i: widget.id, x, y, w: widget.widths.lg, h: widget.heights.lg };
  }),
  md: [
    ["total-users", 0, 0], ["approved-stores", 2, 0], ["pending-store-applications-stat", 4, 0],
    ["total-orders", 0, 7], ["recognized-revenue", 2, 7], ["quick-actions", 0, 14],
    ["pending-brand-applications", 0, 21], ["quick-category-manager", 3, 21],
    ["product-oversight", 0, 34], ["account-alerts", 3, 34],
    ["sales-analytics", 0, 47], ["coupon-manager", 3, 47], ["latest-orders", 0, 60],
  ].map(([id, x, y]) => { const widget = DASHBOARD_WIDGET_MAP.get(id); return { i: id, x, y, w: widget.widths.md, h: widget.heights.md }; }),
  sm: createSequentialLayout("sm"),
  xs: createSequentialLayout("xs"),
  xxs: createSequentialLayout("xxs"),
};
