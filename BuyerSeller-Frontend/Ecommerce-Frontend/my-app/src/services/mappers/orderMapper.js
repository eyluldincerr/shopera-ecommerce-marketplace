import { resolveApiUrl } from "../axiosClient.js";

const read = (dto, camelKey, pascalKey) =>
  dto?.[camelKey] ?? dto?.[pascalKey];

const readFirst = (dto, keys) => {
  for (const [camelKey, pascalKey] of keys) {
    const value = read(dto, camelKey, pascalKey);

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const mapOrderAddressDto = (dto) => {
  if (!dto || typeof dto !== "object") {
    return null;
  }

  return {
    addressType: String(read(dto, "addressType", "AddressType") ?? ""),
    receiverName: readFirst(dto, [
      ["receiverName", "ReceiverName"],
      ["recipientName", "RecipientName"],
    ]) ?? "",
    phoneNumber: readFirst(dto, [
      ["phoneNumber", "PhoneNumber"],
      ["recipientPhone", "RecipientPhone"],
    ]) ?? "",
    streetAddress: read(dto, "streetAddress", "StreetAddress") ?? "",
    district: readFirst(dto, [
      ["district", "District"],
      ["stateProvince", "StateProvince"],
    ]) ?? "",
    city: read(dto, "city", "City") ?? "",
    country: read(dto, "country", "Country") ?? "",
    postalCode: read(dto, "postalCode", "PostalCode") ?? "",
    buildingNo: read(dto, "buildingNo", "BuildingNo") ?? "",
    apartmentNo: read(dto, "apartmentNo", "ApartmentNo") ?? "",
    mapUrl: read(dto, "mapUrl", "MapUrl") ?? "",
  };
};

export const mapOrderPaymentDto = (dto) => {
  if (!dto || typeof dto !== "object") {
    return null;
  }

  return {
    brand: readFirst(dto, [
      ["cardBrand", "CardBrand"],
      ["brand", "Brand"],
    ]) ?? "Card",
    last4: read(dto, "last4", "Last4") ?? "",
    expiryMonth: read(dto, "expiryMonth", "ExpiryMonth") ?? "",
    expiryYear: read(dto, "expiryYear", "ExpiryYear") ?? "",
    cardHolderName: read(dto, "cardHolderName", "CardHolderName") ?? "",
    status: read(dto, "paymentStatus", "PaymentStatus") ?? "PENDING",
    amount: toNumber(read(dto, "amount", "Amount")),
  };
};

export const mapOrderItemDto = (dto = {}) => {
  const quantity = toNumber(read(dto, "quantity", "Quantity"));
  const unitPrice = toNumber(
    readFirst(dto, [
      ["unitPriceAtPurchase", "UnitPriceAtPurchase"],
      ["unitPrice", "UnitPrice"],
    ])
  );
  const lineTotal = readFirst(dto, [
    ["lineTotal", "LineTotal"],
    ["subtotal", "Subtotal"],
  ]);
  const imageUrl = readFirst(dto, [
    ["imageUrl", "ImageUrl"],
    ["productImage", "ProductImage"],
  ]);

  return {
    orderItemId: read(dto, "orderItemId", "OrderItemID") ?? "",
    productId: read(dto, "productId", "ProductID") ?? null,
    variantId: read(dto, "variantId", "VariantID") ?? "",
    sku: read(dto, "sku", "SKU") ?? "",
    variantName: read(dto, "variantName", "VariantName") ?? "",
    productName: read(dto, "productName", "ProductName") ?? "Product",
    productImage: resolveApiUrl(String(imageUrl ?? "")),
    quantity,
    unitPrice,
    subtotal:
      lineTotal === undefined || lineTotal === null
        ? quantity * unitPrice
        : toNumber(lineTotal),
  };
};

const mapOrderShipmentDto = (dto) => {
  if (!dto || typeof dto !== "object") {
    return null;
  }

  return {
    shipmentId: read(dto, "shipmentId", "ShipmentID") ?? null,
    courierName: read(dto, "courierName", "CourierName") ?? "",
    trackingNumber: read(dto, "trackingNumber", "TrackingNumber") ?? "",
    status: read(dto, "shipmentStatus", "ShipmentStatus") ?? "PENDING",
    shippedDate: read(dto, "shippedDate", "ShippedDate") ?? null,
    deliveredDate: read(dto, "deliveredDate", "DeliveredDate") ?? null,
    shippingCost: toNumber(read(dto, "shippingCost", "ShippingCost")),
  };
};

const mapOrderStatusHistoryDto = (dto = {}) => ({
  orderStatusHistoryId:
    read(dto, "orderStatusHistoryId", "OrderStatusHistoryID") ?? "",
  oldStatus: read(dto, "oldStatus", "OldStatus") ?? null,
  newStatus: read(dto, "newStatus", "NewStatus") ?? "",
  changedDate: read(dto, "changedDate", "ChangedDate") ?? "",
  changedByUserId:
    readFirst(dto, [
      ["changedByUserId", "ChangedByUserId"],
      ["changedByAdminUserId", "ChangedByAdminUserID"],
    ]) ?? null,
  changeNote: read(dto, "changeNote", "ChangeNote") ?? "",
});

export const mapOrderDto = (dto) => {
  if (!dto || typeof dto !== "object") {
    return null;
  }

  const items = (read(dto, "items", "OrderItems") || []).map(mapOrderItemDto);
  const addressList = read(dto, "addresses", "Addresses");
  const address = mapOrderAddressDto(
    readFirst(dto, [
      ["shippingAddressSnapshot", "ShippingAddressSnapshot"],
      ["orderAddress", "OrderAddress"],
    ]) ||
      (Array.isArray(addressList)
        ? addressList.find(
            (item) =>
              String(read(item, "addressType", "AddressType")).toUpperCase() ===
              "SHIPPING"
          )
        : null)
  );
  const payment = mapOrderPaymentDto(
    readFirst(dto, [
      ["paymentMethodSnapshot", "PaymentMethodSnapshot"],
      ["payment", "Payment"],
    ])
  );
  const shipment = mapOrderShipmentDto(read(dto, "shipment", "Shipment"));
  const statusHistory = (read(dto, "statusHistory", "StatusHistory") || []).map(
    mapOrderStatusHistoryDto
  );
  const subtotalValue = read(dto, "subtotal", "Subtotal");
  const totalAmountValue = read(dto, "totalAmount", "TotalAmount");
  const totalQuantityValue = read(dto, "totalQuantity", "TotalQuantity");

  return {
    orderId: read(dto, "orderId", "OrderID") ?? "",
    orderNumber: read(dto, "orderNumber", "OrderNumber") ?? "",
    buyerUserId: read(dto, "buyerUserId", "BuyerUserID") ?? null,
    storeId: read(dto, "storeId", "StoreID") ?? null,
    orderDate:
      readFirst(dto, [
        ["orderDate", "OrderDate"],
        ["createdAt", "CreatedDate"],
      ]) ?? "",
    status: read(dto, "status", "OrderStatus") ?? "PENDING",
    items,
    totalQuantity:
      totalQuantityValue === undefined || totalQuantityValue === null
        ? items.reduce((total, item) => total + item.quantity, 0)
        : toNumber(totalQuantityValue),
    address,
    payment,
    shipment,
    statusHistory,
    subtotal:
      subtotalValue === undefined || subtotalValue === null
        ? items.reduce((total, item) => total + item.subtotal, 0)
        : toNumber(subtotalValue),
    taxAmount: toNumber(read(dto, "taxAmount", "TaxAmount")),
    shippingCost: toNumber(
      readFirst(dto, [
        ["shippingCost", "ShippingCost"],
        ["shippingAmount", "ShippingAmount"],
      ]) ?? shipment?.shippingCost ?? 0
    ),
    discountAmount: toNumber(read(dto, "discountAmount", "DiscountAmount")),
    totalAmount:
      totalAmountValue === undefined || totalAmountValue === null
        ? payment?.amount ?? 0
        : toNumber(totalAmountValue),
    currencyCode: String(read(dto, "currencyCode", "CurrencyCode") ?? "EUR"),
    couponCode: read(dto, "couponCode", "CouponCode") ?? null,
  };
};
