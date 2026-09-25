import {
  ORDER_STATUS_CODES,
} from "../../constants/marketplace.js";

const read = (dto, ...keys) => {
  for (const key of keys) {
    if (dto?.[key] !== undefined && dto?.[key] !== null) {
      return dto[key];
    }
  }

  return undefined;
};

export class SellerOrderMappingError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "SellerOrderMappingError";
    this.code = "SELLER_ORDER_RESPONSE_INVALID";
    this.field = field;
  }
}

const positiveInteger = (value, field) => {
  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number <= 0
  ) {
    throw new SellerOrderMappingError(
      `Seller Order ${field} must be a positive integer.`,
      field
    );
  }

  return number;
};

const nonNegativeNumber = (value, field) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new SellerOrderMappingError(
      `Seller Order ${field} must be a non-negative number.`,
      field
    );
  }

  return number;
};

const nonNegativeInteger = (value, field) => {
  const number = nonNegativeNumber(value, field);

  if (!Number.isSafeInteger(number)) {
    throw new SellerOrderMappingError(
      `Seller Order ${field} must be an integer.`,
      field
    );
  }

  return number;
};

const requiredString = (value, field) => {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new SellerOrderMappingError(
      `Seller Order ${field} is required.`,
      field
    );
  }

  return text;
};

const optionalString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
};

const ADDRESS_FIELDS = [
  ["receiverName", "ReceiverName"],
  ["phoneNumber", "PhoneNumber"],
  ["streetAddress", "StreetAddress"],
  ["addressLine1", "AddressLine1"],
  ["addressLine2", "AddressLine2"],
  ["buildingNo", "BuildingNo"],
  ["apartmentNo", "ApartmentNo"],
  ["district", "District"],
  ["city", "City"],
  ["stateProvince", "StateProvince"],
  ["postalCode", "PostalCode"],
  ["country", "Country"],
];

export const mapSellerShippingAddress = (dto) => {
  if (dto === undefined || dto === null) {
    return null;
  }

  if (typeof dto === "string") {
    return dto.trim() || null;
  }

  if (typeof dto !== "object" || Array.isArray(dto)) {
    throw new SellerOrderMappingError(
      "Seller Order shippingAddress is invalid.",
      "shippingAddress"
    );
  }

  return Object.fromEntries(
    ADDRESS_FIELDS.flatMap(
      ([camelKey, pascalKey]) => {
        const value = optionalString(
          read(dto, camelKey, pascalKey)
        );

        return value === null
          ? []
          : [[camelKey, value]];
      }
    )
  );
};

export const mapSellerOrderItemDto = (
  dto,
  index = 0
) => {
  if (!dto || typeof dto !== "object") {
    throw new SellerOrderMappingError(
      `Seller Order item ${index} is invalid.`,
      `items[${index}]`
    );
  }

  return {
    variantId: positiveInteger(
      read(dto, "variantId", "VariantId", "VariantID"),
      `items[${index}].variantId`
    ),
    productName: requiredString(
      read(dto, "productName", "ProductName"),
      `items[${index}].productName`
    ),
    sku: requiredString(
      read(dto, "sku", "Sku", "SKU"),
      `items[${index}].sku`
    ),
    variantName: optionalString(
      read(dto, "variantName", "VariantName")
    ),
    quantity: nonNegativeInteger(
      read(dto, "quantity", "Quantity"),
      `items[${index}].quantity`
    ),
    unitPriceAtPurchase: nonNegativeNumber(
      read(
        dto,
        "unitPriceAtPurchase",
        "UnitPriceAtPurchase"
      ),
      `items[${index}].unitPriceAtPurchase`
    ),
    subtotal: nonNegativeNumber(
      read(dto, "subtotal", "Subtotal"),
      `items[${index}].subtotal`
    ),
  };
};


export const mapSellerShipmentDto = (dto) => {
  if (dto === undefined || dto === null) {
    return null;
  }

  if (typeof dto !== "object" || Array.isArray(dto)) {
    throw new SellerOrderMappingError(
      "Seller Order shipment is invalid.",
      "shipment"
    );
  }

  const shipmentIdValue = read(
    dto,
    "shipmentId",
    "ShipmentId",
    "ShipmentID"
  );

  return {
    shipmentId:
      shipmentIdValue === undefined || shipmentIdValue === null
        ? null
        : positiveInteger(shipmentIdValue, "shipment.shipmentId"),
    courierName: optionalString(
      read(dto, "courierName", "CourierName")
    ),
    trackingNumber: optionalString(
      read(dto, "trackingNumber", "TrackingNumber")
    ),
    status: requiredString(
      read(dto, "shipmentStatus", "ShipmentStatus"),
      "shipment.status"
    ).toUpperCase(),
    shippedDate: optionalString(
      read(dto, "shippedDate", "ShippedDate")
    ),
    deliveredDate: optionalString(
      read(dto, "deliveredDate", "DeliveredDate")
    ),
    shippingCost: nonNegativeNumber(
      read(dto, "shippingCost", "ShippingCost"),
      "shipment.shippingCost"
    ),
  };
};

export const mapSellerOrderDto = (dto) => {
  if (!dto || typeof dto !== "object") {
    throw new SellerOrderMappingError(
      "Seller Order response must be an object.",
      "order"
    );
  }

  const status = requiredString(
    read(dto, "status", "Status"),
    "status"
  ).toUpperCase();

  if (!ORDER_STATUS_CODES.includes(status)) {
    throw new SellerOrderMappingError(
      "Seller Order status is unsupported.",
      "status"
    );
  }

  const items = read(dto, "items", "Items");

  if (!Array.isArray(items)) {
    throw new SellerOrderMappingError(
      "Seller Order items must be an array.",
      "items"
    );
  }

  return {
    orderId: positiveInteger(
      read(dto, "orderId", "OrderId", "OrderID"),
      "orderId"
    ),
    orderNumber: requiredString(
      read(dto, "orderNumber", "OrderNumber"),
      "orderNumber"
    ),
    storeId: positiveInteger(
      read(dto, "storeId", "StoreId", "StoreID"),
      "storeId"
    ),
    orderDate: requiredString(
      read(dto, "orderDate", "OrderDate"),
      "orderDate"
    ),
    status,
    totalQuantity: nonNegativeInteger(
      read(dto, "totalQuantity", "TotalQuantity"),
      "totalQuantity"
    ),
    subtotal: nonNegativeNumber(
      read(dto, "subtotal", "Subtotal"),
      "subtotal"
    ),
    discountAmount: nonNegativeNumber(
      read(
        dto,
        "discountAmount",
        "DiscountAmount"
      ),
      "discountAmount"
    ),
    shippingAmount: nonNegativeNumber(
      read(
        dto,
        "shippingAmount",
        "ShippingAmount"
      ),
      "shippingAmount"
    ),
    totalAmount: nonNegativeNumber(
      read(dto, "totalAmount", "TotalAmount"),
      "totalAmount"
    ),
    currencyCode: requiredString(
      read(dto, "currencyCode", "CurrencyCode"),
      "currencyCode"
    ).toUpperCase(),
    customerName: requiredString(
      read(dto, "customerName", "CustomerName"),
      "customerName"
    ),
    customerPhone: optionalString(
      read(dto, "customerPhone", "CustomerPhone")
    ),
    items: items.map(mapSellerOrderItemDto),
    shippingAddress: mapSellerShippingAddress(
      read(
        dto,
        "shippingAddress",
        "ShippingAddress"
      )
    ),
    shipment: mapSellerShipmentDto(
      read(dto, "shipment", "Shipment")
    ),
  };
};
