// src/pages/seller/SellerDashboardPage.jsx

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getSellerDashboardData,
  getSellerDashboardLayout,
  saveSellerDashboardLayout,
  resetSellerDashboardLayout,
} from "../../services/sellerService";
import { Link } from "react-router-dom";
import SellerAsyncState from "../../components/seller/SellerAsyncState";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";

import WeeklySalesCard from "../../components/seller/dashboard/WeeklySalesCard";
import RecentOrdersCard from "../../components/seller/dashboard/RecentOrdersCard";
import LowStockCard from "../../components/seller/dashboard/LowStockCard";
import TopRatedCard from "../../components/seller/dashboard/TopRatedCard";
import SellerDashboardErrorBoundary from "../../components/seller/dashboard/SellerDashboardErrorBoundary";

import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../utils/formatCurrency";
import "../../styles/seller/sellerDashboard.css";

function DashboardIcon({ type }) {
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

  if (type === "cube") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5" />
        <path d="M12 12v9" />
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

  if (type === "currency") {
    return (
      <svg {...commonProps}>
        <path d="M12 2v20" />
        <path d="M17 6.5c-1-1-2.3-1.5-4-1.5-2.5 0-4 1.1-4 3s1.5 2.7 4 3.2 4 1.3 4 3.3-1.8 3.5-4.5 3.5c-1.9 0-3.5-.6-4.5-1.7" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M19 8a3 3 0 0 1 0 6" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function SellerDashboardContent() {

  const { t } = useTranslation();

  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLayout, setDashboardLayout] = useState([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [layoutError, setLayoutError] = useState("");

  const [draggedWidgetId, setDraggedWidgetId] = useState(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState(null);
  const mountedRef = useRef(true);

  const loadDashboard = useCallback(
    async (retry = false, signal) => {
      try {
        if (mountedRef.current) {
          setLoadError("");
          setIsRetrying(retry);
        }
        const [data, savedLayout] =
          await Promise.all([
            getSellerDashboardData({ signal }),
            getSellerDashboardLayout(),
          ]);

        if (!signal?.aborted && mountedRef.current) {
          setDashboardData(data);
          setDashboardLayout(savedLayout);
        }
      } catch (error) {
        if (
          error?.name !== "AbortError" &&
          mountedRef.current
        ) {
          setLoadError(
            error.message || t("common.errorTitle")
          );
        }
      } finally {
        if (mountedRef.current) {
          setIsRetrying(false);
        }
      }
    },
    [t]
  );



  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    void loadDashboard(false, controller.signal);

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [loadDashboard]);

  const toggleWidgetVisibility = (widgetId) => {
    setDashboardLayout((currentLayout) =>
      currentLayout.map((widget) =>
        widget.id === widgetId
          ? {
              ...widget,
              visible: !widget.visible,
            }
          : widget
      )
    );
  };


  const handleDragStart = (event, widgetId) => {
    if (!isCustomizing) {
      event.preventDefault();
      return;
    }

    setDraggedWidgetId(widgetId);
    setDragOverWidgetId(widgetId);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", widgetId);
  };

  const handleDragOver = (event, widgetId) => {
    if (!isCustomizing || !draggedWidgetId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dragOverWidgetId !== widgetId) {
      setDragOverWidgetId(widgetId);
    }
  };

  const handleDrop = (event, targetWidgetId) => {
    event.preventDefault();

    const sourceWidgetId =
      draggedWidgetId || event.dataTransfer.getData("text/plain");

    if (!sourceWidgetId || sourceWidgetId === targetWidgetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    setDashboardLayout((currentLayout) => {
      const sourceIndex = currentLayout.findIndex(
        (widget) => widget.id === sourceWidgetId
      );

      const targetIndex = currentLayout.findIndex(
        (widget) => widget.id === targetWidgetId
      );

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentLayout;
      }

      const reorderedLayout = [...currentLayout];
      const [movedWidget] = reorderedLayout.splice(sourceIndex, 1);

      reorderedLayout.splice(targetIndex, 0, movedWidget);

      return reorderedLayout;
    });

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleSaveLayout = async () => {
    try {
      setIsSavingLayout(true);
      setLayoutError("");

      await saveSellerDashboardLayout(dashboardLayout);

      setIsCustomizing(false);
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
    } catch (error) {
      setLayoutError(error.message || t("common.errorDescription"));
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleResetLayout = async () => {
    try {
      setLayoutError("");
      const defaultLayout = await resetSellerDashboardLayout();

      setDashboardLayout(defaultLayout);
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
    } catch (error) {
      setLayoutError(error.message || t("common.errorDescription"));
    }
  };

  if (isRetrying) {
    return <SellerAsyncState status="retrying" />;
  }

  if (loadError) {
    return (
      <SellerAsyncState
        status="error"
        error={loadError}
        onRetry={() => loadDashboard(true)}
      />
    );
  }

  if (!dashboardData) {
    return (
      <SellerAsyncState status="loading" />
    );
  }

  if (!dashboardData.hasStore) {
    return (
      <section className="seller-dashboard-state">
        <h1>{t("sidebar.noStore")}</h1>
        <p>{t("storeProfile.noStoreDescription")}</p>
        <Link to="/seller/store-profile">{t("storeProfile.createStore")}</Link>
      </section>
    );
  }

  const { seller, approvalState } = dashboardData;
  const statistics = Array.isArray(
    dashboardData.statistics
  )
    ? dashboardData.statistics
    : [];
  const weeklySales = Array.isArray(
    dashboardData.weeklySales
  )
    ? dashboardData.weeklySales
    : [];
  const recentOrders = Array.isArray(
    dashboardData.recentOrders
  )
    ? dashboardData.recentOrders
    : [];
  const lowStockProducts = Array.isArray(
    dashboardData.lowStockProducts
  )
    ? dashboardData.lowStockProducts
    : [];
  const topRatedProducts = Array.isArray(
    dashboardData.topRatedProducts
  )
    ? dashboardData.topRatedProducts
    : [];
  const safeLayout = Array.isArray(dashboardLayout)
    ? dashboardLayout
    : [];
  const formatStatisticValue = (statistic) => {
    const value = Number(statistic?.value);
    const safeValue = Number.isFinite(value)
      ? value
      : 0;

    if (statistic?.format === "currency") {
      try {
        return formatCurrency(
          safeValue,
          statistic.currencyCode || "EUR"
        );
      } catch {
        return String(safeValue);
      }
    }

    return new Intl.NumberFormat().format(safeValue);
  };

  const renderWidget = (widgetId) => {
    if (widgetId === "weekly-sales") {
      return <WeeklySalesCard weeklySales={weeklySales} />;
    }

    if (widgetId === "recent-orders") {
      return <RecentOrdersCard recentOrders={recentOrders} />;
    }

    if (widgetId === "low-stock-products") {
      return <LowStockCard lowStockProducts={lowStockProducts} />;
    }

    if (widgetId === "top-rated-products") {
      return <TopRatedCard topRatedProducts={topRatedProducts} />;
    }

    return null;
  };


  const visibleWidgets = safeLayout.filter(
    (widget) => widget?.visible === true
  );

  return (
    <div className="seller-dashboard-content">
      <section className="seller-dashboard-heading">
        <div>
          <h1 className="seller-dashboard-heading__title">
            {t("dashboard.welcome", {
             storeName: seller.storeName,
           })} 👋
          </h1>

          <p className="seller-dashboard-heading__description">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="seller-dashboard-heading__actions">
          <button
            type="button"

              className={`seller-customize-button ${
                isCustomizing
                  ? "seller-customize-button--active"
                  : ""
            }`}

            onClick={() =>
              setIsCustomizing((current) => !current)
            }
          >
            <span aria-hidden="true">⚙</span>

            {isCustomizing
              ? t("dashboard.closeCustomize")
              : t("dashboard.customizeDashboard")}
          </button>

          <button
            type="button"
            className="seller-date-button"
            disabled
            title={t("dashboard.dateUnavailable")}
          >
            <span aria-hidden="true">▣</span>
            {t("common.thisWeek")}
            <span aria-hidden="true">⌄</span>
          </button>

          <button
            type="button"
            className="seller-export-button"
            disabled
            title={t("dashboard.exportUnavailable")}
          >
            <span aria-hidden="true">⇩</span>
            {t("dashboard.export")}
          </button>
        </div>
      </section>
      {approvalState ? (
        <section
          className={`seller-dashboard-approval seller-dashboard-approval--${approvalState.status}`}
          role="status"
        >
          <div>
            <strong>{t(approvalState.titleKey)}</strong>
            <p>{t(approvalState.descriptionKey)}</p>
          </div>
          <Link to={approvalState.route}>
            {t("dashboard.reviewStoreProfile")}
          </Link>
        </section>
      ) : null}
      {layoutError && (
        <p className="seller-dashboard-layout-error" role="alert">
          {layoutError}
        </p>
      )}

      {isCustomizing && (
        <section className="seller-customizer">
          <div className="seller-customizer__header">
            <div>
              <h2>{t("dashboard.customizeDashboard")}</h2>

              <p>{t("dashboard.customizeDescription")}</p>
            </div>

            <div className="seller-customizer__actions">
              <button
                type="button"
                className="seller-customizer__reset"
                onClick={handleResetLayout}
              >
                {t("dashboard.resetLayout")}
              </button>

              <button
                type="button"
                className="seller-customizer__save"
                onClick={handleSaveLayout}
                disabled={isSavingLayout}
              >
                {isSavingLayout
                  ? t("dashboard.saving")
                  : t("dashboard.saveLayout")}
              </button>
            </div>
          </div>

          <div className="seller-customizer__widgets">
          {safeLayout.map((widget) => (
              <label
                key={widget.id}
                className={`seller-customizer__widget ${
                  draggedWidgetId === widget.id
                    ? "seller-customizer__widget--dragging"
                    : ""
                } ${
                  dragOverWidgetId === widget.id &&
                  draggedWidgetId !== widget.id
                    ? "seller-customizer__widget--drag-over"
                    : ""
                }`}
                draggable
                onDragStart={(event) =>
                  handleDragStart(event, widget.id)
                }
                onDragOver={(event) =>
                  handleDragOver(event, widget.id)
                }
                onDrop={(event) =>
                  handleDrop(event, widget.id)
                }
                onDragEnd={handleDragEnd}
              >
                <span className="seller-customizer__drag-icon">
                  ☰
                </span>

                <span className="seller-customizer__widget-title">
                  {t(widget.titleKey)}
                </span>

                <input
                  type="checkbox"
                  checked={widget.visible}
                  onChange={() =>
                    toggleWidgetVisibility(widget.id)
                  }
                />

                <span className="seller-customizer__switch" />
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="seller-statistics">
        {statistics.map((statistic) => (
          <article
            key={statistic.id}
            className="seller-stat-card"
          >
            <div
              className={`seller-stat-card__icon seller-stat-card__icon--${statistic.color}`}
            >
              <DashboardIcon type={statistic.icon} />
            </div>

            <div className="seller-stat-card__content">
              <p className="seller-stat-card__title">
                {t(statistic.titleKey)}
              </p>

              <h2 className="seller-stat-card__value">
                {formatStatisticValue(statistic)}
              </h2>

              <div className="seller-stat-card__bottom">
                <span className="seller-stat-card__period">
                  {t(statistic.periodKey)}
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section
        className={`seller-dashboard-widgets-grid ${
          isCustomizing
            ? "seller-dashboard-widgets-grid--customizing"
            : ""
        }`}
      >
        {visibleWidgets.map((widget) => (
            <div
  key={widget.id}
  className={`seller-dashboard-widget-wrapper ${
    isCustomizing
      ? "seller-dashboard-widget-wrapper--draggable"
      : ""
  } ${
    draggedWidgetId === widget.id
      ? "seller-dashboard-widget-wrapper--dragging"
      : ""
  } ${
    dragOverWidgetId === widget.id &&
    draggedWidgetId !== widget.id
      ? "seller-dashboard-widget-wrapper--drag-over"
      : ""
  }`}

  draggable={isCustomizing}
  onDragStart={(event) =>
    handleDragStart(event, widget.id)
  }
  onDragOver={(event) =>
    handleDragOver(event, widget.id)
  }
  onDrop={(event) =>
    handleDrop(event, widget.id)
  }
  onDragEnd={handleDragEnd}
>
              {isCustomizing && (
                <div className="seller-dashboard-widget-drag-label">
                  <span aria-hidden="true">☰</span>
                  {t("dashboard.dragToReorder")}
                </div>
              )}

              {renderWidget(widget.id)}
            </div>
          ))}
      </section>
    </div>
  );
}

function SellerDashboardPage() {
  const [boundaryKey, setBoundaryKey] =
    useState(0);

  return (
    <SellerPageShell>
      <SellerDashboardErrorBoundary
        key={boundaryKey}
        onRetry={() =>
          setBoundaryKey((key) => key + 1)
        }
      >
        <SellerDashboardContent />
      </SellerDashboardErrorBoundary>
    </SellerPageShell>
  );
}

export default SellerDashboardPage;
