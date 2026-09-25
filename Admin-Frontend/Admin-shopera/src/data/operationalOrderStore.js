import {
  adminCustomerOrdersData,
  adminOrderAddressesData,
  adminOrderItemsData,
  adminOrderStatusHistoryData,
  adminPaymentsData,
  adminShipmentsData,
} from "./adminOrdersData";

export const operationalOrders = structuredClone(adminCustomerOrdersData);
export const operationalOrderItems = structuredClone(adminOrderItemsData);
export const operationalOrderAddresses = structuredClone(adminOrderAddressesData);
export const operationalPayments = structuredClone(adminPaymentsData);
export const operationalShipments = structuredClone(adminShipmentsData);
export const operationalOrderStatusHistory = structuredClone(
  adminOrderStatusHistoryData,
);

export const nextOperationalId = (records, key) =>
  records.length
    ? Math.max(...records.map((record) => Number(record[key]) || 0)) + 1
    : 1;

export const generateOrderNumber = (orderId, createdDate = new Date()) =>
  `ORD-${createdDate.getUTCFullYear()}-${orderId}`;
