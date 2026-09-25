import storeHttpAdapter from "./adapters/storeHttpAdapter.js";

const NAVBAR_STORE_CACHE_MS = 60_000;
let navbarStoreCache = null;

export const getPublicStores = (options = {}) =>
  storeHttpAdapter.listPublicStores(options);

export const getPublicStore = (storeId, options = {}) =>
  storeHttpAdapter.getPublicStore(storeId, options);

export const getPublicStoreBySlug = (storeSlug, options = {}) =>
  storeHttpAdapter.getPublicStoreBySlug(storeSlug, options);

export const getPublicStoreProducts = (storeId, options = {}) =>
  storeHttpAdapter.listPublicStoreProducts(storeId, options);

export const getNavbarStorePreview = async ({ force = false } = {}) => {
  const now = Date.now();

  if (
    !force &&
    navbarStoreCache &&
    now - navbarStoreCache.loadedAt < NAVBAR_STORE_CACHE_MS
  ) {
    return {
      items: navbarStoreCache.items.map((store) => ({ ...store })),
      totalCount: navbarStoreCache.totalCount,
    };
  }

  const page = await getPublicStores({ page: 1, pageSize: 8 });
  const result = {
    items: (page.items || []).map((store) => ({ ...store })),
    totalCount: Number(page.totalCount) || 0,
  };

  navbarStoreCache = {
    ...result,
    loadedAt: now,
  };

  return result;
};
