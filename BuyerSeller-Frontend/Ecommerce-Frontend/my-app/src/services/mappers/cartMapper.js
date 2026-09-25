import { resolveApiUrl } from "../axiosClient.js";

const read = (dto, ...keys) => {
  for (const key of keys) {
    if (dto?.[key] !== undefined) {
      return dto[key];
    }
  }

  return undefined;
};

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const integerOrNull = (value) => {
  const number = numberOrNull(value);
  return Number.isInteger(number) ? number : null;
};

const textOrNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
};

export const mapCartItemDto = (dto = {}) => {
  const cartItemId = integerOrNull(
    read(dto, "cartItemId", "CartItemId", "CartItemID")
  );
  const productId = integerOrNull(
    read(dto, "productId", "ProductId", "ProductID")
  );
  const variantId = integerOrNull(
    read(dto, "variantId", "VariantId", "VariantID")
  );
  const storeId = integerOrNull(
    read(dto, "storeId", "StoreId", "StoreID")
  );
  const quantity = integerOrNull(read(dto, "quantity", "Quantity")) ?? 0;
  const unitPriceAtAdd = numberOrNull(read(
    dto,
    "unitPriceAtAdd",
    "UnitPriceAtAdd"
  ));
  const currentUnitPrice = numberOrNull(read(
    dto,
    "currentUnitPrice",
    "CurrentUnitPrice",
    "unitPrice",
    "UnitPrice"
  ));
  const unitPrice = currentUnitPrice ?? unitPriceAtAdd;
  const subtotal = numberOrNull(read(dto, "subtotal", "Subtotal"));
  const availableStock = integerOrNull(
    read(dto, "availableStock", "AvailableStock")
  );
  const imageUrl = textOrNull(
    read(dto, "imageUrl", "ImageUrl", "ImageURL")
  );

  return {
    cartItemId,
    productId,
    variantId,
    storeId,
    productName: textOrNull(
      read(dto, "productName", "ProductName")
    ) || "Product",
    sku: textOrNull(read(dto, "sku", "SKU")) || "",
    variantName: textOrNull(
      read(dto, "variantName", "VariantName")
    ),
    size: textOrNull(read(dto, "size", "Size")),
    color: textOrNull(read(dto, "color", "Color")),
    storageCapacity: textOrNull(
      read(dto, "storageCapacity", "StorageCapacity")
    ),
    quantity,
    unitPriceAtAdd,
    currentUnitPrice,
    unitPrice,
    priceChanged: Boolean(read(dto, "priceChanged", "PriceChanged")),
    subtotal,
    availableStock,
    image: resolveApiUrl(imageUrl || ""),
  };
};

export const mapCartDto = (dto = {}) => {
  const rawItems = read(dto, "items", "Items");

  return {
    cartId: integerOrNull(read(dto, "cartId", "CartId", "CartID")),
    buyerUserId: integerOrNull(
      read(dto, "buyerUserId", "BuyerUserId", "BuyerUserID")
    ),
    createdDate: textOrNull(
      read(dto, "createdDate", "CreatedDate")
    ),
    status: textOrNull(read(dto, "status", "Status")) || "",
    totalQuantity: integerOrNull(
      read(dto, "totalQuantity", "TotalQuantity")
    ) ?? 0,
    totalAmount: numberOrNull(
      read(dto, "totalAmount", "TotalAmount")
    ) ?? 0,
    currencyCode: textOrNull(
      read(dto, "currencyCode", "CurrencyCode")
    ) || "EUR",
    items: Array.isArray(rawItems)
      ? rawItems.map(mapCartItemDto)
      : [],
  };
};
