import {
  CalendarDays,
  CreditCard,
  History,
  MapPin,
  Package,
  ShoppingBag,
  Tag,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import AdminStatusBadge from "./AdminStatusBadge";

const formatCurrency = (amount, currencyCode) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toFixed(2)} ${
      currencyCode || ""
    }`.trim();
  }
};

const formatEnumLabel = (value) => {
  if (!value) {
    return "Not available";
  }

  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

const formatDateTime = (dateValue) => {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAddress = (address) => {
  if (!address) {
    return "No address available";
  }

  return [
    address.streetAddress,
    address.city,
    address.stateProvince,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
};

function OrderDetailsModal({
  isOpen,
  order,
  onClose,
}) {
  if (!isOpen || !order) {
    return null;
  }

  const payments = Array.isArray(order.payments)
    ? order.payments
    : [];

  const reversedHistory = [
    ...(order.statusHistory || []),
  ].reverse();

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="admin-order-details-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-order-details-title"
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div className="admin-order-details-header">
          <div className="admin-order-details-icon">
            <ShoppingBag size={28} />
          </div>

          <div>
            <h2 id="admin-order-details-title">
              {order.orderNumber ||
                `Order #${order.orderId}`}
            </h2>

            <p>
              Placed on{" "}
              {formatDateTime(order.orderDate)}
            </p>

            <AdminStatusBadge
              status={order.orderStatus}
            />
          </div>
        </div>

        <section className="admin-order-summary-grid">
          <article className="admin-order-summary-card">
            <UserRound size={19} />

            <div>
              <span>Customer</span>
              <strong>{order.buyerName}</strong>
            </div>
          </article>

          <article className="admin-order-summary-card">
            <Package size={19} />

            <div>
              <span>Total Items</span>
              <strong>{order.itemCount}</strong>
            </div>
          </article>

          <article className="admin-order-summary-card">
            <CreditCard size={19} />

            <div>
              <span>Payment Status</span>

              <AdminStatusBadge
                status={order.paymentStatus}
              />
            </div>
          </article>

          <article className="admin-order-summary-card">
            <Truck size={19} />

            <div>
              <span>Shipment Status</span>

              <AdminStatusBadge
                status={order.shipmentStatus}
              />
            </div>
          </article>
        </section>

        <section className="admin-order-customer-section">
          <div className="admin-order-section-heading">
            <div>
              <UserRound size={18} />
              <h3>Customer Information</h3>
            </div>
          </div>

          <div className="admin-order-information-grid">
            <div className="admin-order-information-item">
              <UserRound size={17} />

              <div>
                <span>Customer Name</span>
                <strong>{order.buyerName}</strong>
              </div>
            </div>

            <div className="admin-order-information-item">
              <Tag size={17} />

              <div>
                <span>Customer User ID</span>
                <strong>
                  #{order.buyerUserId}
                </strong>
              </div>
            </div>

            <div className="admin-order-information-item">
              <CalendarDays size={17} />

              <div>
                <span>Order Date</span>

                <strong>
                  {formatDateTime(order.orderDate)}
                </strong>
              </div>
            </div>

            <div className="admin-order-information-item">
              <CreditCard size={17} />

              <div>
                <span>Customer Email</span>
                <strong>{order.buyerEmail}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-order-items-section">
          <div className="admin-order-section-heading">
            <div>
              <Package size={18} />
              <h3>Order Items</h3>
            </div>

            <span>
              {order.items?.length || 0} records
            </span>
          </div>

          <div className="admin-order-items-table-wrapper">
            <table className="admin-order-items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Store</th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>

              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.orderItemId}>
                    <td>
                      {item.productNameAtPurchase ||
                        "Unknown product"}
                    </td>

                    <td>
                      {order.storeName ||
                        "Unknown store"}
                    </td>

                    <td>
                      {item.variantNameAtPurchase ||
                        "Default"}
                    </td>

                    <td>
                      {item.skuAtPurchase || "—"}
                    </td>

                    <td>{item.quantity}</td>

                    <td>
                      {formatCurrency(
                        item.unitPriceAtPurchase,
                        order.currencyCode
                      )}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          item.lineTotal,
                          order.currencyCode
                        )}
                      </strong>
                    </td>
                  </tr>
                ))}

                {(!order.items ||
                  order.items.length === 0) && (
                  <tr>
                    <td colSpan={7}>
                      No order items are available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-order-totals-section">
          <div className="admin-order-total-row">
            <span>Subtotal</span>

            <strong>
              {formatCurrency(
                order.subtotalAmount,
                order.currencyCode
              )}
            </strong>
          </div>

          <div className="admin-order-total-row">
            <span>
              Discount
              {order.coupon
                ? ` (${order.coupon.couponCode})`
                : ""}
            </span>

            <strong>
              −
              {formatCurrency(
                order.discountAmount,
                order.currencyCode
              )}
            </strong>
          </div>

          <div className="admin-order-total-row">
            <span>Shipping Cost</span>

            <strong>
              {formatCurrency(
                order.shippingAmount,
                order.currencyCode
              )}
            </strong>
          </div>

          <div className="admin-order-total-row admin-order-grand-total">
            <span>Total Amount</span>

            <strong>
              {formatCurrency(
                order.totalAmount,
                order.currencyCode
              )}
            </strong>
          </div>
        </section>

        <section className="admin-order-addresses-section">
          <div className="admin-order-section-heading">
            <div>
              <MapPin size={18} />
              <h3>Order Addresses</h3>
            </div>
          </div>

          <div className="admin-order-address-grid">
            <article>
              <strong>Shipping Address</strong>

              <p>
                {formatAddress(
                  order.shippingAddress
                )}
              </p>
            </article>

            <article>
              <strong>Billing Address</strong>

              <p>
                {formatAddress(
                  order.billingAddress
                )}
              </p>
            </article>
          </div>
        </section>

        <section className="admin-order-payments-section">
          <div className="admin-order-section-heading">
            <div>
              <CreditCard size={18} />
              <h3>Payment Attempts</h3>
            </div>

            <span>
              {payments.length} records
            </span>
          </div>

          <div className="admin-order-record-list">
            {payments.map((payment) => (
              <article
                className="admin-order-record-card"
                key={payment.paymentId}
              >
                <div>
                  <CreditCard size={18} />

                  <div>
                    <strong>
                      {formatEnumLabel(
                        payment.paymentMethod
                      )}
                    </strong>

                    <span>
                      {payment.transactionReference ||
                        "No transaction reference"}
                    </span>
                  </div>
                </div>

                <div className="admin-order-record-meta">
                  <strong>
                    {formatCurrency(
                      payment.amount,
                      order.currencyCode
                    )}
                  </strong>

                  <span>
                    {formatDateTime(
                      payment.paymentDate ||
                        payment.createdDate
                    )}
                  </span>

                  <AdminStatusBadge
                    status={payment.paymentStatus}
                  />
                </div>
              </article>
            ))}

            {payments.length === 0 && (
              <p className="admin-order-empty-message">
                No payment attempts are available.
              </p>
            )}
          </div>
        </section>

        <section className="admin-order-shipments-section">
          <div className="admin-order-section-heading">
            <div>
              <Truck size={18} />
              <h3>Shipments</h3>
            </div>

            <span>
              {order.shipments?.length || 0} records
            </span>
          </div>

          <div className="admin-order-record-list">
            {order.shipments?.map((shipment) => (
              <article
                className="admin-order-record-card"
                key={shipment.shipmentId}
              >
                <div>
                  <Truck size={18} />

                  <div>
                    <strong>
                      {shipment.courierName ||
                        "Courier not assigned"}
                    </strong>

                    <span>
                      {shipment.trackingNumber ||
                        "Tracking number not available"}
                    </span>
                  </div>
                </div>

                <div className="admin-order-record-meta">
                  <strong>
                    {formatCurrency(
                      shipment.shippingCost,
                      order.currencyCode
                    )}
                  </strong>

                  <span>
                    Shipped:{" "}
                    {formatDateTime(
                      shipment.shippedDate
                    )}
                  </span>

                  <span>
                    Delivered:{" "}
                    {formatDateTime(
                      shipment.deliveredDate
                    )}
                  </span>

                  <AdminStatusBadge
                    status={shipment.shipmentStatus}
                  />
                </div>
              </article>
            ))}

            {(!order.shipments ||
              order.shipments.length === 0) && (
              <p className="admin-order-empty-message">
                No shipment records are available.
              </p>
            )}
          </div>
        </section>

        <section className="admin-order-history-section">
          <div className="admin-order-section-heading">
            <div>
              <History size={18} />
              <h3>Order Status History</h3>
            </div>

            <span>
              {reversedHistory.length} records
            </span>
          </div>

          <div className="admin-order-history-list">
            {reversedHistory.map(
              (historyRecord) => (
                <article
                  className="admin-order-history-item"
                  key={
                    historyRecord.orderStatusHistoryId
                  }
                >
                  <div className="admin-order-history-marker" />

                  <div>
                    <div className="admin-order-history-status">
                      {historyRecord.oldStatus && (
                        <AdminStatusBadge
                          status={
                            historyRecord.oldStatus
                          }
                        />
                      )}

                      <span>→</span>

                      <AdminStatusBadge
                        status={
                          historyRecord.newStatus
                        }
                      />
                    </div>

                    <p>
                      {historyRecord.changeNote ||
                        "No change note provided."}
                    </p>

                    <span>
                      {formatDateTime(
                        historyRecord.changedDate
                      )}
                      {" · "}
                      {historyRecord.changedByUserId
                        ? `User #${historyRecord.changedByUserId}`
                        : "System"}
                    </span>
                  </div>
                </article>
              )
            )}

            {reversedHistory.length === 0 && (
              <p className="admin-order-empty-message">
                No order status history is available.
              </p>
            )}
          </div>
        </section>

        <p className="admin-order-final-status-message">
          Order lifecycle and fulfilment changes are managed
          by the owning Brand Store.
        </p>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
