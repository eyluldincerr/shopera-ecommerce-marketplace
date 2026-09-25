import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";
import { formatAddressLine, formatLocationLine } from "../../components/address/addressUtils";
import {
  archiveOrder,
  cancelOrder,
  getOrderById,
  getOrderStatusLabel,
  getOrderStatusSteps,
  reorder,
} from "../../services/orderService";
import { clearCheckoutCompletionInProgress } from "../../services/checkoutService.js";
import { getCommerceConflictMessage } from "../../services/commerceErrorMessages.js";
import { formatCurrency } from "../../utils/formatCurrency";

const canCancelOrder = (status) => status === "PENDING";
const canReorder = (status) => ["DELIVERED", "CANCELLED"].includes(status);

function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const formatDate = (dateValue) => {
    if (!dateValue) return t("buyerOrders.dateUnavailable");

    return new Intl.DateTimeFormat(i18n.language === "tr" ? "tr-TR" : "en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateValue));
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadOrder = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setOrder(await getOrderById(orderId, { signal: controller.signal }));
        clearCheckoutCompletionInProgress();
      } catch (error) {
        if (error?.name !== "AbortError") {
          setErrorMessage(
            error?.status === 404
              ? t("buyerOrders.errors.notFound")
              : error?.isNetworkError
                ? t("buyerOrders.errors.network")
                : t("buyerOrders.errors.details")
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadOrder();
    return () => controller.abort();
  }, [orderId, t]);

  const handleCancelOrder = async () => {
    const reason = window.prompt(
      t("buyerOrders.cancelPrompt", {
        order: order.orderNumber || order.orderId,
      }),
      ""
    );

    if (reason === null) return;

    try {
      setIsCancelling(true);
      setMessage("");
      setErrorMessage("");
      const nextOrder = await cancelOrder(order.orderId, reason);
      setOrder(nextOrder);
      setMessage(t("buyerOrders.cancelSuccess"));
    } catch (error) {
      setErrorMessage(
        error?.code === "ORDER_CANCELLATION_NOT_ALLOWED"
          ? t("buyerOrders.errors.cancelNotAllowed")
          : t("buyerOrders.errors.cancel")
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleArchiveOrder = async () => {
    const confirmed = window.confirm(
      t("buyerOrders.archiveConfirm", {
        order: order.orderNumber || order.orderId,
      })
    );

    if (!confirmed) return;

    try {
      setIsArchiving(true);
      setMessage("");
      setErrorMessage("");
      await archiveOrder(order.orderId);
      navigate("/orders", { replace: true, state: { orderArchived: true } });
    } catch (error) {
      setErrorMessage(
        error?.code === "ORDER_ARCHIVE_NOT_ALLOWED"
          ? t("buyerOrders.errors.archiveNotAllowed")
          : error?.isNetworkError
            ? t("buyerOrders.errors.network")
            : t("buyerOrders.errors.archive")
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleReorder = async () => {
    try {
      setIsReordering(true);
      setMessage("");
      setErrorMessage("");
      await reorder(order.orderId);
      navigate("/cart", { state: { reordered: true } });
    } catch (error) {
      const commerceMessage = getCommerceConflictMessage(error, t, "cart");
      setErrorMessage(
        commerceMessage ||
          (error?.code === "ORDER_REORDER_NOT_ALLOWED"
            ? t("buyerOrders.errors.reorderNotAllowed")
            : t("buyerOrders.errors.reorder"))
      );
    } finally {
      setIsReordering(false);
    }
  };

  const address = order?.address;
  const statusSteps = order ? getOrderStatusSteps(order.status) : [];
  const currency = order?.currencyCode || "EUR";

  return (
    <BuyerAccountLayout activePath="/orders" pageClassName="orders-page order-detail-page">
      {isLoading ? (
        <div className="profile-loading-card">{t("buyerOrders.loadingDetails")}</div>
      ) : !order ? (
        <section className="orders-empty">
          <div className="orders-empty__icon" aria-hidden="true">!</div>
          <h2>{t("buyerOrders.notFoundTitle")}</h2>
          <p>{errorMessage || t("buyerOrders.errors.notFound")}</p>
          <Link to="/orders">{t("buyerOrders.backToOrders")}</Link>
        </section>
      ) : (
        <section className="order-detail">
          <header className="order-detail__header">
            <div>
              <Link to="/orders" className="order-detail__back">
                {t("buyerOrders.backToOrders")}
              </Link>
              <h1>{t("buyerOrders.orderTitle", { order: order.orderNumber || order.orderId })}</h1>
              <p>{t("buyerOrders.placedOn", { date: formatDate(order.orderDate) })}</p>
            </div>
            <span className={`order-status order-status--${order.status.toLowerCase()}`}>
              {t(`buyerOrders.statuses.${order.status}`, { defaultValue: order.statusLabel })}
            </span>
          </header>

          {message && <div className="profile-alert success">{message}</div>}
          {errorMessage && <div className="profile-alert error" role="alert">{errorMessage}</div>}

          <section className={`order-timeline ${order.status === "CANCELLED" ? "is-cancelled" : ""}`}>
            {statusSteps.map((step) => (
              <div className={`order-timeline__step is-${step.state}`} key={step.key}>
                <span />
                <strong>{t(`buyerOrders.statuses.${step.key}`, { defaultValue: getOrderStatusLabel(step.key) })}</strong>
              </div>
            ))}
            {order.status === "CANCELLED" && <p>{t("buyerOrders.cancelledNotice")}</p>}
          </section>

          <section className="order-detail-grid">
            <article className="order-detail-card order-detail-card--wide">
              <h2>{t("buyerOrders.orderedItems")}</h2>
              <div className="order-items">
                {order.items.map((item) => (
                  <div className="order-item" key={item.orderItemId || item.variantId}>
                    <div className="order-item__image">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} />
                      ) : (
                        <span>{t("buyerOrders.product")}</span>
                      )}
                    </div>
                    <div>
                      <h3>{item.productName}</h3>
                      {item.variantName && <p>{item.variantName}</p>}
                      {item.sku && <p>{t("buyerOrders.sku", { sku: item.sku })}</p>}
                      <p>{t("buyerOrders.quantity", { count: item.quantity })}</p>
                    </div>
                    <strong>{formatCurrency(item.unitPrice, currency)}</strong>
                    <strong>{formatCurrency(item.subtotal, currency)}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="order-detail-card">
              <h2>{t("buyerOrders.shippingAddress")}</h2>
              <p>{address?.receiverName || t("buyerOrders.recipientUnavailable")}</p>
              <p>{address?.phoneNumber || t("buyerOrders.phoneUnavailable")}</p>
              <p>{address ? formatAddressLine(address) : t("buyerOrders.noAddress")}</p>
              <p>{address ? formatLocationLine(address) : ""}</p>
            </article>

            {order.shipment ? (
              <article className="order-detail-card">
                <h2>{t("buyerOrders.shipmentDetails")}</h2>
                <div className="order-summary-lines">
                  <span>{t("buyerOrders.courier")}</span>
                  <strong>
                    {order.shipment.courierName ||
                      t("buyerOrders.notProvided")}
                  </strong>
                  <span>{t("buyerOrders.trackingNumber")}</span>
                  <strong>
                    {order.shipment.trackingNumber ||
                      t("buyerOrders.notProvided")}
                  </strong>
                  <span>{t("buyerOrders.shipmentStatus")}</span>
                  <strong>
                    {t(
                      `buyerOrders.statuses.${order.shipment.status}`,
                      { defaultValue: order.shipment.status }
                    )}
                  </strong>
                  {order.shipment.shippedDate ? (
                    <>
                      <span>{t("buyerOrders.shippedOn")}</span>
                      <strong>{formatDate(order.shipment.shippedDate)}</strong>
                    </>
                  ) : null}
                  {order.shipment.deliveredDate ? (
                    <>
                      <span>{t("buyerOrders.deliveredOn")}</span>
                      <strong>{formatDate(order.shipment.deliveredDate)}</strong>
                    </>
                  ) : null}
                </div>
              </article>
            ) : null}

            <article className="order-detail-card">
              <h2>{t("buyerOrders.orderSummary")}</h2>
              <div className="order-summary-lines">
                <span>{t("buyerOrders.subtotal")}</span>
                <strong>{formatCurrency(order.subtotal, currency)}</strong>
                <span>{t("buyerOrders.shipping")}</span>
                <strong>
                  {order.shippingCost === 0
                    ? t("buyerOrders.free")
                    : formatCurrency(order.shippingCost, currency)}
                </strong>
                {order.discountAmount > 0 && (
                  <>
                    <span>{t("buyerOrders.discount")}</span>
                    <strong>-{formatCurrency(order.discountAmount, currency)}</strong>
                  </>
                )}
                <span>{t("buyerOrders.total")}</span>
                <strong>{formatCurrency(order.totalAmount, currency)}</strong>
              </div>
            </article>
          </section>

          {order.statusHistory.length > 0 && (
            <section className="order-detail-card order-detail-card--wide">
              <h2>{t("buyerOrders.statusHistory")}</h2>
              <div className="order-summary-lines">
                {order.statusHistory.map((history) => (
                  <span key={history.orderStatusHistoryId || `${history.changedDate}-${history.newStatus}`}>
                    {formatDate(history.changedDate)} - {t(`buyerOrders.statuses.${history.newStatus}`, { defaultValue: getOrderStatusLabel(history.newStatus) })}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="order-detail-actions">
            {canCancelOrder(order.status) && (
              <button
                type="button"
                className="order-detail-actions__cancel"
                disabled={isCancelling}
                onClick={handleCancelOrder}
              >
                {isCancelling ? t("buyerOrders.cancelling") : t("buyerOrders.cancelOrder")}
              </button>
            )}
            {canReorder(order.status) && (
              <button type="button" disabled={isReordering} onClick={handleReorder}>
                {isReordering ? t("buyerOrders.reordering") : t("buyerOrders.reorder")}
              </button>
            )}
            {order.status === "DELIVERED" && (
              <button
                type="button"
                className="order-detail-actions__archive"
                disabled={isArchiving}
                onClick={handleArchiveOrder}
              >
                {isArchiving ? t("buyerOrders.archiving") : t("buyerOrders.archiveLong")}
              </button>
            )}
            <Link to="/">{t("buyerOrders.continueShopping")}</Link>
          </div>
        </section>
      )}
    </BuyerAccountLayout>
  );
}

export default OrderDetailPage;
