import { homeOffers, navbarLinks } from "../data/homeData.js";
import productHttpAdapter from "./adapters/productHttpAdapter.js";

const TOP_BRAND_LIMIT = 20;

const getBrandMark = (brand) => {
  const normalized = String(brand || "").trim().toLowerCase();

  if (["apple", "nike", "adidas", "huawei"].includes(normalized)) {
    return normalized;
  }

  return String(brand || "").trim();
};

export const getNavbarLinks = async () =>
  navbarLinks.map((link) => ({ ...link }));

export const getTopBrands = async (options = {}) => {
  const brands = await productHttpAdapter.listBrands({
    limit: options.limit || TOP_BRAND_LIMIT,
    signal: options.signal,
  });

  return brands.map((item) => ({
    id: item.brand,
    name: item.brand,
    mark: getBrandMark(item.brand),
    visibleProductCount: item.visibleProductCount,
    path: `/search?brand=${encodeURIComponent(item.brand)}`,
  }));
};

export const getHomeOffers = async () =>
  homeOffers.map((offer) => ({ ...offer }));
