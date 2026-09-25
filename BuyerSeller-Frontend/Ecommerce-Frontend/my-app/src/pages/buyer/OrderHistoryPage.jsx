import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";
import {
  archiveOrder,
  cancelOrder,
  getMyOrders,
  getOrderStatusLabel,
} from "../../services/orderService";
import { formatCurrency } from "../../utils/formatCurrency";

const orderFilters = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

const canCancelOrder = (status) => status === "PENDING";

function OrderHistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [archivingOrderId, setArchivingOrderId] = useState(null);

  const formatDate = (dateValue) => {
    if (!dateValue) return t("buyerOrders.dateUnavailable");

    return new Intl.DateTimeFormat(i18n.language === "tr" ? "tr-TR" : "en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateValue));
  };

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setOrders(await getMyOrders());
    } catch (error) {
      setErrorMessage(
        error?.isNetworkError
          ? t("buyerOrders.errors.network")
          : t("buyerOrders.errors.load")
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "ALL") return orders;
    return orders.filter((order) => order.status === activeFilter);
  }, [activeFilter, orders]);

  const handleArchiveOrder = async (order) => {
    const confirmed = window.confirm(
      t("buyerOrders.archiveConfirm", {
        order: order.orderNumber || order.orderId,
      })
    );

    if (!confirmed) return;

    try {
      setArchivingOrderId(order.orderId);
      setMessage("");
      setErrorMessage("");
      await archiveOrder(order.orderId);
      setOrders((currentOrders) =>
        currentOrders.filter((currentOrder) => currentOrder.orderId !== order.orderId)
      );
      setMessage(t("buyerOrders.archiveSuccess"));
    } catch (error) {
      setErrorMessage(
        error?.code === "ORDER_ARCHIVE_NOT_ALLOWED"
          ? t("buyerOrders.errors.archiveNotAllowed")
          : error?.isNetworkError
            ? t("buyerOrders.errors.network")
            : t("buyerOrders.errors.archive")
      );
    } finally {
      setArchivingOrderId(null);
    }
  };

  const handleCancelOrder = async (order) => {
    const reason = window.prompt(
      t("buyerOrders.cancelPrompt", {
        order: order.orderNumber || order.orderId,
      }),
      ""
    );

    if (reason === null) return;

    try {
      setCancellingOrderId(order.orderId);
      setMessage("");
      setErrorMessage("");
      await cancelOrder(order.orderId, reason);
      await loadOrders();
      setMessage(t("buyerOrders.cancelSuccess"));
    } catch (error) {
      setErrorMessage(
        error?.code === "ORDER_CANCELLATION_NOT_ALLOWED"
          ? t("buyerOrders.errors.cancelNotAllowed")
          : error?.isNetworkError
            ? t("buyerOrders.errors.network")
            : t("buyerOrders.errors.cancel")
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <BuyerAccountLayout activePath="/orders" pageClassName="orders-page">
      <section className="orders-content">
        <div className="orders-header">
          <div>
            <h1>{t("buyerOrders.title")}</h1>
            <p>{t("buyerOrders.description")}</p>
          </div>
          <Link to="/" className="orders-primary-link">
            {t("buyerOrders.continueShopping")}
          </Link>
        </div>

        {message && <div className="profile-alert success">{message}</div>}
        {errorMessage && <div className="profile-alert error" role="alert">{errorMessage}</div>}

        <div className="orders-filters" aria-label={t("buyerOrders.filtersLabel")}>
          {orderFilters.map((filter) => (
            <button
              type="button"
              className={activeFilter === filter ? "is-active" : ""}
              key={filter}
              onClick={() => setActiveFilter(filter)}
            >
              {t(`buyerOrders.filters.${filter}`)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="profile-loading-card">{t("buyerOrders.loading")}</div>
        ) : orders.length === 0 ? (
          <section className="orders-empty">
            <div className="orders-empty__icon" aria-hidden="true">O</div>
            <h2>{t("buyerOrders.emptyTitle")}</h2>
            <p>{t("buyerOrders.emptyDescription")}</p>
            <Link to="/">{t("buyerOrders.continueShopping")}</Link>
          </section>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty orders-empty--small">
            {t("buyerOrders.noFilterResults")}
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <article className="order-row" key={order.orderId}>
                <div className="order-row__main">
                  <span className="order-row__label">{t("buyerOrders.order")}</span>
                  <strong>{order.orderNumber || `#${order.orderId}`}</strong>
                  <small>{formatDate(order.orderDate)}</small>
                </div>

                <div className="order-row__meta">
                  <span>{t("buyerOrders.itemCount", { count: order.totalQuantity })}</span>
                  <strong>{formatCurrency(order.totalAmount, order.currencyCode)}</strong>
                </div>

                <div className="order-row__status">
                  <span className={`order-status order-status--${order.status.toLowerCase()}`}>
                    {t(`buyerOrders.statuses.${order.status}`, { defaultValue: getOrderStatusLabel(order.status) })}
                  </span>
                </div>

                <div className="order-row__actions">
                  <button type="button" onClick={() => navigate(`/orders/${order.orderId}`)}>
                    {t("buyerOrders.viewDetails")}
                  </button>
                  {canCancelOrder(order.status) && (
                    <button
                      type="button"
                      className="order-row__cancel"
                      disabled={cancellingOrderId === order.orderId}
                      onClick={() => handleCancelOrder(order)}
                    >
                      {cancellingOrderId === order.orderId
                        ? t("buyerOrders.cancelling")
                        : t("buyerOrders.cancel")}
                    </button>
                  )}
                  {order.status === "DELIVERED" && (
                    <button
                      type="button"
                      className="order-row__archive"
                      disabled={archivingOrderId === order.orderId}
                      onClick={() => handleArchiveOrder(order)}
                    >
                      {archivingOrderId === order.orderId
                        ? t("buyerOrders.archiving")
                        : t("buyerOrders.archive")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </BuyerAccountLayout>
  );
}

export default OrderHistoryPage;
