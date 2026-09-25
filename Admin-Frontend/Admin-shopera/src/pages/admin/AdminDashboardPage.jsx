import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SlidersHorizontal } from "lucide-react";
import { Responsive } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import AdminPageLayout from "../../components/admin/AdminPageLayout";
import AdminLatestOrders from "../../components/admin/AdminLatestOrders";
import AdminAccountAlerts from "../../components/admin/AdminAccountAlerts";
import AdminCouponManager from "../../components/admin/AdminCouponManager";
import AdminModalPortal from "../../components/admin/AdminModalPortal";
import AdminProductOversightQueue from "../../components/admin/AdminProductOversightQueue";
import AdminQuickActions from "../../components/admin/AdminQuickActions";
import AdminQuickCategoryManager from "../../components/admin/AdminQuickCategoryManager";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DashboardWidgetShell from "../../components/admin/DashboardWidgetShell";
import PendingSellerVerification from "../../components/admin/PendingSellerVerification";

const AdminSalesAnalytics = lazy(() =>
  import("../../components/admin/AdminSalesAnalytics")
);
const DashboardCustomizer = lazy(() =>
  import("../../components/admin/DashboardCustomizer")
);
const CouponFormModal = lazy(() =>
  import("../../components/admin/CouponFormModal")
);

import { getAdminDashboardData } from "../../api/adminDashboardService";
import { createAdminCoupon } from "../../api/adminCouponService";
import {
  getAdminDashboardLayout,
  moveWidgetInOrder,
  normalizeAdminDashboardLayout,
  resetAdminDashboardLayout,
  saveAdminDashboardLayout,
} from "../../api/adminDashboardLayoutService";

import {
  approveAdminStoreApplication,
} from "../../api/adminStoreService";
import { getAuthenticatedUserId } from "../../auth/authSession";
import {
  DASHBOARD_BREAKPOINTS,
  DASHBOARD_COLUMNS,
  DASHBOARD_WIDGETS,
  DEFAULT_DASHBOARD_LAYOUTS,
} from "../../config/adminDashboardWidgets";

const initialDashboardData = {
  statistics: [],
  sellerRequests: [],
  latestOrders: [],
  recentActivities: [],
  recognizedRevenueByCurrency: [],
  salesData: [],
};


const useDashboardContainerWidth = () => {
  const [container, setContainer] = useState(null);
  const [width, setWidth] = useState(1);
  const containerRef = useCallback((node) => {
    setContainer(node);
  }, []);

  useLayoutEffect(() => {
    if (!container) return undefined;

    const updateWidth = (nextWidth) => {
      const measuredWidth = Math.floor(nextWidth);
      if (measuredWidth > 0) {
        setWidth((currentWidth) =>
          currentWidth === measuredWidth ? currentWidth : measuredWidth
        );
      }
    };

    updateWidth(container.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      const handleWindowResize = () =>
        updateWidth(container.getBoundingClientRect().width);
      window.addEventListener("resize", handleWindowResize);
      return () => window.removeEventListener("resize", handleWindowResize);
    }

    const observer = new ResizeObserver((entries) => {
      updateWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [container]);

  return { width, containerRef };
};


function AdminDashboardPage() {
  const currentAdminUserId = getAuthenticatedUserId();
  const customizeButtonRef = useRef(null);
  const { width, containerRef } = useDashboardContainerWidth();
  const [dashboardData, setDashboardData] =
    useState(initialDashboardData);
  const [layoutPreference, setLayoutPreference] = useState(() =>
    getAdminDashboardLayout(
      currentAdminUserId,
      DEFAULT_DASHBOARD_LAYOUTS,
      DASHBOARD_COLUMNS,
    )
  );
  const layoutPreferenceRef = useRef(layoutPreference);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [layoutError, setLayoutError] = useState("");
  const [activeBreakpoint, setActiveBreakpoint] = useState("lg");
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponProcessing, setCouponProcessing] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
    The child component still uses the prop name
    approvingSellerId for compatibility.

    The actual record being approved is STORE.
  */
  const [
    approvingStoreIdentifier,
    setApprovingStoreIdentifier,
  ] = useState(null);

  const loadDashboardData = useCallback(
    async ({ showLoading = true } = {}) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }

        setErrorMessage("");

        const data =
          await getAdminDashboardData();

        setDashboardData({
          statistics:
            Array.isArray(data?.statistics)
              ? data.statistics
              : [],

          sellerRequests:
            Array.isArray(data?.sellerRequests)
              ? data.sellerRequests
              : [],

          latestOrders:
            Array.isArray(data?.latestOrders)
              ? data.latestOrders
              : [],

          recentActivities:
            Array.isArray(data?.recentActivities)
              ? data.recentActivities
              : [],
          recognizedRevenueByCurrency: Array.isArray(data?.recognizedRevenueByCurrency)
            ? data.recognizedRevenueByCurrency : [],

          salesData:
            Array.isArray(data?.salesData)
              ? data.salesData
              : [],
        });
      } catch (error) {
        console.error(
          "Admin dashboard data could not be loaded:",
          error
        );

        setErrorMessage(
          error.message ||
            "Dashboard data could not be loaded."
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const refreshDashboard = () => loadDashboardData({ showLoading: false });
    window.addEventListener("admin-data-updated", refreshDashboard);
    return () => window.removeEventListener("admin-data-updated", refreshDashboard);
  }, [loadDashboardData]);

  const persistLayoutPreference = useCallback(
    (nextPreference) => {
      try {
        saveAdminDashboardLayout(
          currentAdminUserId,
          nextPreference,
          DEFAULT_DASHBOARD_LAYOUTS,
          DASHBOARD_COLUMNS,
        );
        setLayoutError("");
      } catch (error) {
        console.error("Admin dashboard layout could not be saved:", error);
        setLayoutError(
          "Your layout is applied, but could not be saved. Retry",
        );
      }
    },
    [currentAdminUserId],
  );

  const applyLayoutPreference = useCallback(
    (nextPreference, { persist = true } = {}) => {
      layoutPreferenceRef.current = nextPreference;
      setLayoutPreference(nextPreference);

      if (persist) {
        persistLayoutPreference(nextPreference);
      }
    },
    [persistLayoutPreference],
  );

  const getOrderedWidgetIds = useCallback(
    (breakpoint = activeBreakpoint) =>
      [...(layoutPreference.layouts[breakpoint] || [])]
        .sort((first, second) => first.y - second.y || first.x - second.x)
        .map((item) => item.i),
    [activeBreakpoint, layoutPreference.layouts],
  );

  const visibleWidgets = useMemo(
    () =>
      getOrderedWidgetIds()
        .map((widgetId) =>
          DASHBOARD_WIDGETS.find((widget) => widget.id === widgetId)
        )
        .filter(Boolean),
    [getOrderedWidgetIds],
  );

  const hiddenWidgets = useMemo(
    () =>
      layoutPreference.hiddenWidgetIds
        .map((widgetId) =>
          DASHBOARD_WIDGETS.find((widget) => widget.id === widgetId)
        )
        .filter(Boolean),
    [layoutPreference.hiddenWidgetIds],
  );

  const closeCustomizer = useCallback(() => {
    setIsCustomizerOpen(false);
    window.requestAnimationFrame(() => customizeButtonRef.current?.focus());
  }, []);

  const handleHideWidget = (widgetId) => {
    const currentLayout = layoutPreferenceRef.current;
    const savedPositions = {};

    Object.entries(currentLayout.layouts).forEach(([breakpoint, items]) => {
      const item = items.find((layoutItem) => layoutItem.i === widgetId);

      if (item) {
        savedPositions[breakpoint] = { ...item };
      }
    });

    const filteredLayouts = Object.fromEntries(
      Object.entries(currentLayout.layouts).map(([breakpoint, items]) => [
        breakpoint,
        items.filter((item) => item.i !== widgetId),
      ]),
    );
    const nextPreference = normalizeAdminDashboardLayout({
      ...currentLayout,
      layouts: filteredLayouts,
      hiddenWidgetIds: [
        ...currentLayout.hiddenWidgetIds.filter((id) => id !== widgetId),
        widgetId,
      ],
      lastKnownLayouts: {
        ...currentLayout.lastKnownLayouts,
        [widgetId]: savedPositions,
      },
    }, DEFAULT_DASHBOARD_LAYOUTS, DASHBOARD_COLUMNS);

    applyLayoutPreference(nextPreference);
  };

  const handleRestoreWidget = (widgetId) => {
    const currentLayout = layoutPreferenceRef.current;
    const restoredLayouts = Object.fromEntries(
      Object.entries(currentLayout.layouts).map(([breakpoint, items]) => {
        const defaultItem = DEFAULT_DASHBOARD_LAYOUTS[breakpoint].find(
          (item) => item.i === widgetId,
        );
        const restoredItem =
          currentLayout.lastKnownLayouts[widgetId]?.[breakpoint] ||
          defaultItem;

        return [
          breakpoint,
          restoredItem ? [...items, { ...restoredItem }] : items,
        ];
      }),
    );
    const nextPreference = normalizeAdminDashboardLayout({
      ...currentLayout,
      layouts: restoredLayouts,
      hiddenWidgetIds: currentLayout.hiddenWidgetIds.filter(
        (id) => id !== widgetId
      ),
    }, DEFAULT_DASHBOARD_LAYOUTS, DASHBOARD_COLUMNS);

    applyLayoutPreference(nextPreference);
  };

  const handleDragStop = (finalLayout, _oldItem, movedItem) => {
    if (!movedItem?.i) return;

    const currentLayout = layoutPreferenceRef.current;
    const breakpoint = activeBreakpoint;
    const layouts = {
      ...currentLayout.layouts,
      [breakpoint]: finalLayout.map((item) => ({ ...item })),
    };
    const nextPreference = normalizeAdminDashboardLayout(
      {
        ...currentLayout,
        layouts,
      },
      DEFAULT_DASHBOARD_LAYOUTS,
      DASHBOARD_COLUMNS,
    );

    applyLayoutPreference(nextPreference);
  };

  const handleBreakpointChange = (breakpoint) => {
    setActiveBreakpoint(breakpoint);
  };

  const handleMoveWidget = (widgetId, direction) => {
    const orderedIds = getOrderedWidgetIds();
    const currentIndex = orderedIds.indexOf(widgetId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedIds.length) {
      return;
    }

    const currentLayout = layoutPreferenceRef.current;
    const nextOrder = moveWidgetInOrder(orderedIds, widgetId, direction);
    const layouts = Object.fromEntries(
      Object.entries(currentLayout.layouts).map(([breakpoint, items]) => {
        const itemMap = new Map(items.map((item) => [item.i, item]));
        return [
          breakpoint,
          nextOrder
            .map((id) => itemMap.get(id))
            .filter(Boolean)
            .map((item, index) => ({ ...item, x: 0, y: index })),
        ];
      }),
    );
    const nextPreference = normalizeAdminDashboardLayout({
      ...currentLayout,
      layouts,
    }, DEFAULT_DASHBOARD_LAYOUTS, DASHBOARD_COLUMNS);

    applyLayoutPreference(nextPreference);
  };

  const handleResetLayout = () => {
    try {
      const defaultLayout = resetAdminDashboardLayout(
        currentAdminUserId,
        DEFAULT_DASHBOARD_LAYOUTS,
      );
      layoutPreferenceRef.current = defaultLayout;
      setLayoutPreference(defaultLayout);
      setLayoutError("");
      closeCustomizer();
    } catch (error) {
      console.error("Admin dashboard layout could not be reset:", error);
      setLayoutError("The default layout could not be saved. Retry");
    }
  };

  const retryLayoutSave = () => {
    persistLayoutPreference(layoutPreferenceRef.current);
  };

  const openCouponModal = () => {
    setCouponError("");
    setCouponSuccess("");
    setCouponModalOpen(true);
  };

  const submitCoupon = async (values) => {
    try {
      setCouponProcessing(true);
      setCouponError("");
      const created = await createAdminCoupon(values);
      setCouponModalOpen(false);
      setCouponSuccess(`${created.couponCode} was created.`);
      window.dispatchEvent(new Event("admin-coupons-updated"));
    } catch (error) {
      setCouponError(error.message || "Coupon could not be created.");
    } finally {
      setCouponProcessing(false);
    }
  };

  const renderWidget = (widget) => {
    if (widget.statisticId) {
      const statistic = dashboardData.statistics.find(
        (item) => Number(item.id) === widget.statisticId
      );

      return statistic ? (
        <AdminStatCard
          title={statistic.title}
          value={statistic.value}
          change={statistic.change}
          comparison={statistic.comparison}
          iconType={statistic.iconType}
          color={statistic.color}
          negative={statistic.negative}
        />
      ) : null;
    }

    if (widget.id === "sales-analytics") {
      return (
        <Suspense fallback={<div className="admin-dashboard-message">Loading analytics...</div>}>
          <AdminSalesAnalytics
            salesData={dashboardData.salesData}
            currencies={dashboardData.recognizedRevenueByCurrency.map((item) => item.currencyCode)}
          />
        </Suspense>
      );
    }

    if (widget.id === "quick-actions") return <AdminQuickActions visibleWidgetIds={visibleWidgets.map((item) => item.id)} onAddCoupon={openCouponModal} />;
    if (widget.id === "quick-category-manager") return <AdminQuickCategoryManager />;
    if (widget.id === "product-oversight") return <AdminProductOversightQueue />;
    if (widget.id === "account-alerts") return <AdminAccountAlerts />;
    if (widget.id === "coupon-manager") return <AdminCouponManager onAddCoupon={openCouponModal} />;

    if (widget.id === "pending-brand-applications") {
      return (
        <PendingSellerVerification
          sellerRequests={dashboardData.sellerRequests}
          onApproveSeller={handleApproveStore}
          approvingSellerId={approvingStoreIdentifier}
        />
      );
    }

    if (widget.id === "latest-orders") {
      return <AdminLatestOrders orders={dashboardData.latestOrders} />;
    }

    return null;
  };

  const handleApproveStore = async (
    receivedIdentifier
  ) => {
    const numericIdentifier =
      Number(receivedIdentifier);

    if (!numericIdentifier) {
      setErrorMessage(
        "A valid store application identifier was not provided."
      );

      return;
    }

    /*
      PendingSellerVerification may currently send:

      - compatibility id
      - sellerUserId
      - storeId

      The actual approval operation always uses STORE.StoreID.
    */
    const matchingStoreApplication =
      dashboardData.sellerRequests.find(
        (storeApplication) =>
          Number(
            storeApplication.storeId
          ) === numericIdentifier ||
          Number(
            storeApplication.id
          ) === numericIdentifier ||
          Number(
            storeApplication.sellerUserId
          ) === numericIdentifier
      );

    if (!matchingStoreApplication) {
      setErrorMessage(
        "Store application could not be found."
      );

      return;
    }

    const storeId = Number(
      matchingStoreApplication.storeId
    );

    if (!storeId) {
      setErrorMessage(
        "The selected application does not have a valid Store ID."
      );

      return;
    }

    try {
      setApprovingStoreIdentifier(
        matchingStoreApplication.id ??
          matchingStoreApplication.storeId
      );

      setErrorMessage("");

      await approveAdminStoreApplication(
        storeId,
        currentAdminUserId
      );

      await loadDashboardData({
        showLoading: false,
      });

      window.dispatchEvent(
        new Event("admin-data-updated")
      );
    } catch (error) {
      console.error(
        "Store application could not be approved:",
        error
      );

      setErrorMessage(
        error.message ||
          "Store application could not be approved."
      );
    } finally {
      setApprovingStoreIdentifier(null);
    }
  };

  return (
    <AdminPageLayout contentClassName="admin-dashboard-content">
            <div className="admin-dashboard-toolbar">
              <div>
                <h1>Dashboard</h1>
                <p>Overview of Shopera administration.</p>
              </div>
              <button
                ref={customizeButtonRef}
                type="button"
                className="admin-dashboard-customize-button"
                onClick={() => setIsCustomizerOpen(true)}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Customize Dashboard
                {hiddenWidgets.length > 0 && (
                  <span aria-label={`${hiddenWidgets.length} hidden widgets`}>
                    {hiddenWidgets.length}
                  </span>
                )}
              </button>
            </div>

            {isLoading && (
              <div className="admin-dashboard-message">
                Loading dashboard...
              </div>
            )}

            {errorMessage && (
              <div className="admin-dashboard-message admin-dashboard-error">
                {errorMessage}
              </div>
            )}

            {layoutError && (
              <div className="admin-dashboard-layout-error" role="status">
                <span>{layoutError}</span>
                <button type="button" onClick={retryLayoutSave}>Retry</button>
              </div>
            )}
            {couponSuccess && <div className="admin-dashboard-message" role="status">{couponSuccess}</div>}

            {!isLoading && (
              <section
                ref={containerRef}
                className="admin-dashboard-grid-container"
                aria-label="Customizable dashboard widgets"
              >
                  <Responsive
                    className="admin-dashboard-grid"
                    width={width}
                    layouts={layoutPreference.layouts}
                    breakpoints={DASHBOARD_BREAKPOINTS}
                    cols={DASHBOARD_COLUMNS}
                    rowHeight={10}
                    margin={[16, 16]}
                    containerPadding={[0, 0]}
                    dragConfig={{
                      enabled: true,
                      bounded: true,
                      handle: ".admin-widget-drag-handle",
                      cancel: ".admin-widget-control:not(.admin-widget-drag-handle), button:not(.admin-widget-drag-handle), a, input, select",
                      threshold: 5,
                    }}
                    resizeConfig={{ enabled: false, handles: [] }}
                    isResizable={false}
                    onBreakpointChange={handleBreakpointChange}
                    onDragStop={handleDragStop}
                  >
                    {visibleWidgets.map((widget) => (
                      <div key={widget.id} data-widget-id={widget.id}>
                      <DashboardWidgetShell
                        id={widget.id}
                        size={widget.size}
                        title={widget.title}
                        onHide={handleHideWidget}
                      >
                        {renderWidget(widget)}
                      </DashboardWidgetShell>
                      </div>
                    ))}
                  </Responsive>
              </section>
            )}
      {isCustomizerOpen && (
        <Suspense fallback={null}>
          <DashboardCustomizer
            visibleWidgets={visibleWidgets}
            hiddenWidgets={hiddenWidgets}
            isOpen={isCustomizerOpen}
            onClose={closeCustomizer}
            onReset={handleResetLayout}
            onRestore={handleRestoreWidget}
            onHide={handleHideWidget}
            onMoveWidget={handleMoveWidget}
          />
        </Suspense>
      )}
      {couponModalOpen && (
        <AdminModalPortal isOpen={couponModalOpen}>
          <Suspense fallback={null}>
            <CouponFormModal isOpen={couponModalOpen} mode="create" isProcessing={couponProcessing} errorMessage={couponError} onSubmit={submitCoupon} onCancel={() => !couponProcessing && setCouponModalOpen(false)} />
          </Suspense>
        </AdminModalPortal>
      )}
    </AdminPageLayout>
  );
}

export default AdminDashboardPage;
