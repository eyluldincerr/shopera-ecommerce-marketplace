export const HERO_DURATION_OPTIONS = Object.freeze([1, 2, 4, 5, 10]);

export const PROMOTION_DESTINATION_TYPES = Object.freeze({
  NONE: "none",
  STORE: "store",
  CATEGORY: "category",
  PRODUCT: "product",
  SEARCH: "search",
  CUSTOM: "custom",
});

const positiveId = (value) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

export const buildPromotionDestination = ({
  type,
  storeId,
  categoryId,
  productId,
  searchTerm,
  customUrl,
} = {}) => {
  switch (type) {
    case PROMOTION_DESTINATION_TYPES.STORE: {
      const id = positiveId(storeId);
      return id ? `/stores/${id}` : "";
    }

    case PROMOTION_DESTINATION_TYPES.CATEGORY: {
      const id = positiveId(categoryId);
      return id ? `/categories/${id}` : "";
    }

    case PROMOTION_DESTINATION_TYPES.PRODUCT: {
      const id = positiveId(productId);
      return id ? `/products/${id}` : "";
    }

    case PROMOTION_DESTINATION_TYPES.SEARCH: {
      const query = String(searchTerm || "").trim();
      return query ? `/search?q=${encodeURIComponent(query)}` : "";
    }

    case PROMOTION_DESTINATION_TYPES.CUSTOM:
      return String(customUrl || "").trim();

    case PROMOTION_DESTINATION_TYPES.NONE:
    default:
      return "";
  }
};

export const inferPromotionDestination = (linkURL) => {
  const link = String(linkURL || "").trim();

  if (!link) {
    return {
      type: PROMOTION_DESTINATION_TYPES.NONE,
      storeId: "",
      categoryId: "",
      productId: "",
      searchTerm: "",
      customUrl: "",
      productStoreId: "",
    };
  }

  let match = link.match(/^\/stores\/(\d+)\/?$/i);
  if (match) {
    return {
      type: PROMOTION_DESTINATION_TYPES.STORE,
      storeId: match[1],
      categoryId: "",
      productId: "",
      searchTerm: "",
      customUrl: "",
      productStoreId: "",
    };
  }

  match = link.match(/^\/categories\/(\d+)\/?$/i);
  if (match) {
    return {
      type: PROMOTION_DESTINATION_TYPES.CATEGORY,
      storeId: "",
      categoryId: match[1],
      productId: "",
      searchTerm: "",
      customUrl: "",
      productStoreId: "",
    };
  }

  match = link.match(/^\/products\/(\d+)\/?$/i);
  if (match) {
    return {
      type: PROMOTION_DESTINATION_TYPES.PRODUCT,
      storeId: "",
      categoryId: "",
      productId: match[1],
      searchTerm: "",
      customUrl: "",
      productStoreId: "",
    };
  }

  if (link.startsWith("/search?")) {
    try {
      const url = new URL(link, "https://shopera.local");
      const searchTerm = url.searchParams.get("q") || "";
      const onlySearchQuery =
        searchTerm &&
        [...url.searchParams.keys()].every((key) => key === "q");

      if (onlySearchQuery) {
        return {
          type: PROMOTION_DESTINATION_TYPES.SEARCH,
          storeId: "",
          categoryId: "",
          productId: "",
          searchTerm,
          customUrl: "",
          productStoreId: "",
        };
      }
    } catch {
      // Fall through to custom so the original value is preserved for editing.
    }
  }

  return {
    type: PROMOTION_DESTINATION_TYPES.CUSTOM,
    storeId: "",
    categoryId: "",
    productId: "",
    searchTerm: "",
    customUrl: link,
    productStoreId: "",
  };
};

export const getClosestHeroDurationHours = (startDate, endDate) => {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 2;
  }

  const hours = (end.getTime() - start.getTime()) / 3_600_000;

  return HERO_DURATION_OPTIONS.reduce((closest, candidate) =>
    Math.abs(candidate - hours) < Math.abs(closest - hours) ? candidate : closest,
  HERO_DURATION_OPTIONS[0]);
};

export const createRelativeHeroWindow = (durationHours, now = new Date()) => {
  const duration = HERO_DURATION_OPTIONS.includes(Number(durationHours))
    ? Number(durationHours)
    : 2;
  const startDate = new Date(now);
  startDate.setSeconds(0, 0);
  const endDate = new Date(startDate.getTime() + duration * 3_600_000);

  return { startDate, endDate, durationHours: duration };
};

export const formatHeroClock = (value, locale = "en-US") => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
