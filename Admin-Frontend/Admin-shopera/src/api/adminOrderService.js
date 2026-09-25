import {
  operationalOrders,
  operationalOrderAddresses,
  operationalOrderItems,
  operationalOrderStatusHistory,
  operationalPayments,
  operationalShipments,
} from "../data/operationalOrderStore";
import { requireAuthenticatedAdmin } from "../auth/authSession";
import { api } from "./apiClient.js";
import { getAdminPage } from "./adminPageService.js";

import {
  operationalProducts,
  operationalProductVariants,
} from "../data/operationalProductStore";
import {
  getAdminAccountRecordById,
} from "./adminAccountService";

import {
  getAdminCouponRecordById,
} from "./adminCouponService";

import { getAdminStoreById } from "./adminStoreService";
import { getOperationalProductById } from "./adminProductService";

const adminOrders = operationalOrders;
const adminOrderHistory = operationalOrderStatusHistory;
const adminPayments = operationalPayments;
const adminShipments = operationalShipments;

const cloneValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, nestedValue]) => [
          key,
          cloneValue(nestedValue),
        ]
      )
    );
  }

  return value;
};

const getDateValue = (dateValue) => {
  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
};

const getBuyer = async (
  buyerUserId
) => {
  try {
    const account =
      await getAdminAccountRecordById(
        buyerUserId
      );

    if (account.role !== "BUYER") {
      return null;
    }

    return account;
  } catch {
    return null;
  }
};

const getCoupon = async (
  couponId
) => {
  if (
    couponId === null ||
    couponId === undefined
  ) {
    return null;
  }

  return Promise.resolve(
    getAdminCouponRecordById(
      couponId
    )
  );
};

const getOrderItemRecords = (
  orderId
) => {
  const numericOrderId =
    Number(orderId);

  return operationalOrderItems
    .filter(
      (item) =>
        item.orderId ===
        numericOrderId
    )
    .map((item) => {
      const variant =
        operationalProductVariants.find(
          (currentVariant) =>
            currentVariant.variantId ===
            item.variantId
        );

      const product = variant
        ? operationalProducts.find(
            (currentProduct) =>
              currentProduct.productId ===
              variant.productId
          )
        : null;

      return {
        ...cloneValue(item),

        variant:
          cloneValue(variant),

        product:
          cloneValue(product),

        lineTotal: Number(
          (
            Number(item.quantity) *
            Number(
              item.unitPriceAtPurchase
            )
          ).toFixed(2)
        ),
      };
    });
};

const getDetailedOrderItems =
  async (orderId) => {
    const itemRecords =
      getOrderItemRecords(orderId);

    return Promise.all(
      itemRecords.map(
        async (item) => {
          if (!item.product) {
            return item;
          }

          try {
            const productDetails =
              await getOperationalProductById(
                item.product.productId
              );

            return {
              ...item,

              product:
                productDetails,

              /*
                These relations are calculated from:

                ORDER_ITEM.VariantID
                → PRODUCT_VARIANT.ProductID
                → PRODUCT.StoreID
                → STORE.SellerUserID
              */
              store:
                productDetails.store ||
                null,

              seller:
                productDetails.seller ||
                null,
            };
          } catch {
            return item;
          }
        }
      )
    );
  };

const getOrderPayments = (
  orderId
) => {
  const numericOrderId =
    Number(orderId);

  return adminPayments
    .filter(
      (payment) =>
        payment.orderId ===
        numericOrderId
    )
    .sort(
      (
        firstPayment,
        secondPayment
      ) => {
        const firstDate =
          firstPayment.createdDate ||
          firstPayment.paymentDate;

        const secondDate =
          secondPayment.createdDate ||
          secondPayment.paymentDate;

        const dateDifference =
          getDateValue(firstDate) -
          getDateValue(secondDate);

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return (
          Number(
            firstPayment.paymentId
          ) -
          Number(
            secondPayment.paymentId
          )
        );
      }
    )
    .map(cloneValue);
};

const getOrderShipments = (
  orderId
) => {
  const numericOrderId =
    Number(orderId);

  return adminShipments
    .filter(
      (shipment) =>
        shipment.orderId ===
        numericOrderId
    )
    .sort(
      (
        firstShipment,
        secondShipment
      ) =>
        Number(
          firstShipment.shipmentId
        ) -
        Number(
          secondShipment.shipmentId
        )
    )
    .map(cloneValue);
};

const getOrderAddresses = (
  orderId
) => {
  const numericOrderId =
    Number(orderId);

  return operationalOrderAddresses
    .filter(
      (address) =>
        address.orderId ===
        numericOrderId
    )
    .map(cloneValue);
};

const getOrderHistory = (
  orderId
) => {
  const numericOrderId =
    Number(orderId);

  return adminOrderHistory
    .filter(
      (historyRecord) =>
        historyRecord.orderId ===
        numericOrderId
    )
    .sort(
      (
        firstRecord,
        secondRecord
      ) =>
        getDateValue(
          firstRecord.changedDate
        ) -
        getDateValue(
          secondRecord.changedDate
        )
    )
    .map(cloneValue);
};

const calculateOrderTotals =
  async (order) => {
    return {
      subtotal:
        Number(order.subtotalAmount),
      discountAmount:
        Number(order.discountAmount),
      shippingCost:
        Number(order.shippingAmount),
      totalAmount:
        Number(order.totalAmount),
    };
  };

const createOrderSummary =
  async (order) => {
    const [
      buyer,
      totals,
      store,
    ] = await Promise.all([
      getBuyer(
        order.buyerUserId
      ),

      calculateOrderTotals(
        order
      ),

      getAdminStoreById(
        order.storeId
      ).catch(() => null),
    ]);

    const items =
      getOrderItemRecords(
        order.orderId
      );

    const payments =
      getOrderPayments(
        order.orderId
      );

    const shipments =
      getOrderShipments(
        order.orderId
      );

    const latestPayment =
      payments.length > 0
        ? payments[
            payments.length - 1
          ]
        : null;

    const latestShipment =
      shipments.length > 0
        ? shipments[
            shipments.length - 1
          ]
        : null;

    return {
      ...cloneValue(order),

      buyerName:
        buyer?.fullName ||
        `User #${order.buyerUserId}`,

      buyerEmail:
        buyer?.email ||
        "Unknown email",

      store:
        cloneValue(store),

      storeName:
        store?.storeName ||
        `Store #${order.storeId}`,

      itemCount:
        items.reduce(
          (total, item) =>
            total +
            Number(
              item.quantity
            ),
          0
        ),

      /*
        NO_PAYMENT and NO_SHIPMENT are frontend-only
        display labels. They are never persisted.
      */
      paymentStatus:
        latestPayment
          ?.paymentStatus ||
        "NO_PAYMENT",

      shipmentStatus:
        latestShipment
          ?.shipmentStatus ||
        "NO_SHIPMENT",

      ...totals,
    };
  };

/* =====================================================
   ORDER LIST
===================================================== */

export const getOperationalOrders =
  async () => {
    const orderSummaries =
      await Promise.all(
        adminOrders.map(
          (order) =>
            createOrderSummary(
              order
            )
        )
      );

    return orderSummaries.sort(
      (
        firstOrder,
        secondOrder
      ) =>
        getDateValue(
          secondOrder.orderDate
        ) -
        getDateValue(
          firstOrder.orderDate
        )
    );
  };

/* =====================================================
   ORDER DETAILS
===================================================== */

export const getOperationalOrderById =
  async (orderId) => {
    const numericOrderId =
      Number(orderId);

    const order =
      adminOrders.find(
        (currentOrder) =>
          currentOrder.orderId ===
          numericOrderId
      );

    if (!order) {
      throw new Error(
        "Order could not be found."
      );
    }

    const addresses =
      getOrderAddresses(
        numericOrderId
      );

    const [
      orderSummary,
      buyer,
      coupon,
      items,
    ] = await Promise.all([
      createOrderSummary(
        order
      ),

      getBuyer(
        order.buyerUserId
      ),

      getCoupon(
        order.couponId
      ),

      getDetailedOrderItems(
        numericOrderId
      ),
    ]);

    return {
      ...orderSummary,

      buyer:
        cloneValue(buyer),

      coupon:
        cloneValue(coupon),

      items,

      payments:
        getOrderPayments(
          numericOrderId
        ),

      shipments:
        getOrderShipments(
          numericOrderId
        ),

      statusHistory:
        getOrderHistory(
          numericOrderId
        ),

      shippingAddress:
        addresses.find(
          (address) =>
            address.addressType ===
            "SHIPPING"
        ) || null,

      billingAddress:
        addresses.find(
          (address) =>
            address.addressType ===
            "BILLING"
        ) || null,
    };
  };

export const getAdminOrders = async (filters = {}) => {
  requireAuthenticatedAdmin();
  const response = await api.get("/api/Admin/orders", {
    query: { page: 1, pageSize: 100, ...filters },
  });
  return response.items || [];
};

export const getAdminOrdersPage = async ({ page = 1, pageSize = 25, ...filters } = {}) => {
  return getAdminPage("orders", { ...filters, page, pageSize });
};

export const getAdminOrderById = async (orderId) => {
  requireAuthenticatedAdmin();
  const order = await api.get(`/api/Admin/orders/${Number(orderId)}`);
  const addresses = Array.isArray(order.addresses) ? order.addresses : [];
  return {
    ...order,
    buyer: { userId: order.buyerUserId, fullName: order.buyerName, email: order.buyerEmail },
    store: { storeId: order.storeId, storeName: order.storeName, sellerUserId: order.sellerUserId },
    shippingAddress: addresses.find((item) => item.addressType === "SHIPPING") || null,
    billingAddress: addresses.find((item) => item.addressType === "BILLING") || null,
  };
};

export const getAdminOrdersNeedingAttention = async () => {
  requireAuthenticatedAdmin();
  const orders = await api.get("/api/Admin/orders/attention");
  return orders.map((order) => ({ ...order, id: order.orderId }));
};



