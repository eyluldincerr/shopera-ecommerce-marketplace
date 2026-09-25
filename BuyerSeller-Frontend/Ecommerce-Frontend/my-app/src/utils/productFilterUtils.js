// src/components/product/productFilterUtils.js

export const defaultProductFilters = {
  searchTerm: "",
  categoryId: "",
  brand: "",
  conditions: "",
  minPrice: "",
  maxPrice: "",
  inStock: false,
};

const PUBLIC_PRODUCT_CONDITIONS = Object.freeze([
  "NEW",
  "USED_LIKE_NEW",
  "USED_GOOD",
  "USED_FAIR",
  "REFURBISHED",
]);

export function createPublicProductFilterOptions(
  t,
  { categories = [], includeSearch = true } = {}
) {
  const categoryOptions = categories
    .filter((category) => category?.categoryId && category?.categoryName)
    .map((category) => ({
      key: category.categoryId,
      value: String(category.categoryId),
      label: category.categoryName,
    }));

  return {
    groups: [
      includeSearch
        ? {
            key: "searchTerm",
            title: t("buyer.filters.groups.searchTerm"),
            control: "search",
          }
        : null,
      categoryOptions.length
        ? {
            key: "categoryId",
            title: t("buyer.filters.groups.categoryId"),
            control: "select",
            options: [
              {
                key: "all",
                value: "",
                label: t("buyer.filters.allCategories"),
              },
              ...categoryOptions,
            ],
          }
        : null,
      {
        key: "brand",
        title: t("buyer.filters.groups.brand"),
        control: "search",
        placeholder: t("buyer.filters.brandPlaceholder"),
      },
      {
        key: "conditions",
        title: t("buyer.filters.groups.conditions"),
        control: "select",
        options: [
          { key: "all", value: "", label: t("buyer.filters.allConditions") },
          ...PUBLIC_PRODUCT_CONDITIONS.map((condition) => ({
            key: condition,
            value: condition,
            label: t(`products.conditionCodes.${condition}`),
          })),
        ],
      },
      {
        key: "price",
        title: t("buyer.filters.groups.price"),
        control: "price-range",
        minKey: "minPrice",
        maxKey: "maxPrice",
        min: 0,
      },
      {
        key: "availability",
        title: t("buyer.filters.groups.availability"),
        control: "boolean-checkboxes",
        options: [
          {
            key: "inStock",
            value: "inStock",
            label: t("buyer.filters.inStockOnly"),
          },
        ],
      },
    ].filter(Boolean),
  };
}

function getActiveFilterValueCount(value) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  return value ? 1 : 0;
}

export function countActiveFilters(filters) {
  return Object.values(filters).reduce(
    (count, value) => count + getActiveFilterValueCount(value),
    0
  );
}
