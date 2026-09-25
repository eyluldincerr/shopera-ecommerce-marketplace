import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import brandLogo from "../../assets/logo.png";
import "../../styles/layout/footer.css";

const copy = {
  en: {
    description:
      "Discover products from approved stores, save favourites, follow your orders and enjoy a clearer shopping experience in one place.",
    exploreTitle: "Explore",
    shopAll: "Shop all products",
    stores: "Discover stores",
    newArrivals: "New arrivals",
    topRated: "Top rated",
    accountTitle: "Your Shopera",
    favourites: "Favourites",
    orders: "My orders",
    coupons: "Coupons",
    support: "Help & support",
    confidenceLabel: "Shopping confidence",
    approvedStores: "Approved store discovery",
    buyerRatings: "Real buyer ratings",
    orderTracking: "Order and shipment tracking",
    noteKicker: "Discover more",
    noteTitle: "Shop store by store",
    noteBody:
      "Explore active Shopera stores, their products and their public storefront content from one place.",
    noteAction: "Browse stores",
    copyright: "© 2026 Shopera. All rights reserved.",
    bottomLine: "Products, stores and shopping tools — designed to stay simple.",
  },
  tr: {
    description:
      "Onaylı mağazalardaki ürünleri keşfedin, favorilerinizi kaydedin, siparişlerinizi takip edin ve alışverişinizi tek yerde daha kolay yönetin.",
    exploreTitle: "Keşfet",
    shopAll: "Tüm ürünler",
    stores: "Mağazaları keşfet",
    newArrivals: "Yeni gelenler",
    topRated: "En yüksek puanlı",
    accountTitle: "Shopera Hesabınız",
    favourites: "Favoriler",
    orders: "Siparişlerim",
    coupons: "Kuponlar",
    support: "Yardım ve destek",
    confidenceLabel: "Alışveriş güveni",
    approvedStores: "Onaylı mağaza keşfi",
    buyerRatings: "Gerçek alıcı puanları",
    orderTracking: "Sipariş ve gönderi takibi",
    noteKicker: "Daha fazlasını keşfet",
    noteTitle: "Mağaza mağaza alışveriş yapın",
    noteBody:
      "Aktif Shopera mağazalarını, ürünlerini ve herkese açık mağaza içeriklerini tek yerden keşfedin.",
    noteAction: "Mağazalara göz at",
    copyright: "© 2026 Shopera. Tüm hakları saklıdır.",
    bottomLine: "Ürünler, mağazalar ve alışveriş araçları — sade kalacak şekilde tasarlandı.",
  },
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M5 12h13" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function HomeFooter() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.toLowerCase().startsWith("tr") ? "tr" : "en";
  const text = copy[language];

  const footerGroups = [
    {
      title: text.exploreTitle,
      links: [
        { to: "/search", label: text.shopAll },
        { to: "/stores", label: text.stores },
        { to: "/search?sort=newest&newArrivals=1", label: text.newArrivals },
        { to: "/search?sort=best-rated&minRating=4", label: text.topRated },
      ],
    },
    {
      title: text.accountTitle,
      links: [
        { to: "/wishlist", label: text.favourites },
        { to: "/account/orders", label: text.orders },
        { to: "/account/coupons", label: text.coupons },
        { to: "/account/support", label: text.support },
      ],
    },
  ];

  const confidenceItems = [
    text.approvedStores,
    text.buyerRatings,
    text.orderTracking,
  ];

  return (
    <footer className="shopera-footer">
      <div className="container shopera-footer__container">
        <div className="shopera-footer__main">
          <section className="shopera-footer__brand" aria-label="Shopera">
            <Link to="/" className="shopera-footer__logo-link">
              <img src={brandLogo} alt="Shopera" className="shopera-footer__logo" />
            </Link>
            <p>{text.description}</p>

            <div className="shopera-footer__confidence" aria-label={text.confidenceLabel}>
              {confidenceItems.map((item) => (
                <span key={item}>
                  <i aria-hidden="true"><CheckIcon /></i>
                  {item}
                </span>
              ))}
            </div>
          </section>

          {footerGroups.map((group) => (
            <nav key={group.title} className="shopera-footer__links" aria-label={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to}>
                      <span>{link.label}</span>
                      <ArrowIcon />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <section className="shopera-footer__note">
            <span className="shopera-footer__note-kicker">{text.noteKicker}</span>
            <h2>{text.noteTitle}</h2>
            <p>{text.noteBody}</p>
            <Link to="/stores" className="shopera-footer__store-link">
              {text.noteAction}
              <ArrowIcon />
            </Link>
          </section>
        </div>

        <div className="shopera-footer__bottom">
          <span>{text.copyright}</span>
          <span>{text.bottomLine}</span>
        </div>
      </div>
    </footer>
  );
}

export default HomeFooter;
