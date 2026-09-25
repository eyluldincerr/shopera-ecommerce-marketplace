// Static navigation and campaign presentation are UI configuration, not catalog data.
// Every destination below maps to a real public catalogue query supported by the backend.
export const navbarLinks = [
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
];

export const homeOffers = [
  {
    id: "top-rated",
    titleKey: "buyer.home.offers.topRated.title",
    subtitleKey: "buyer.home.offers.topRated.subtitle",
    icon: "tag",
    path: "/search?sort=best-rated&minRating=4",
  },
  {
    id: "new-arrivals",
    titleKey: "buyer.home.offers.newArrivals.title",
    subtitleKey: "buyer.home.offers.newArrivals.subtitle",
    icon: "gift",
    path: "/search?sort=newest&newArrivals=1",
  },
  {
    id: "in-stock",
    titleKey: "buyer.home.offers.inStock.title",
    subtitleKey: "buyer.home.offers.inStock.subtitle",
    icon: "truck",
    path: "/search?inStock=1",
  },
];
