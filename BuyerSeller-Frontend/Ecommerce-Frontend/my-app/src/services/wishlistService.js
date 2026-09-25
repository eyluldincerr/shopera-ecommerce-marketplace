import axiosClient, { resolveApiUrl } from "./axiosClient.js";
import { WISHLIST_ENDPOINTS } from "../config/apiEndpoints.js";
import {
  getDefaultProductVariant,
  normalizeProductVariant,
  normalizeProductVariants,
  normalizeVariantId,
} from "./productVariantService.js";

const LEGACY_WISHLIST_STORAGE_PREFIX = "ecommerce_wishlist";

const normalizeIdentifier = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized && normalized !== "0" ? normalized : null;
};

export const getWishlistVariantId = (item) =>
  normalizeVariantId(item?.variantId ?? item?.VariantID);

export const resolveWishlistVariant = (product, selectedVariant) => {
  const variants = normalizeProductVariants(product?.variants || []);
  const selectedId = getWishlistVariantId(selectedVariant);

  if (selectedId) {
    return (
      variants.find((variant) => variant.variantId === selectedId) ||
      normalizeProductVariant(selectedVariant) ||
      { variantId: selectedId }
    );
  }

  const defaultVariant = getDefaultProductVariant(variants);
  if (defaultVariant) {
    return defaultVariant;
  }

  const projectedVariantId = normalizeVariantId(
    product?.defaultVariantId ?? product?.DefaultVariantId ?? product?.DefaultVariantID
  );

  return projectedVariantId ? { variantId: projectedVariantId } : null;
};

const mapWishlistItem = (item = {}) => ({
  wishlistItemId: normalizeIdentifier(
    item.wishlistItemId ?? item.WishlistItemID
  ),
  productId: normalizeIdentifier(item.productId ?? item.ProductID),
  variantId: normalizeIdentifier(item.variantId ?? item.VariantID),
  storeId: normalizeIdentifier(item.storeId ?? item.StoreID),
  storeName: item.storeName ?? item.StoreName ?? "",
  name: item.productName ?? item.ProductName ?? item.name ?? "",
  variantName: item.variantName ?? item.VariantName ?? "",
  sku: item.sku ?? item.SKU ?? "",
  size: item.size ?? item.Size ?? null,
  color: item.color ?? item.Color ?? null,
  storageCapacity:
    item.storageCapacity ?? item.StorageCapacity ?? null,
  price: Number(item.price ?? item.Price ?? 0),
  currencyCode: item.currencyCode ?? item.CurrencyCode ?? "EUR",
  thumbnail: resolveApiUrl(item.imageUrl ?? item.ImageUrl ?? ""),
  productStatus: item.productStatus ?? item.ProductStatus ?? "",
  variantStatus: item.variantStatus ?? item.VariantStatus ?? "",
  availableStock: Math.max(
    0,
    Number(item.availableStock ?? item.AvailableStock ?? 0) || 0
  ),
  isProductVisible: Boolean(
    item.isProductVisible ?? item.IsProductVisible
  ),
  isAvailable: Boolean(item.isAvailable ?? item.IsAvailable),
  addedDate: item.addedDate ?? item.AddedDate ?? null,
});

export const mapWishlistResponse = (payload = {}) => {
  const items = Array.isArray(payload.items ?? payload.Items)
    ? (payload.items ?? payload.Items).map(mapWishlistItem)
    : [];

  return {
    wishlistId: normalizeIdentifier(
      payload.wishlistId ?? payload.WishlistID
    ),
    buyerUserId: normalizeIdentifier(
      payload.buyerUserId ?? payload.BuyerUserID
    ),
    createdDate: payload.createdDate ?? payload.CreatedDate ?? null,
    itemCount: Number(payload.itemCount ?? payload.ItemCount ?? items.length) || 0,
    items,
  };
};

const itemEndpoint = (variantId) =>
  WISHLIST_ENDPOINTS.item.replace(
    ":variantId",
    encodeURIComponent(String(variantId))
  );

export const clearLegacyWishlistStorage = () => {
  if (typeof localStorage === "undefined") {
    return;
  }

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(LEGACY_WISHLIST_STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
};

export const getWishlist = async () => {
  clearLegacyWishlistStorage();
  const response = await axiosClient.get(WISHLIST_ENDPOINTS.wishlist);
  return mapWishlistResponse(response.data);
};

export const addWishlistVariant = async (variantId) => {
  const response = await axiosClient.post(WISHLIST_ENDPOINTS.items, {
    variantId: Number(variantId),
  });
  return mapWishlistResponse(response.data);
};

export const removeWishlistVariant = async (variantId) => {
  const response = await axiosClient.delete(itemEndpoint(variantId));
  return mapWishlistResponse(response.data);
};

export const clearWishlistItems = async () => {
  const response = await axiosClient.delete(WISHLIST_ENDPOINTS.items);
  return mapWishlistResponse(response.data);
};
