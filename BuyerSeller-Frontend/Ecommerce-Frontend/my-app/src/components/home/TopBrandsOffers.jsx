import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import useHorizontalRail from "../../hooks/useHorizontalRail.js";

function BrandMark({ brand }) {
  if (brand.mark === "apple") {
    return <span className="top-brands-offers__apple" aria-hidden="true"></span>;
  }

  if (brand.mark === "nike") {
    return <span className="top-brands-offers__nike" aria-hidden="true"></span>;
  }

  if (brand.mark === "adidas") {
    return (
      <span className="top-brands-offers__adidas" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    );
  }

  if (brand.mark === "huawei") {
    return (
      <span className="top-brands-offers__huawei" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </span>
    );
  }

  return <span className="top-brands-offers__wordmark">{brand.name}</span>;
}

function OfferIcon({ type }) {
  const icons = {
    tag: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z" />
      </svg>
    ),
    gift: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="m12 3-1.45 3.92a5.5 5.5 0 0 1-3.27 3.27L3.36 11.64l3.92 1.45a5.5 5.5 0 0 1 3.27 3.27L12 20.28l1.45-3.92a5.5 5.5 0 0 1 3.27-3.27l3.92-1.45-3.92-1.45a5.5 5.5 0 0 1-3.27-3.27L12 3Z" />
        <path d="M5 3v3M3.5 4.5h3M19 18v3M17.5 19.5h3" />
      </svg>
    ),
    truck: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="m12 2.8 8 4.4v6.6" />
        <path d="m4 7.2 8 4.4 8-4.4" />
        <path d="M12 11.6v9.2" />
        <path d="M9 19.15 5 17a2 2 0 0 1-1-1.74V7.2l8-4.4" />
        <path d="m15.5 17.5 1.7 1.7 3.3-3.4" />
      </svg>
    ),
  };

  return (
    <span
      className={`top-brands-offers__offer-icon top-brands-offers__offer-icon--${type}`}
      aria-hidden="true"
    >
      {icons[type] || icons.tag}
    </span>
  );
}

function TopBrandsOffers({ brands = [], offers = [] }) {
  const { t } = useTranslation();
  const hasBrands = brands.length > 0;
  const {
    railRef,
    canScrollBack,
    canScrollForward,
    scrollBack,
    scrollForward,
  } = useHorizontalRail(brands.length);

  if (!hasBrands && offers.length === 0) {
    return null;
  }

  return (
    <section className="top-brands-offers">
      <div className="container">
        {hasBrands && (
          <>
            <div className="top-brands-offers__header">
              <h2>{t("buyer.home.topBrands.title")}</h2>
              <Link to="/search" className="top-brands-offers__view-all">
                {t("buyer.home.topBrands.browseAll")}
              </Link>
            </div>

            <div className="top-brands-offers__brand-carousel">
              {canScrollBack && (
                <button
                  type="button"
                  className="top-brands-offers__rail-arrow top-brands-offers__rail-arrow--previous"
                  onClick={scrollBack}
                  aria-label={t("buyer.home.discovery.previous", {
                    title: t("buyer.home.topBrands.title"),
                  })}
                >
                  <span aria-hidden="true">&lsaquo;</span>
                </button>
              )}

              <div ref={railRef} className="top-brands-offers__brands">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    to={brand.path}
                    className="top-brands-offers__brand"
                    aria-label={t("buyer.home.topBrands.openBrand", {
                      brand: brand.name,
                      count: brand.visibleProductCount,
                    })}
                  >
                    <BrandMark brand={brand} />
                    <small>
                      {t("buyer.home.topBrands.productCount", {
                        count: brand.visibleProductCount,
                      })}
                    </small>
                  </Link>
                ))}
              </div>

              {canScrollForward && (
                <button
                  type="button"
                  className="top-brands-offers__rail-arrow top-brands-offers__rail-arrow--next"
                  onClick={scrollForward}
                  aria-label={t("buyer.home.discovery.next", {
                    title: t("buyer.home.topBrands.title"),
                  })}
                >
                  <span aria-hidden="true">&rsaquo;</span>
                </button>
              )}
            </div>
          </>
        )}

        {offers.length > 0 && (
          <div className="top-brands-offers__offers">
            {offers.map((offer) => (
              <Link key={offer.id} to={offer.path} className="top-brands-offers__offer">
                <OfferIcon type={offer.icon} />

                <span className="top-brands-offers__offer-copy">
                  <strong>{t(offer.titleKey)}</strong>
                  <small>{t(offer.subtitleKey)}</small>
                </span>

                <span className="top-brands-offers__offer-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" focusable="false">
                    <path d="M5 12h13" />
                    <path d="m14 7 5 5-5 5" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default TopBrandsOffers;
