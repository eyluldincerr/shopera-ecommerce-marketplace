import newArrivalsHero from "../assets/hero/shopera-new-arrivals.webp";
import topRatedHero from "../assets/hero/shopera-top-rated.webp";
import bestSellersHero from "../assets/hero/shopera-best-sellers.webp";

export const heroSlides = [
  {
    id: "new-arrivals",
    titleKey: "buyer.home.hero.newArrivals.title",
    subtitleKey: "buyer.home.hero.newArrivals.subtitle",
    buttonKey: "buyer.home.hero.newArrivals.button",
    buttonLink: "/search?sort=newest&newArrivals=1",
    imageAltKey: "buyer.home.hero.newArrivals.imageAlt",
    imageUrl: newArrivalsHero,
    theme: "new-arrivals",
  },
  {
    id: "top-rated",
    titleKey: "buyer.home.hero.topRated.title",
    subtitleKey: "buyer.home.hero.topRated.subtitle",
    buttonKey: "buyer.home.hero.topRated.button",
    buttonLink: "/search?sort=best-rated&minRating=4",
    imageAltKey: "buyer.home.hero.topRated.imageAlt",
    imageUrl: topRatedHero,
    theme: "top-rated",
  },
  {
    id: "best-sellers",
    titleKey: "buyer.home.productSections.bestSellers.title",
    subtitleKey: "buyer.home.productSections.bestSellers.subtitle",
    buttonKey: "buyer.cart.shopNow",
    buttonLink: "/search?sort=best-selling",
    imageAltKey: "buyer.home.productSections.bestSellers.title",
    imageUrl: bestSellersHero,
    theme: "best-sellers",
  },
];
