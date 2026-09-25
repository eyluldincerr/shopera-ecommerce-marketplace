import {
  productDeliveryInfo,
  productTrustInfo,
} from "../data/productDetailData.js";
import productHttpAdapter from "./adapters/productHttpAdapter.js";

export const HOME_SECTION_RENDERERS = Object.freeze({
  PREVIEW: "product-preview",
  FEED: "product-feed",
});

export const HOME_FEED_KEYS = Object.freeze({
  DISCOVER: "discover",
});

const HOME_PREVIEW_PAGE_SIZE = 12;

const normalizeProductIdentity = (product) => {
  const productId = product?.productId ?? product?.ProductId ?? product?.ProductID;
  return productId === undefined || productId === null ? "" : String(productId);
};

export const dedupeHomePreviewSections = (sections = []) => {
  const seenProductIds = new Set();

  return (Array.isArray(sections) ? sections : []).map((section) => {
    if (section?.renderer !== HOME_SECTION_RENDERERS.PREVIEW) {
      return section;
    }

    const products = (Array.isArray(section.products) ? section.products : []).filter(
      (product) => {
        const productId = normalizeProductIdentity(product);

        if (!productId || seenProductIds.has(productId)) {
          return false;
        }

        seenProductIds.add(productId);
        return true;
      }
    );

    return { ...section, products };
  });
};

export const createExcludedProductFeedLoader = (
  loadProducts,
  excludedProductIds = []
) => {
  if (typeof loadProducts !== "function") {
    return null;
  }

  const excluded = new Set(
    Array.from(excludedProductIds || [], (productId) => String(productId))
  );

  return async ({ page = 1, pageSize, signal } = {}) => {
    let nextPage = Math.max(1, Number(page) || 1);
    const visitedPages = new Set();

    while (!visitedPages.has(nextPage)) {
      visitedPages.add(nextPage);

      const response = await loadProducts({ page: nextPage, pageSize, signal });
      const responseItems = response?.items || response?.products || [];
      const items = responseItems.filter(
        (product) => !excluded.has(normalizeProductIdentity(product))
      );
      const responsePage = Math.max(1, Number(response?.page) || nextPage);
      const hasMore = Boolean(response?.hasMore);

      if (items.length > 0 || !hasMore) {
        return { ...response, items, products: items, page: responsePage, hasMore };
      }

      nextPage = responsePage + 1;
    }

    return {
      items: [],
      products: [],
      page: nextPage,
      pageSize: pageSize || 0,
      totalCount: 0,
      totalPages: 0,
      hasMore: false,
      nextCursor: null,
      filterOptions: {},
    };
  };
};

const HOME_PRODUCT_SECTIONS = Object.freeze([
  Object.freeze({
    id: "top-rated-products",
    renderer: HOME_SECTION_RENDERERS.PREVIEW,
    titleKey: "buyer.home.productSections.topRated.title",
    subtitleKey: "buyer.home.productSections.topRated.subtitle",
    seeMorePath: "/search?sort=best-rated&minRating=4",
    query: Object.freeze({ sort: "rating_desc", minimumRating: 4 }),
    requireReviews: true,
  }),
  Object.freeze({
    id: "new-arrivals-products",
    renderer: HOME_SECTION_RENDERERS.PREVIEW,
    titleKey: "buyer.home.productSections.newArrivals.title",
    subtitleKey: "buyer.home.productSections.newArrivals.subtitle",
    seeMorePath: "/search?sort=newest&newArrivals=1",
    query: Object.freeze({ sort: "newest", newArrivalsOnly: true }),
  }),
  Object.freeze({
    id: "best-selling-products",
    renderer: HOME_SECTION_RENDERERS.PREVIEW,
    titleKey: "buyer.home.productSections.bestSellers.title",
    subtitleKey: "buyer.home.productSections.bestSellers.subtitle",
    seeMorePath: "/search?sort=best-selling",
    query: Object.freeze({ sort: "best_selling" }),
  }),
  Object.freeze({
    id: "ready-to-buy-products",
    renderer: HOME_SECTION_RENDERERS.PREVIEW,
    titleKey: "buyer.home.productSections.inStock.title",
    subtitleKey: "buyer.home.productSections.inStock.subtitle",
    seeMorePath: "/search?inStock=1",
    query: Object.freeze({ sort: "newest", inStockOnly: true }),
  }),
  Object.freeze({
    id: "discover-products",
    renderer: HOME_SECTION_RENDERERS.FEED,
    feedKey: HOME_FEED_KEYS.DISCOVER,
    titleKey: "buyer.home.productSections.discover.title",
    subtitleKey: "buyer.home.productSections.discover.subtitle",
    emptyTitleKey: "buyer.home.productSections.discover.emptyTitle",
    emptyMessageKey: "buyer.home.productSections.discover.emptyMessage",
  }),
]);

const HOME_FEED_LOADERS = Object.freeze({
  [HOME_FEED_KEYS.DISCOVER]: ({ page, pageSize, signal } = {}) =>
    getProducts({
      page,
      pageSize,
      signal,
      sort: "newest",
    }),
});

export const getProducts = (options = {}) =>
  productHttpAdapter.listProducts(options);

export const getProductsByCategory = (categoryId, options = {}) =>
  productHttpAdapter.listProducts({ ...options, categoryId });

// The authoritative SQL model has no collection persistence. Existing routes
// remain available and render the translated unavailable state.
export const getProductsByCollection = async () => ({
  items: [],
  page: 1,
  pageSize: 0,
  totalCount: 0,
  totalPages: 0,
  hasMore: false,
  nextCursor: null,
  filterOptions: {},
  collection: null,
  unavailableReason: "COLLECTIONS_NOT_SUPPORTED_BY_SCHEMA",
});

export const searchProducts = (search, options = {}) =>
  productHttpAdapter.listProducts({ ...options, search });

export const getProductById = (productId, options = {}) =>
  productHttpAdapter.getProduct(productId, options);

export const getRelatedProducts = (productId, options = {}) =>
  productHttpAdapter.getRelatedProducts(productId, {
    page: 1,
    pageSize: 4,
    ...options,
  });

export const getRecommendedFeed = async () => ({
  items: [],
  page: 1,
  pageSize: 0,
  totalCount: 0,
  totalPages: 0,
  hasMore: false,
  nextCursor: null,
  filterOptions: {},
});

export const getHomeSectionFeedLoader = (feedKey) =>
  HOME_FEED_LOADERS[feedKey] || null;

export const getHomeProductSections = async () => {
  const sections = await Promise.all(
    HOME_PRODUCT_SECTIONS.map(async (section) => {
      if (section.renderer !== HOME_SECTION_RENDERERS.PREVIEW) {
        return { ...section };
      }

      try {
        const page = await getProducts({
          page: 1,
          pageSize: HOME_PREVIEW_PAGE_SIZE,
          ...section.query,
        });
        const products = (page.items || []).filter((product) =>
          section.requireReviews ? Number(product.reviewCount || 0) > 0 : true
        );

        return { ...section, products };
      } catch (error) {
        console.error(`Failed to load home section ${section.id}:`, error);
        return { ...section, products: [], error: error?.code || "LOAD_FAILED" };
      }
    })
  );

  return dedupeHomePreviewSections(sections);
};

export const getProductDeliveryInfo = async () => productDeliveryInfo;
export const getProductTrustInfo = async () => productTrustInfo;
export const getCollectionDetails = async () => [];
