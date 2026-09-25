import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  SellerOrderApiError,
  getSellerOrder,
  listSellerOrders,
  updateOrderStatus,
  updateShipmentDetails,
} from "../../services/sellerOrderService";
import {
  getSellerStoreProfile,
} from "../../services/sellerService";
import {
  ORDER_STATUS,
  ORDER_STATUS_CODES,
  ORDER_STATUS_META,
  ORDER_STATUS_TRANSLATION_KEYS,
  getAllowedOrderStatuses,
} from "../../constants/marketplace";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getSellerOrderSummary,
  getSellerOrdersEmptyState,
} from "../../utils/sellerOrderPresentation";
import SellerAsyncState from "../../components/seller/SellerAsyncState";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";
import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";

const ALL_ORDERS = "ALL";
const ORDERS_PER_PAGE = 10;
const EMPTY_ORDERS = Object.freeze([]);
const orderTabs = [
  ALL_ORDERS,
  ...ORDER_STATUS_CODES,
];

const getOrderStatusKey = (status) =>
  status === ALL_ORDERS
    ? "orders.allOrders"
    : ORDER_STATUS_TRANSLATION_KEYS[status];

const formatOrderDate = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

const formatOrderMoney = (
  amount,
  currencyCode
) =>
  currencyCode
    ? formatCurrency(amount, currencyCode)
    : String(Number(amount) || 0);

const getProductInitial = (productName) =>
  String(productName || "")
    .trim()
    .charAt(0)
    .toUpperCase() || "P";

const formatShippingAddress = (address) => {
  if (!address) {
    return "";
  }

  if (typeof address === "string") {
    return address;
  }

  return [
    address.receiverName,
    address.streetAddress,
    address.addressLine1,
    address.addressLine2,
    address.buildingNo,
    address.apartmentNo,
    address.district,
    address.city,
    address.stateProvince,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
};

const csvCell = (value) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

const getOrderErrorKey = (
  error,
  fallbackKey
) => {
  if (!(error instanceof SellerOrderApiError)) {
    return fallbackKey;
  }

  if (error.isNetworkError) {
    return "orders.networkError";
  }

  if (error.code === "SHIPMENT_TRACKING_NUMBER_IN_USE") {
    return "orders.shipmentTrackingInUse";
  }

  if (error.code === "SHIPMENT_NOT_AVAILABLE") {
    return "orders.shipmentNotAvailable";
  }

  return (
    {
      400: "orders.validationError",
      401: "orders.sessionExpired",
      403: "orders.forbidden",
      404: "orders.notFound",
      409: "orders.conflict",
    }[error.status] || fallbackKey
  );
};

function SellerOrdersContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ordersData, setOrdersData] =
    useState(null);
  const [searchTerm, setSearchTerm] =
    useState("");
  const [activeStatus, setActiveStatus] =
    useState(ALL_ORDERS);
  const [filterStatus, setFilterStatus] =
    useState(ALL_ORDERS);
  const [minTotal, setMinTotal] =
    useState("");
  const [maxTotal, setMaxTotal] =
    useState("");
  const [selectedOrderIds, setSelectedOrderIds] =
    useState([]);
  const [currentPage, setCurrentPage] =
    useState(1);
  const [selectedOrder, setSelectedOrder] =
    useState(null);
  const [openingOrderId, setOpeningOrderId] =
    useState(null);
  const [updatingOrderId, setUpdatingOrderId] =
    useState(null);
  const [orderFeedback, setOrderFeedback] =
    useState(null);
  const [loadErrorKey, setLoadErrorKey] =
    useState("");
  const [isRetrying, setIsRetrying] =
    useState(false);
  const [isFilterOpen, setIsFilterOpen] =
    useState(false);
  const [shipmentDialog, setShipmentDialog] =
    useState(null);
  const [shipmentForm, setShipmentForm] =
    useState({ courierName: "", trackingNumber: "" });
  const [isSavingShipment, setIsSavingShipment] =
    useState(false);

  const closeOrderFilters = () =>
    setIsFilterOpen(false);
  const filterOverlay = useOverlayAccessibility({
    isOpen: isFilterOpen,
    onClose: closeOrderFilters,
  });
  const closeOrderDetails = () =>
    setSelectedOrder(null);
  const detailsOverlay = useOverlayAccessibility({
    isOpen: Boolean(selectedOrder),
    onClose: closeOrderDetails,
  });
  const closeShipmentDialog = () => {
    if (!isSavingShipment) {
      setShipmentDialog(null);
    }
  };
  const shipmentOverlay = useOverlayAccessibility({
    isOpen: Boolean(shipmentDialog),
    onClose: closeShipmentDialog,
  });

  const loadOrders = useCallback(
    async (retry = false, signal) => {
      setOrdersData(null);
      setLoadErrorKey("");
      setIsRetrying(retry);

      try {
        const orders = await listSellerOrders({
          signal,
        });
        const storeProfile = orders.length
          ? null
          : await getSellerStoreProfile({
              signal,
            });

        setOrdersData({
          orders,
          storeProfile,
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          setLoadErrorKey(
            getOrderErrorKey(
              error,
              "orders.loadError"
            )
          );
        }
      } finally {
        setIsRetrying(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadOrders(false, controller.signal);

    return () => controller.abort();
  }, [loadOrders]);

  const orders =
    ordersData?.orders ?? EMPTY_ORDERS;
  const summary = useMemo(
    () => getSellerOrderSummary(orders),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return orders.filter((order) => {
      const searchableItems = order.items
        .flatMap((item) => [
          item.productName,
          item.sku,
          item.variantName,
        ])
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        order.orderNumber
          .toLowerCase()
          .includes(normalizedSearch) ||
        order.customerName
          .toLowerCase()
          .includes(normalizedSearch) ||
        searchableItems.includes(normalizedSearch);
      const matchesTabStatus =
        activeStatus === ALL_ORDERS ||
        order.status === activeStatus;
      const matchesFilterStatus =
        filterStatus === ALL_ORDERS ||
        order.status === filterStatus;
      const matchesMinTotal =
        minTotal === "" ||
        order.totalAmount >= Number(minTotal);
      const matchesMaxTotal =
        maxTotal === "" ||
        order.totalAmount <= Number(maxTotal);

      return (
        matchesSearch &&
        matchesTabStatus &&
        matchesFilterStatus &&
        matchesMinTotal &&
        matchesMaxTotal
      );
    });
  }, [
    activeStatus,
    filterStatus,
    maxTotal,
    minTotal,
    orders,
    searchTerm,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredOrders.length /
        ORDERS_PER_PAGE
    )
  );
  const visibleOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  const replaceOrder = (authoritativeOrder) => {
    setOrdersData((currentData) => ({
      ...currentData,
      orders: (currentData?.orders || []).map(
        (order) =>
          order.orderId ===
          authoritativeOrder.orderId
            ? authoritativeOrder
            : order
      ),
    }));
    setSelectedOrder((currentOrder) =>
      currentOrder?.orderId ===
      authoritativeOrder.orderId
        ? authoritativeOrder
        : currentOrder
    );
  };

  const openShipmentDialog = (order, mode = "ship") => {
    setShipmentForm({
      courierName: order.shipment?.courierName || "",
      trackingNumber: order.shipment?.trackingNumber || "",
    });
    setShipmentDialog({ order, mode });
    setOrderFeedback(null);
  };

  const handleShipmentSubmit = async (event) => {
    event.preventDefault();

    if (!shipmentDialog || isSavingShipment) {
      return;
    }

    const { order, mode } = shipmentDialog;
    setIsSavingShipment(true);
    setOrderFeedback(null);

    try {
      const authoritativeOrder =
        mode === "edit"
          ? await updateShipmentDetails(
              order.orderId,
              shipmentForm
            )
          : await updateOrderStatus(
              order.orderId,
              ORDER_STATUS.SHIPPED,
              { shipment: shipmentForm }
            );

      replaceOrder(authoritativeOrder);
      setShipmentDialog(null);
      if (mode === "edit") {
        setSelectedOrder(authoritativeOrder);
      }
      setOrderFeedback({
        orderId: order.orderId,
        type: "success",
        message: t(
          mode === "edit"
            ? "orders.shipmentUpdateSuccess"
            : "orders.shipmentCreatedSuccess"
        ),
      });
    } catch (error) {
      if (error.authoritativeOrder) {
        replaceOrder(error.authoritativeOrder);
      }

      setOrderFeedback({
        orderId: order.orderId,
        type: "error",
        message: t(
          getOrderErrorKey(
            error,
            "orders.shipmentUpdateError"
          )
        ),
      });
    } finally {
      setIsSavingShipment(false);
    }
  };

  const handleStatusUpdate = async (
    order,
    nextStatus
  ) => {
    if (updatingOrderId !== null) {
      return;
    }

    if (
      !getAllowedOrderStatuses(
        order.status
      ).includes(nextStatus)
    ) {
      setOrderFeedback({
        orderId: order.orderId,
        type: "error",
        message: t("orders.invalidTransition"),
      });
      return;
    }

    if (
      !window.confirm(
        t("orders.confirmStatusChange", {
          status: t(
            ORDER_STATUS_META[nextStatus]
              .labelKey
          ),
        })
      )
    ) {
      return;
    }

    setUpdatingOrderId(order.orderId);
    setOrderFeedback(null);

    try {
      const authoritativeOrder =
        await updateOrderStatus(
          order.orderId,
          nextStatus
        );
      replaceOrder(authoritativeOrder);
      setOrderFeedback({
        orderId: order.orderId,
        type: "success",
        message: t(
          "orders.statusUpdateSuccess"
        ),
      });
    } catch (error) {
      if (error.authoritativeOrder) {
        replaceOrder(
          error.authoritativeOrder
        );
      }

      setOrderFeedback({
        orderId: order.orderId,
        type: "error",
        message: t(
          getOrderErrorKey(
            error,
            "orders.updateError"
          )
        ),
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openOrderDetails = async (order) => {
    setOpeningOrderId(order.orderId);
    setOrderFeedback(null);

    try {
      setSelectedOrder(
        await getSellerOrder(order.orderId)
      );
    } catch (error) {
      setOrderFeedback({
        orderId: order.orderId,
        type: "error",
        message: t(
          getOrderErrorKey(
            error,
            "orders.detailsLoadError"
          )
        ),
      });
    } finally {
      setOpeningOrderId(null);
    }
  };

  const clearFilters = () => {
    setFilterStatus(ALL_ORDERS);
    setMinTotal("");
    setMaxTotal("");
    setSearchTerm("");
    setActiveStatus(ALL_ORDERS);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handleExportOrders = () => {
    const headers = [
      t("orders.orderId"),
      t("orders.product"),
      t("orders.customer"),
      t("orders.statusLabel"),
      t("orders.quantity"),
      t("orders.total"),
      t("orders.currency"),
      t("orders.orderDate"),
    ];
    const rows = filteredOrders.map(
      (order) => [
        order.orderNumber,
        order.items
          .map((item) => item.productName)
          .join("; "),
        order.customerName,
        t(
          ORDER_STATUS_TRANSLATION_KEYS[
            order.status
          ]
        ),
        order.totalQuantity,
        order.totalAmount,
        order.currencyCode,
        order.orderDate,
      ]
    );
    const csv = [headers, ...rows]
      .map((row) =>
        row.map(csvCell).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "seller-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isRetrying) {
    return <SellerAsyncState status="retrying" />;
  }

  if (loadErrorKey) {
    return (
      <SellerAsyncState
        status="error"
        error={t(loadErrorKey)}
        onRetry={() => loadOrders(true)}
      />
    );
  }

  if (!ordersData) {
    return <SellerAsyncState status="loading" />;
  }

  const emptyState = getSellerOrdersEmptyState(
    ordersData.storeProfile,
    orders
  );
  const showingFrom = filteredOrders.length
    ? (currentPage - 1) *
        ORDERS_PER_PAGE +
      1
    : 0;
  const showingTo = Math.min(
    currentPage * ORDERS_PER_PAGE,
    filteredOrders.length
  );

  return (
    <div className="seller-orders-content">
      <section className="seller-orders-heading">
        <div>
          <h1>{t("orders.title")}</h1>
          <p>{t("orders.subtitle")}</p>
        </div>

        <div className="seller-orders-heading__actions">
          <label className="seller-orders-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder={t("orders.search")}
              aria-label={t("orders.search")}
            />
          </label>

          <button
            type="button"
            className="seller-orders-filter-button"
            onClick={() =>
              setIsFilterOpen(true)
            }
          >
            <span aria-hidden="true">≡</span>
            {t("common.filter")}
          </button>

          <button
            type="button"
            className="seller-orders-clear-button"
            aria-label={t(
              "orders.clearFilters"
            )}
            onClick={clearFilters}
          >
            ×
          </button>

          <button
            type="button"
            className="seller-orders-date-button"
            disabled
          >
            <span aria-hidden="true">▣</span>
            {t("orders.allDates")}
          </button>
        </div>
      </section>

      {isFilterOpen ? (
        <section
          ref={filterOverlay.overlayRef}
          className="seller-orders-filter-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seller-orders-filter-title"
        >
          <header className="seller-orders-filter-panel__header">
            <h2 id="seller-orders-filter-title">
              {t("common.filter")}
            </h2>
            <button
              ref={filterOverlay.initialFocusRef}
              type="button"
              onClick={closeOrderFilters}
              aria-label={t("common.close")}
            >
              ×
            </button>
          </header>

          <div className="seller-orders-filter-panel__field">
            <label htmlFor="order-filter-status">
              {t("orders.orderStatus")}
            </label>
            <select
              id="order-filter-status"
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(
                  event.target.value
                );
                setCurrentPage(1);
              }}
            >
              {orderTabs.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {t(getOrderStatusKey(status))}
                </option>
              ))}
            </select>
          </div>

          <div className="seller-orders-filter-panel__field">
            <label htmlFor="order-min-total">
              {t("orders.minimumTotal")}
            </label>
            <input
              id="order-min-total"
              type="number"
              min="0"
              value={minTotal}
              onChange={(event) => {
                setMinTotal(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="0"
            />
          </div>

          <div className="seller-orders-filter-panel__field">
            <label htmlFor="order-max-total">
              {t("orders.maximumTotal")}
            </label>
            <input
              id="order-max-total"
              type="number"
              min="0"
              value={maxTotal}
              onChange={(event) => {
                setMaxTotal(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="1000"
            />
          </div>

          <div className="seller-orders-filter-panel__actions">
            <button
              type="button"
              onClick={clearFilters}
            >
              {t("common.reset")}
            </button>
            <button
              type="button"
              className="seller-orders-filter-panel__apply"
              onClick={closeOrderFilters}
            >
              {t("orders.applyFilters")}
            </button>
          </div>
        </section>
      ) : null}

      <div className="seller-orders-layout">
        <main className="seller-orders-main">
          <nav
            className="seller-orders-tabs"
            aria-label={t(
              "orders.statusFilters"
            )}
          >
            {orderTabs.map((status) => (
              <button
                key={status}
                type="button"
                className={
                  activeStatus === status
                    ? "seller-orders-tabs__button seller-orders-tabs__button--active"
                    : "seller-orders-tabs__button"
                }
                onClick={() => {
                  setActiveStatus(status);
                  setCurrentPage(1);
                }}
              >
                {t(getOrderStatusKey(status))}
              </button>
            ))}
          </nav>

          {orders.length === 0 ? (
            <section className="seller-orders-empty">
              <h2>{t(emptyState.titleKey)}</h2>
              <p>
                {t(emptyState.descriptionKey)}
              </p>
              {emptyState.route ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(emptyState.route)
                  }
                >
                  {t(emptyState.actionKey)}
                </button>
              ) : null}
            </section>
          ) : visibleOrders.length === 0 ? (
            <section className="seller-orders-empty">
              <h2>
                {t("orders.noOrdersFound")}
              </h2>
              <p>
                {t("orders.noOrdersDescription")}
              </p>
            </section>
          ) : (
            <section className="seller-orders-list">
              {visibleOrders.map((order) => {
                const firstItem = order.items[0];
                const additionalItemCount =
                  Math.max(
                    0,
                    order.items.length - 1
                  );
                const isSelected =
                  selectedOrderIds.includes(
                    order.orderId
                  );
                const allowedNextStatuses =
                  getAllowedOrderStatuses(
                    order.status
                  );
                const isUpdating =
                  updatingOrderId === order.orderId;
                const statusMeta =
                  ORDER_STATUS_META[order.status];

                return (
                  <article
                    key={order.orderId}
                    className={`seller-order-card ${
                      isSelected
                        ? "seller-order-card--selected"
                        : ""
                    } ${
                      order.status ===
                      ORDER_STATUS.PENDING
                        ? "seller-order-card--pending"
                        : ""
                    }`}
                  >
                    <label className="seller-order-card__checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedOrderIds(
                            (currentIds) =>
                              currentIds.includes(
                                order.orderId
                              )
                                ? currentIds.filter(
                                    (id) =>
                                      id !==
                                      order.orderId
                                  )
                                : [
                                    ...currentIds,
                                    order.orderId,
                                  ]
                          )
                        }
                        aria-label={t(
                          "orders.selectOrder",
                          {
                            id: order.orderNumber,
                          }
                        )}
                      />
                      <span />
                    </label>

                    <div className="seller-order-card__product">
                      <div className="seller-order-card__order-meta">
                        <strong>
                          {order.orderNumber}
                        </strong>
                        <span>
                          {formatOrderDate(
                            order.orderDate
                          )}
                        </span>
                      </div>

                      <div className="seller-order-card__product-main">
                        <div className="seller-order-card__visual">
                          <span>
                            {getProductInitial(
                              firstItem?.productName
                            )}
                          </span>
                        </div>
                        <div>
                          <h2>
                            {firstItem?.productName ||
                              "—"}
                          </h2>
                          <p>
                            {firstItem?.variantName ||
                              firstItem?.sku ||
                              "—"}
                          </p>
                          {additionalItemCount > 0 ? (
                            <small>
                              {t(
                                "orders.moreItems",
                                {
                                  count:
                                    additionalItemCount,
                                }
                              )}
                            </small>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="seller-order-card__customer">
                      <strong>
                        {order.customerName}
                      </strong>
                      {order.customerPhone ? (
                        <span>
                          {order.customerPhone}
                        </span>
                      ) : null}
                    </div>

                    <strong className="seller-order-card__quantity">
                      {order.totalQuantity}
                    </strong>
                    <strong className="seller-order-card__total">
                      {formatOrderMoney(
                        order.totalAmount,
                        order.currencyCode
                      )}
                    </strong>
                    <span
                      className={`seller-order-card__status seller-order-card__status--${statusMeta.color}`}
                    >
                      {t(statusMeta.labelKey)}
                    </span>

                    {allowedNextStatuses.length ? (
                      <select
                        className="seller-order-card__status-select"
                        value=""
                        disabled={isUpdating}
                        aria-label={t(
                          "orders.updateStatus",
                          {
                            id: order.orderNumber,
                          }
                        )}
                        onChange={(event) => {
                          if (event.target.value) {
                            if (
                              event.target.value ===
                              ORDER_STATUS.SHIPPED
                            ) {
                              openShipmentDialog(order);
                            } else {
                              void handleStatusUpdate(
                                order,
                                event.target.value
                              );
                            }
                          }
                        }}
                      >
                        <option value="" disabled>
                          {isUpdating
                            ? t(
                                "orders.updatingStatus"
                              )
                            : t(
                                "orders.chooseNextStatus"
                              )}
                        </option>
                        {allowedNextStatuses.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {t(
                                ORDER_STATUS_META[
                                  status
                                ].labelKey
                              )}
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      className="seller-order-card__view-button"
                      disabled={
                        openingOrderId ===
                        order.orderId
                      }
                      aria-label={t(
                        "orders.viewOrder",
                        {
                          id: order.orderNumber,
                        }
                      )}
                      onClick={() =>
                        void openOrderDetails(order)
                      }
                    >
                      ◉
                    </button>

                    {order.status ===
                    ORDER_STATUS.PENDING ? (
                      <div className="seller-order-card__approval">
                        <strong>
                          {t(
                            "orders.requiresAttention"
                          )}
                        </strong>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            void handleStatusUpdate(
                              order,
                              ORDER_STATUS.CONFIRMED
                            )
                          }
                        >
                          {isUpdating
                            ? t(
                                "orders.confirmingOrder"
                              )
                            : t(
                                "orders.confirmOrder"
                              )}
                        </button>
                      </div>
                    ) : null}

                    {orderFeedback?.orderId ===
                    order.orderId ? (
                      <span
                        className={`seller-order-card__feedback seller-order-card__feedback--${orderFeedback.type}`}
                        role={
                          orderFeedback.type ===
                          "error"
                            ? "alert"
                            : "status"
                        }
                      >
                        {orderFeedback.message}
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </section>
          )}

          {orders.length ? (
            <footer className="seller-orders-footer">
              <p>
                {t("orders.showingOrders", {
                  from: showingFrom,
                  to: showingTo,
                  total: filteredOrders.length,
                })}
              </p>
              <div className="seller-orders-pagination">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage(
                      (page) => page - 1
                    )
                  }
                  aria-label={t(
                    "orders.previousPage"
                  )}
                >
                  ‹
                </button>
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={
                      currentPage === page
                        ? "seller-orders-pagination__button--active"
                        : ""
                    }
                    onClick={() =>
                      setCurrentPage(page)
                    }
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={
                    currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) => page + 1
                    )
                  }
                  aria-label={t(
                    "orders.nextPage"
                  )}
                >
                  ›
                </button>
              </div>
              <div className="seller-orders-per-page">
                {t("orders.perPage", {
                  count: ORDERS_PER_PAGE,
                })}
              </div>
            </footer>
          ) : null}
        </main>

        <aside className="seller-orders-summary">
          <article className="seller-orders-summary-card seller-orders-summary-card--revenue">
            <div className="seller-orders-summary-card__header">
              <div className="seller-orders-summary-card__icon">
                {summary.currencyCode || "¤"}
              </div>
              <div>
                <span>
                  {t("orders.todayRevenue")}
                </span>
                <strong>
                  {formatOrderMoney(
                    summary.todayRevenue,
                    summary.currencyCode
                  )}
                </strong>
              </div>
            </div>
          </article>

          <article className="seller-orders-summary-card">
            <div className="seller-orders-summary-card__header">
              <div className="seller-orders-summary-card__icon seller-orders-summary-card__icon--orange">
                ▢
              </div>
              <div>
                <span>
                  {t("orders.pendingShipments")}
                </span>
                <strong>
                  {summary.pendingShipments}
                </strong>
              </div>
            </div>
          </article>

          <article className="seller-orders-summary-card">
            <div className="seller-orders-summary-card__header">
              <div className="seller-orders-summary-card__icon seller-orders-summary-card__icon--green">
                ✓
              </div>
              <div>
                <span>
                  {t("orders.completedOrders")}
                </span>
                <strong>
                  {summary.completedOrders}
                </strong>
              </div>
            </div>
          </article>

          <article className="seller-orders-quick-actions">
            <h2>{t("orders.quickActions")}</h2>
            <button
              type="button"
              className="seller-orders-quick-actions__primary"
              onClick={() =>
                navigate("/seller/products")
              }
            >
              ＋ {t("orders.addNewProduct")}
            </button>
            <button
              type="button"
              disabled={!filteredOrders.length}
              onClick={handleExportOrders}
            >
              ⇩ {t("orders.exportOrders")}
            </button>
          </article>

          <article className="seller-orders-help-card">
            <div>
              <h2>{t("orders.needHelp")}</h2>
              <p>
                {t("orders.helpDescription")}
              </p>
            </div>
            <span aria-hidden="true">♧</span>
            <button type="button">
              {t("orders.contactSupport")}
            </button>
          </article>
        </aside>
      </div>

      {selectedOrder ? (
        <div
          ref={detailsOverlay.overlayRef}
          className="seller-order-details-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOrderDetails();
            }
          }}
        >
          <div
            className="seller-order-details-modal__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            aria-describedby="order-details-description"
          >
            <div className="seller-order-details-modal__header">
              <div>
                <h2 id="order-details-title">
                  {t("orders.orderDetails")}
                </h2>
                <p id="order-details-description">
                  {selectedOrder.orderNumber}
                </p>
              </div>
              <button
                ref={
                  detailsOverlay.initialFocusRef
                }
                type="button"
                onClick={closeOrderDetails}
                aria-label={t(
                  "orders.closeOrderDetails"
                )}
              >
                ×
              </button>
            </div>

            <div className="seller-order-details-modal__items">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.variantId}
                  className="seller-order-details-modal__product"
                >
                  <div className="seller-order-details-modal__visual">
                    <span>
                      {getProductInitial(
                        item.productName
                      )}
                    </span>
                  </div>
                  <div>
                    <strong>
                      {item.productName}
                    </strong>
                    <span>
                      {item.variantName || item.sku}
                    </span>
                    <small>
                      {item.quantity} ×{" "}
                      {formatOrderMoney(
                        item.unitPriceAtPurchase,
                        selectedOrder.currencyCode
                      )}
                    </small>
                  </div>
                  <strong>
                    {formatOrderMoney(
                      item.subtotal,
                      selectedOrder.currencyCode
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div className="seller-order-details-modal__information">
              <div>
                <span>{t("orders.customer")}</span>
                <strong>
                  {selectedOrder.customerName}
                </strong>
              </div>
              {selectedOrder.customerPhone ? (
                <div>
                  <span>{t("orders.phone")}</span>
                  <strong>
                    {selectedOrder.customerPhone}
                  </strong>
                </div>
              ) : null}
              <div>
                <span>{t("orders.orderDate")}</span>
                <strong>
                  {formatOrderDate(
                    selectedOrder.orderDate
                  )}
                </strong>
              </div>
              <div>
                <span>{t("orders.quantity")}</span>
                <strong>
                  {selectedOrder.totalQuantity}
                </strong>
              </div>
              <div>
                <span>
                  {t("orders.statusLabel")}
                </span>
                <strong>
                  {t(
                    ORDER_STATUS_TRANSLATION_KEYS[
                      selectedOrder.status
                    ]
                  )}
                </strong>
              </div>
              <div>
                <span>{t("orders.total")}</span>
                <strong>
                  {formatOrderMoney(
                    selectedOrder.totalAmount,
                    selectedOrder.currencyCode
                  )}
                </strong>
              </div>
              {formatShippingAddress(
                selectedOrder.shippingAddress
              ) ? (
                <div className="seller-order-details-modal__address">
                  <span>
                    {t("orders.shippingAddress")}
                  </span>
                  <strong>
                    {formatShippingAddress(
                      selectedOrder.shippingAddress
                    )}
                  </strong>
                </div>
              ) : null}
            </div>

            {selectedOrder.shipment ? (
              <section className="seller-order-details-modal__shipment">
                <div className="seller-order-details-modal__shipment-header">
                  <h3>{t("orders.shipmentDetails")}</h3>
                  {[
                    ORDER_STATUS.SHIPPED,
                    ORDER_STATUS.DELIVERED,
                  ].includes(selectedOrder.status) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const order = selectedOrder;
                        setSelectedOrder(null);
                        openShipmentDialog(order, "edit");
                      }}
                    >
                      {t("orders.editShipment")}
                    </button>
                  ) : null}
                </div>
                <dl>
                  <div>
                    <dt>{t("orders.courierName")}</dt>
                    <dd>{selectedOrder.shipment.courierName || t("orders.notProvided")}</dd>
                  </div>
                  <div>
                    <dt>{t("orders.trackingNumber")}</dt>
                    <dd>{selectedOrder.shipment.trackingNumber || t("orders.notProvided")}</dd>
                  </div>
                  <div>
                    <dt>{t("orders.shipmentStatus")}</dt>
                    <dd>
                      {t(
                        `orders.status.${selectedOrder.shipment.status.toLowerCase()}`,
                        { defaultValue: selectedOrder.shipment.status }
                      )}
                    </dd>
                  </div>
                  {selectedOrder.shipment.shippedDate ? (
                    <div>
                      <dt>{t("orders.shippedOn")}</dt>
                      <dd>{formatOrderDate(selectedOrder.shipment.shippedDate)}</dd>
                    </div>
                  ) : null}
                  {selectedOrder.shipment.deliveredDate ? (
                    <div>
                      <dt>{t("orders.deliveredOn")}</dt>
                      <dd>{formatOrderDate(selectedOrder.shipment.deliveredDate)}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <div className="seller-order-details-modal__actions">
              <button
                type="button"
                onClick={closeOrderDetails}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shipmentDialog ? (
        <div
          ref={shipmentOverlay.overlayRef}
          className="seller-shipment-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeShipmentDialog();
            }
          }}
        >
          <form
            className="seller-shipment-modal__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shipment-dialog-title"
            onSubmit={handleShipmentSubmit}
          >
            <div className="seller-shipment-modal__header">
              <div>
                <h2 id="shipment-dialog-title">
                  {t(
                    shipmentDialog.mode === "edit"
                      ? "orders.editShipment"
                      : "orders.markAsShipped"
                  )}
                </h2>
                <p>{shipmentDialog.order.orderNumber}</p>
              </div>
              <button
                ref={shipmentOverlay.initialFocusRef}
                type="button"
                disabled={isSavingShipment}
                onClick={closeShipmentDialog}
                aria-label={t("common.close")}
              >
                ×
              </button>
            </div>

            <label>
              <span>{t("orders.courierName")}</span>
              <input
                type="text"
                maxLength={150}
                value={shipmentForm.courierName}
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    courierName: event.target.value,
                  }))
                }
                placeholder={t("orders.courierPlaceholder")}
              />
            </label>

            <label>
              <span>{t("orders.trackingNumber")}</span>
              <input
                type="text"
                maxLength={150}
                value={shipmentForm.trackingNumber}
                onChange={(event) =>
                  setShipmentForm((current) => ({
                    ...current,
                    trackingNumber: event.target.value,
                  }))
                }
                placeholder={t("orders.trackingPlaceholder")}
              />
            </label>

            <p className="seller-shipment-modal__hint">
              {t("orders.shipmentOptionalHint")}
            </p>

            <div className="seller-shipment-modal__actions">
              <button
                type="button"
                disabled={isSavingShipment}
                onClick={closeShipmentDialog}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSavingShipment}
              >
                {isSavingShipment
                  ? t("orders.savingShipment")
                  : t(
                      shipmentDialog.mode === "edit"
                        ? "orders.saveShipment"
                        : "orders.markAsShipped"
                    )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function SellerOrdersPage() {
  return (
    <SellerPageShell>
      <SellerOrdersContent />
    </SellerPageShell>
  );
}

export default SellerOrdersPage;
