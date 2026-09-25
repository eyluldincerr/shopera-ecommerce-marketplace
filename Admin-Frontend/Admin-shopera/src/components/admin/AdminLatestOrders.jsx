import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminStatusBadge from "./AdminStatusBadge";
import AdminModalPortal from "./AdminModalPortal";
import OrderDetailsModal from "./OrderDetailsModal";
import { getAdminOrderById } from "../../api/adminOrderService";

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

const getNumericOrderId = (order) => {
  const rawOrderId =
    order.orderId ??
    order.id ??
    "";

  const numericOrderId = Number(
    String(rawOrderId).replace(
      /[^0-9]/g,
      ""
    )
  );

  return numericOrderId || null;
};

const getOrderDisplayId = (order) => {
  const orderId =
    getNumericOrderId(order);

  return orderId
    ? `#${orderId}`
    : String(
        order.id ||
          "Unavailable"
      );
};

const getStoreNames = (order) => {
  if (
    Array.isArray(
      order.storeNames
    ) &&
    order.storeNames.length > 0
  ) {
    return [
      ...new Set(
        order.storeNames.filter(
          Boolean
        )
      ),
    ].join(", ");
  }

  if (
    Array.isArray(order.stores) &&
    order.stores.length > 0
  ) {
    const storeNames =
      order.stores
        .map(
          (store) =>
            store?.storeName ||
            store?.name
        )
        .filter(Boolean);

    if (storeNames.length > 0) {
      return [
        ...new Set(storeNames),
      ].join(", ");
    }
  }

  return (
    order.storeName ||
    order.sellerStoreName ||
    /*
      Temporary compatibility with the old
      dashboard response.
    */
    order.seller ||
    "Store unavailable"
  );
};

const getOrderAmount = (order) => {
  const amount =
    order.totalAmount ??
    order.amount;

  const numericAmount =
    Number(amount);

  if (
    amount !== null &&
    amount !== undefined &&
    amount !== "" &&
    !Number.isNaN(numericAmount)
  ) {
    return formatCurrency(
      numericAmount,
      order.currencyCode
    );
  }

  return amount || "Not available";
};

const getOrderStatus = (order) => {
  return (
    order.orderStatus ||
    order.status ||
    "UNKNOWN"
  );
};

const getPaymentStatus = (order) => {
  return (
    order.paymentStatus ||
    null
  );
};

const formatOrderDate = (order) => {
  const dateValue =
    order.orderDate ||
    order.rawDate;

  if (dateValue) {
    const date =
      new Date(dateValue);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return {
        date: date.toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          }
        ),

        time: date.toLocaleTimeString(
          "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
      };
    }
  }

  return {
    date:
      order.date ||
      "Not available",

    time:
      order.time ||
      "",
  };
};

function AdminLatestOrders({
  orders = [],
}) {
  const navigate =
    useNavigate();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailError, setDetailError] = useState("");

  const showPaymentColumn =
    useMemo(() => {
      return orders.some(
        (order) =>
          Boolean(
            getPaymentStatus(
              order
            )
          )
      );
    }, [orders]);

  const openOrdersPage = () => {
    navigate("/admin/orders");
  };

  const openOrder = async (order) => {
    const orderId =
      getNumericOrderId(order);

    if (!orderId) {
      openOrdersPage();
      return;
    }

    try {
      setDetailLoadingId(orderId);
      setDetailError("");
      setSelectedOrder(await getAdminOrderById(orderId));
    } catch (error) {
      setDetailError(error.message || "Order details could not be loaded.");
    } finally {
      setDetailLoadingId(null);
    }
  };

  return (
    <article className="admin-panel">
      <div className="admin-panel-header admin-widget-header">
        <div className="admin-widget-header-copy">
          <h3>Orders Needing Attention</h3>

          <small>
            Orders with their current store,
            payment and order information.
          </small>
        </div>

        <div className="admin-widget-header-actions">
          <button
            type="button"
            onClick={openOrdersPage}
          >
            View All Orders
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper">
        {detailError && <p className="admin-widget-notice error" role="alert">{detailError}</p>}
        {orders.length > 0 ? (
          <>
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Store(s)</th>
                <th>Attention reason</th>
                <th>Amount</th>

                {showPaymentColumn && (
                  <th>Payment</th>
                )}

                <th>Order Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {orders.map(
                (
                  order,
                  index
                ) => {
                  const orderId =
                    getNumericOrderId(
                      order
                    );

                  const orderDate =
                    formatOrderDate(
                      order
                    );

                  const rowKey =
                    orderId ||
                    order.id ||
                    `latest-order-${index}`;

                  return (
                    <tr
                      key={rowKey}
                      className="admin-order-row"
                      tabIndex={0}
                      role="button"
                      aria-label={`Open order ${getOrderDisplayId(
                        order
                      )}`}
                      aria-busy={detailLoadingId === orderId}
                      onClick={() =>
                        openOrder(order)
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            "Enter" ||
                          event.key ===
                            " "
                        ) {
                          event.preventDefault();

                          openOrder(
                            order
                          );
                        }
                      }}
                    >
                      <td>
                        <strong>
                          Order{" "}
                          {getOrderDisplayId(
                            order
                          )}
                        </strong>
                      </td>

                      <td>
                        {getStoreNames(
                          order
                        )}
                      </td>

                      <td>
                        {String(order.attentionReason || "Requires review").replaceAll("_", " ")}
                      </td>

                      <td>
                        {getOrderAmount(
                          order
                        )}
                      </td>

                      {showPaymentColumn && (
                        <td>
                          {getPaymentStatus(
                            order
                          ) ? (
                            <AdminStatusBadge
                              status={getPaymentStatus(
                                order
                              )}
                            />
                          ) : (
                            <span>
                              Not available
                            </span>
                          )}
                        </td>
                      )}

                      <td>
                        <AdminStatusBadge
                          status={getOrderStatus(
                            order
                          )}
                        />
                      </td>

                      <td>
                        {orderDate.date}

                        {orderDate.time && (
                          <span className="admin-order-time">
                            {
                              orderDate.time
                            }
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
          </>
        ) : (
          <div className="admin-dashboard-empty">
            No orders currently need attention.
          </div>
        )}
      </div>
      <AdminModalPortal isOpen={Boolean(selectedOrder)}>
        <OrderDetailsModal isOpen={Boolean(selectedOrder)} order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      </AdminModalPortal>
    </article>
  );
}

export default AdminLatestOrders;
