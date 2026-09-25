// src/components/product/ProductSection.jsx

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import useHorizontalRail from "../../hooks/useHorizontalRail.js";
import ProductCard from "./ProductCard.jsx";

const emptyProducts = [];

function ProductSection({
  section,
  title,
  subtitle,
  products,
  seeMoreLink,
  seeMorePath,
  loading = false,
  error = "",
}) {
  const { t } = useTranslation();
  const sectionTitle = title ?? section?.title;
  const sectionSubtitle = subtitle ?? section?.subtitle;
  const sectionProducts = products ?? section?.products ?? emptyProducts;
  const sectionSeeMoreLink =
    seeMorePath ??
    seeMoreLink ??
    section?.seeMorePath ??
    section?.seeMoreLink ??
    section?.viewAllLink;
  const uniqueProducts = useMemo(() => {
    const seenProductIds = new Set();

    return (Array.isArray(sectionProducts) ? sectionProducts : []).filter(
      (product) => {
        const productId = product?.productId;
        const normalizedProductId =
          productId === undefined || productId === null ? "" : String(productId);

        if (!normalizedProductId || seenProductIds.has(normalizedProductId)) {
          return false;
        }

        seenProductIds.add(normalizedProductId);
        return true;
      }
    );
  }, [sectionProducts]);
  const {
    railRef,
    canScrollBack,
    canScrollForward,
    scrollBack,
    scrollForward,
  } = useHorizontalRail(uniqueProducts.length);

  if (!sectionTitle || loading || error || uniqueProducts.length === 0) {
    return null;
  }

  return (
    <section className="product-section product-section--preview">
      <div className="container">
        <div className="product-section__header">
          <div>
            <h2>{sectionTitle}</h2>
            {sectionSubtitle && <p>{sectionSubtitle}</p>}
          </div>

          {sectionSeeMoreLink && (
            <Link to={sectionSeeMoreLink} className="product-section__link">
              {t("buyer.home.discovery.seeAll")}
            </Link>
          )}
        </div>

        <div className="product-section__carousel">
          {canScrollBack && (
            <button
              type="button"
              className="product-section__edge-arrow product-section__edge-arrow--previous"
              onClick={scrollBack}
              aria-label={t("buyer.home.discovery.previous", {
                title: sectionTitle,
              })}
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
          )}

          <div
            ref={railRef}
            className="product-section__track"
            aria-label={sectionTitle}
          >
            {uniqueProducts.map((product) => (
              <div className="product-section__item" key={product.productId}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {canScrollForward && (
            <button
              type="button"
              className="product-section__edge-arrow product-section__edge-arrow--next"
              onClick={scrollForward}
              aria-label={t("buyer.home.discovery.next", {
                title: sectionTitle,
              })}
            >
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProductSection;
