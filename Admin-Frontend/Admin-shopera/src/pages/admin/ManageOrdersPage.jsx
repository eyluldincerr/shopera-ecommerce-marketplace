import { useEffect, useMemo, useState } from "react";

import {
  Eye,
  Search,
  ShoppingBag,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import AdminDataTable from "../../components/admin/AdminDataTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import OrderDetailsModal from "../../components/admin/OrderDetailsModal";

import {
  getAdminOrderById,
  getAdminOrdersPage,
} from "../../api/adminOrderService";

const formatOrderCurrency = (amount, currencyCode) => {
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

function ManageOrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);

  const [searchValue, setSearchValue] = useState("");

  const [orderStatusFilter, setOrderStatusFilter] =
    useState("ALL");

  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState("ALL");

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [
    detailLoadingOrderId,
    setDetailLoadingOrderId,
  ] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const loadedOrders = await getAdminOrdersPage({
          page,
          pageSize,
          search: searchValue.trim() || undefined,
          orderStatus: orderStatusFilter === "ALL" ? undefined : orderStatusFilter,
          paymentStatus: paymentStatusFilter === "ALL" || paymentStatusFilter === "NO_PAYMENT"
            ? undefined : paymentStatusFilter,
        });

        setOrders(loadedOrders.items || []);
        setTotalCount(Number(loadedOrders.totalCount || 0));
      } catch (error) {
        console.error(
          "Orders could not be loaded:",
          error
        );

        setErrorMessage(
          "Orders could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [page, pageSize, searchValue, orderStatusFilter, paymentStatusFilter]);

  useEffect(() => {
    const receivedOrderId =
      location.state?.selectedOrderId;

    if (!receivedOrderId || isLoading) {
      return;
    }

    const selectedOrderId = Number(
      String(receivedOrderId).replace(
        /[^0-9]/g,
        ""
      )
    );

    if (!selectedOrderId) {
      navigate(location.pathname, {
        replace: true,
        state: null,
      });

      return;
    }

    let effectIsActive = true;

    const openSelectedOrder = async () => {
      try {
        setDetailLoadingOrderId(
          selectedOrderId
        );

        setErrorMessage("");

        const fullOrder =
          await getAdminOrderById(
            selectedOrderId
          );

        if (effectIsActive) {
          setSelectedOrder(fullOrder);
        }
      } catch (error) {
        console.error(
          "Selected order details could not be loaded:",
          error
        );

        if (effectIsActive) {
          setErrorMessage(
            `Order #${selectedOrderId} details could not be loaded.`
          );
        }
      } finally {
        if (effectIsActive) {
          setDetailLoadingOrderId(null);
        }

        navigate(location.pathname, {
          replace: true,
          state: null,
        });
      }
    };

    openSelectedOrder();

    return () => {
      effectIsActive = false;
    };
  }, [
    isLoading,
    location.pathname,
    location.state,
    navigate,
  ]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchValue
      .trim()
      .toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearch === "" ||
        String(order.orderId).includes(
          normalizedSearch
        ) ||
        order.buyerName
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        order.buyerEmail
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        String(order.buyerUserId).includes(
          normalizedSearch
        );

      const matchesOrderStatus =
        orderStatusFilter === "ALL" ||
        order.orderStatus === orderStatusFilter;

      const matchesPaymentStatus =
        paymentStatusFilter === "ALL" ||
        order.paymentStatus ===
          paymentStatusFilter;

      return (
        matchesSearch &&
        matchesOrderStatus &&
        matchesPaymentStatus
      );
    });
  }, [
    orders,
    searchValue,
    orderStatusFilter,
    paymentStatusFilter,
  ]);

  const orderCounts = useMemo(() => {
    return {
      total: orders.length,

      pending: orders.filter(
        (order) =>
          order.orderStatus === "PENDING"
      ).length,

      processing: orders.filter(
        (order) =>
          order.orderStatus === "CONFIRMED" ||
          order.orderStatus === "PROCESSING"
      ).length,

      shipped: orders.filter(
        (order) =>
          order.orderStatus === "SHIPPED"
      ).length,

      completed: orders.filter(
        (order) =>
          order.orderStatus === "DELIVERED"
      ).length,

      cancelledOrReturned: orders.filter(
        (order) =>
          order.orderStatus === "CANCELLED" ||
          order.orderStatus === "RETURNED"
      ).length,
    };
  }, [orders]);

  const formatOrderDate = (dateValue) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  };

  const openOrderDetails = async (order) => {
    try {
      setDetailLoadingOrderId(
        order.orderId
      );

      setErrorMessage("");

      const fullOrder =
        await getAdminOrderById(
          order.orderId
        );

      setSelectedOrder(fullOrder);
    } catch (error) {
      console.error(
        "Order details could not be loaded:",
        error
      );

      setErrorMessage(
        "Order details could not be loaded."
      );
    } finally {
      setDetailLoadingOrderId(null);
    }
  };

  const resetFilters = () => {
    setPage(1);
    setSearchValue("");
    setOrderStatusFilter("ALL");
    setPaymentStatusFilter("ALL");
  };

  const columns = [
    {
      key: "order",
      header: "Order",

      render: (order) => (
        <div className="admin-order-table-id">
          <div>
            <ShoppingBag size={18} />
          </div>

          <section>
            <strong>
              {order.orderNumber ||
                `Order #${order.orderId}`}
            </strong>

            <span>
              Customer ID: #{order.buyerUserId}
            </span>
          </section>
        </div>
      ),
    },
    {
      key: "storeName",
      header: "Brand Store",
    },
    {
      key: "customer",
      header: "Customer",

      render: (order) => (
        <div className="admin-order-customer-cell">
          <strong>
            {order.buyerName}
          </strong>

          <span>
            {order.buyerEmail}
          </span>
        </div>
      ),
    },
    {
      key: "orderDate",
      header: "Order Date",

      render: (order) =>
        formatOrderDate(
          order.orderDate
        ),
    },
    {
      key: "itemCount",
      header: "Items",
    },
    {
      key: "totalAmount",
      header: "Total",

      render: (order) => (
        <strong className="admin-order-total-cell">
          {formatOrderCurrency(
            order.totalAmount,
            order.currencyCode
          )}
        </strong>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment",

      render: (order) => (
        <AdminStatusBadge
          status={order.paymentStatus}
        />
      ),
    },
    {
      key: "shipmentStatus",
      header: "Shipment",

      render: (order) => (
        <AdminStatusBadge
          status={order.shipmentStatus}
        />
      ),
    },
    {
      key: "orderStatus",
      header: "Order Status",

      render: (order) => (
        <AdminStatusBadge
          status={order.orderStatus}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className:
        "admin-table-actions-column",

      render: (order) => (
        <button
          type="button"
          className="admin-table-view-button"
          onClick={() =>
            openOrderDetails(order)
          }
          disabled={
            detailLoadingOrderId ===
            order.orderId
          }
        >
          <Eye size={16} />

          {detailLoadingOrderId ===
          order.orderId
            ? "Loading..."
            : "View"}
        </button>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Order Oversight"
        description="View order items, payments, shipments, addresses and order status history."
      />

      <section className="admin-order-overview-grid">
        <article className="admin-order-overview-card">
          <span>Total Orders</span>
          <strong>
            {orderCounts.total}
          </strong>
        </article>

        <article className="admin-order-overview-card">
          <span>Pending</span>
          <strong>
            {orderCounts.pending}
          </strong>
        </article>

        <article className="admin-order-overview-card">
          <span>Processing</span>
          <strong>
            {orderCounts.processing}
          </strong>
        </article>

        <article className="admin-order-overview-card">
          <span>Shipped</span>
          <strong>
            {orderCounts.shipped}
          </strong>
        </article>

        <article className="admin-order-overview-card">
          <span>Delivered</span>
          <strong>
            {orderCounts.completed}
          </strong>
        </article>

        <article className="admin-order-overview-card">
          <span>
            Cancelled / Returned
          </span>

          <strong>
            {
              orderCounts
                .cancelledOrReturned
            }
          </strong>
        </article>
      </section>

      {errorMessage && (
        <div className="admin-page-notice admin-page-notice-error">
          {errorMessage}
        </div>
      )}

      <section className="admin-orders-panel">
        <div className="admin-orders-toolbar">
          <div className="admin-users-search">
            <Search size={18} />

            <input
              type="search"
              value={searchValue}
              onChange={(event) => { setSearchValue(event.target.value); setPage(1); }}
              placeholder="Search order, customer, email or user ID..."
            />
          </div>

          <select
            value={orderStatusFilter}
            onChange={(event) => { setOrderStatusFilter(event.target.value); setPage(1); }}
            aria-label="Filter orders by order status"
          >
            <option value="ALL">
              All order statuses
            </option>
            <option value="PENDING">
              PENDING
            </option>
            <option value="CONFIRMED">
              CONFIRMED
            </option>
            <option value="PROCESSING">
              PROCESSING
            </option>
            <option value="SHIPPED">
              SHIPPED
            </option>
            <option value="DELIVERED">
              DELIVERED
            </option>
            <option value="CANCELLED">
              CANCELLED
            </option>
            <option value="RETURNED">
              RETURNED
            </option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(event) => { setPaymentStatusFilter(event.target.value); setPage(1); }}
            aria-label="Filter orders by payment status"
          >
            <option value="ALL">
              All payment statuses
            </option>
            <option value="PENDING">
              PENDING
            </option>
            <option value="AUTHORIZED">
              AUTHORIZED
            </option>
            <option value="PAID">
              PAID
            </option>
            <option value="FAILED">
              FAILED
            </option>
            <option value="REFUNDED">
              REFUNDED
            </option>
            <option value="PARTIALLY_REFUNDED">
              PARTIALLY REFUNDED
            </option>
            <option value="CANCELLED">
              CANCELLED
            </option>
          </select>

          <button
            type="button"
            className="admin-reset-filters-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        <div className="admin-users-results-heading">
          <div>
            <ShoppingBag size={18} />

            <strong>
              {totalCount} orders found
            </strong>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-page-loading">
            Loading orders...
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredOrders}
            rowKey="orderId"
            emptyMessage="No orders match the selected filters."
          />
        )}
        <AdminPagination page={page} pageSize={pageSize} totalCount={totalCount} isLoading={isLoading} itemLabel="orders" onPageChange={setPage} />
      </section>

      <OrderDetailsModal
        isOpen={Boolean(selectedOrder)}
        order={selectedOrder}
        onClose={() =>
          setSelectedOrder(null)
        }
      />
    </AdminPageLayout>
  );
}

export default ManageOrdersPage;
