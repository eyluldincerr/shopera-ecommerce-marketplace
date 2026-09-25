import { mapProductVariantDto } from "./mappers/productMapper.js";

const ACTIVE_STATUSES = new Set(["active", "available", "in_stock"]);
const INACTIVE_STATUSES = new Set([
  "inactive",
  "discontinued",
  "deleted",
  "out_of_stock",
  "out of stock",
]);

const ATTRIBUTE_GROUPS = [
  { key: "color", label: "Color" },
  { key: "size", label: "Size" },
  { key: "storageCapacity", label: "Storage" },
];

export const normalizeVariantId = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized && normalized !== "0" ? normalized : null;
};

export const normalizeVariantStatus = (status) => {
  if (status === undefined || status === null || status === "") {
    return null;
  }

  const normalized = String(status).trim();
  const key = normalized.toLowerCase();

  if (INACTIVE_STATUSES.has(key)) {
    return normalized;
  }

  return ACTIVE_STATUSES.has(key) ? "ACTIVE" : normalized;
};

export const normalizeProductVariant = (variant = {}) => {
  const mapped = mapProductVariantDto(variant);

  if (!mapped.variantId) {
    return null;
  }

  return {
    ...mapped,
    status: normalizeVariantStatus(mapped.status),
    hasValidPrice: mapped.price !== null,
  };
};

export const normalizeProductVariants = (variants = []) => {
  const byId = new Map();

  if (!Array.isArray(variants)) {
    return [];
  }

  variants.forEach((variant) => {
    const normalized = normalizeProductVariant(variant);
    if (normalized && !byId.has(normalized.variantId)) {
      byId.set(normalized.variantId, normalized);
    }
  });

  return [...byId.values()];
};

export const isActiveVariant = (variant) =>
  ACTIVE_STATUSES.has(String(variant?.status || "").trim().toLowerCase());

export const isPurchasableVariant = (variant) =>
  isActiveVariant(variant) &&
  variant?.hasValidPrice !== false &&
  Number(variant?.stockQuantity) > 0;

const pickPreferredVariant = (variants) =>
  variants.find(isPurchasableVariant) ||
  variants.find(isActiveVariant) ||
  variants[0] ||
  null;

export const getDefaultProductVariant = (variants = [], requestedVariantId) => {
  const normalized = normalizeProductVariants(variants);
  const requestedId = normalizeVariantId(requestedVariantId);

  if (requestedId) {
    const requested = normalized.find(
      (variant) => variant.variantId === requestedId
    );
    if (requested) {
      return requested;
    }
  }

  return pickPreferredVariant(normalized);
};

const matchesSelection = (variant, selection) =>
  Object.entries(selection).every(
    ([key, value]) => !value || variant?.[key] === value
  );

export const selectVariantByOption = (
  variants = [],
  selectedVariant,
  optionKey,
  optionValue
) => {
  const normalized = normalizeProductVariants(variants);
  const selection = {};

  ATTRIBUTE_GROUPS.forEach(({ key }) => {
    const value = key === optionKey ? optionValue : selectedVariant?.[key];
    if (value) {
      selection[key] = value;
    }
  });

  const exact = normalized.filter((variant) =>
    matchesSelection(variant, selection)
  );
  return (
    pickPreferredVariant(exact) ||
    pickPreferredVariant(
      normalized.filter((variant) => variant?.[optionKey] === optionValue)
    )
  );
};

export const getVariantOptionGroups = (variants = [], selectedVariant = null) => {
  const normalized = normalizeProductVariants(variants);
  const groups = ATTRIBUTE_GROUPS.map((group) => {
    const values = [...new Set(normalized.map((item) => item[group.key]).filter(Boolean))];
    return values.length
      ? {
          ...group,
          options: values.map((value) => ({
            value,
            selected: selectedVariant?.[group.key] === value,
            disabled: !selectVariantByOption(
              normalized,
              selectedVariant,
              group.key,
              value
            ),
          })),
        }
      : null;
  }).filter(Boolean);

  if (groups.length) {
    return groups;
  }

  const names = [
    ...new Set(normalized.map((item) => item.variantName).filter(Boolean)),
  ];
  return names.length
    ? [
        {
          key: "name",
          label: "Variant",
          options: names.map((value) => ({
            value,
            selected: selectedVariant?.variantName === value,
            disabled: false,
          })),
        },
      ]
    : [];
};

export const selectVariantByName = (variants = [], variantName) =>
  pickPreferredVariant(
    normalizeProductVariants(variants).filter(
      (variant) => variant.variantName === variantName
    )
  );

export const getVariantPriceInfo = (variant) => {
  const price = Number(variant?.price);
  const safePrice = Number.isFinite(price) ? price : 0;

  return {
    price: safePrice,
    oldPrice: null,
    discountPercent: 0,
    discountText: "",
  };
};

export const getVariantAvailability = (variant) => {
  if (!variant) {
    return {
      isPurchasable: false,
      label: "Unavailable",
      labelKey: "buyer.product.availability.unavailable",
      labelParams: {},
      tone: "unavailable",
      stockLimit: 0,
    };
  }

  const stockLimit = Math.max(0, Number(variant.stockQuantity) || 0);
  if (!isActiveVariant(variant) || variant.hasValidPrice === false) {
    return {
      isPurchasable: false,
      label: variant.hasValidPrice === false ? "Price unavailable" : "Unavailable",
      labelKey:
        variant.hasValidPrice === false
          ? "buyer.product.availability.priceUnavailable"
          : "buyer.product.availability.unavailable",
      labelParams: {},
      tone: "unavailable",
      stockLimit,
    };
  }

  if (stockLimit === 0) {
    return {
      isPurchasable: false,
      label: "Out of stock",
      labelKey: "buyer.product.availability.outOfStock",
      labelParams: {},
      tone: "out",
      stockLimit,
    };
  }

  return {
    isPurchasable: true,
    label: stockLimit <= 3 ? `Low stock: ${stockLimit} left` : `${stockLimit} in stock`,
    labelKey:
      stockLimit <= 3
        ? "buyer.product.availability.lowStock"
        : "buyer.product.availability.inStock",
    labelParams: { count: stockLimit },
    tone: stockLimit <= 3 ? "low" : "in",
    stockLimit,
  };
};

export const getSelectedVariantDetails = (variant) =>
  variant
    ? [
        { key: "sku", label: "SKU", value: variant.sku },
        { key: "variant", label: "Variant", value: variant.variantName },
        { key: "color", label: "Color", value: variant.color },
        { key: "size", label: "Size", value: variant.size },
        { key: "storage", label: "Storage", value: variant.storageCapacity },
      ].filter((item) => item.value)
    : [];
