import productHttpAdapter from "./adapters/productHttpAdapter.js";
import { ROUTES } from "../routes/routePolicy.js";

const HOME_CATEGORY_LIMIT = 30;
export const HOME_QUICK_LINKS = Object.freeze([
  {
    id: "new-arrivals",
    labelKey: "buyer.home.quickLinks.newArrivals",
    path: "/search?sort=newest&newArrivals=1",
  },
  {
    id: "top-rated",
    labelKey: "buyer.home.quickLinks.topRated",
    path: "/search?sort=best-rated&minRating=4",
  },
  {
    id: "in-stock",
    labelKey: "buyer.home.quickLinks.inStock",
    path: "/search?inStock=1",
  },
  {
    id: "all-products",
    labelKey: "buyer.home.quickLinks.allProducts",
    path: "/search",
  },
]);

export const getCategories = (options = {}) =>
  productHttpAdapter.listCategories(options);

export const getHomeCategories = async (options = {}) =>
  (await getCategories(options)).slice(0, HOME_CATEGORY_LIMIT);

export const getCategoryBySlug = async (categorySlug, options = {}) =>
  (await getCategories(options)).find(
    (category) => String(category.categoryId) === String(categorySlug)
  ) || null;

export const getCategoryPath = (category) => {
  const routeValue = category?.categoryId;
  if (routeValue === undefined || routeValue === null) {
    return "";
  }

  return ROUTES.CATEGORY.replace(
    ":categorySlug",
    encodeURIComponent(String(routeValue))
  );
};

// Navigation choices are static UI configuration, not catalog records.
export const getHomeQuickLinks = async () =>
  HOME_QUICK_LINKS.map((link) => ({ ...link }));
