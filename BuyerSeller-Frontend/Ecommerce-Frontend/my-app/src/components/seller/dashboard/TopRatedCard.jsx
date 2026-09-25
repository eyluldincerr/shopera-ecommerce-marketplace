import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AuthenticatedImage from "../../common/AuthenticatedImage";
import DashboardEmptyIcon from "./DashboardEmptyIcon";
import "../../../styles/seller/TopRatedCard.css";

function TopRatedCard({ topRatedProducts = [] }) {
  const { t } = useTranslation();
  const products = Array.isArray(topRatedProducts)
    ? topRatedProducts.slice(0, 5)
    : [];

  const renderStars = (rating) => {
    const numericRating = Number(rating);
    const rounded = Number.isFinite(numericRating)
      ? Math.min(5, Math.max(0, Math.round(numericRating)))
      : 0;

    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={
          index < rounded
            ? "seller-top-rated-product__star seller-top-rated-product__star--active"
            : "seller-top-rated-product__star"
        }
      >
        ★
      </span>
    ));
  };

  return (
    <article className="seller-dashboard-card seller-top-rated-card">
      <div className="seller-dashboard-card__header">
        <h2>{t("dashboard.topRatedProducts")}</h2>

        <Link
          to="/seller/products"
          className="seller-dashboard-card__link-button"
        >
          {t("common.seeAll")}
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="seller-dashboard-widget-empty">
          <span className="seller-dashboard-widget-empty__icon">
            <DashboardEmptyIcon type="star" />
          </span>
          <strong>{t("dashboard.noRatedProducts")}</strong>
          <p>{t("dashboard.noRatedProductsDescription")}</p>
        </div>
      ) : (
        <div className="seller-top-rated-card__list">
          {products.map((product) => {
            const productName = String(
              product?.name || ""
            );

            return (
              <article
                key={product?.productId || product?.id}
                className="seller-top-rated-product"
              >
                <div className="seller-top-rated-product__image">
                  <AuthenticatedImage
                    src={product?.image || ""}
                    alt={productName}
                    fallback={
                      <span className="seller-top-rated-product__placeholder">
                        {productName
                          .charAt(0)
                          .toUpperCase() || "P"}
                      </span>
                    }
                  />
                </div>

                <div className="seller-top-rated-product__info">
                  <h3>{productName || "—"}</h3>
                </div>

                <div className="seller-top-rated-product__rating">
                  <div className="seller-top-rated-product__stars">
                    {renderStars(product?.rating)}
                  </div>

                  <span className="seller-top-rated-product__reviews">
                    ({Number(product?.reviewCount) || 0})
                  </span>
                </div>

                {product?.price !== null &&
                product?.price !== undefined ? (
                  <strong className="seller-top-rated-product__price">
                    {product.price}
                  </strong>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default TopRatedCard;
