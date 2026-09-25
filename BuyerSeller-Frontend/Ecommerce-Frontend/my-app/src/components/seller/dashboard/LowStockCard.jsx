import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AuthenticatedImage from "../../common/AuthenticatedImage";
import DashboardEmptyIcon from "./DashboardEmptyIcon";
import "../../../styles/seller/LowStockCard.css";

function LowStockCard({ lowStockProducts = [] }) {
  const { t } = useTranslation();
  const products = Array.isArray(lowStockProducts)
    ? lowStockProducts.slice(0, 3)
    : [];

  return (
    <article className="seller-dashboard-card seller-low-stock-card">
      <div className="seller-dashboard-card__header">
        <h2>{t("dashboard.lowStockProducts")}</h2>

        <Link
          to="/seller/inventory"
          className="seller-dashboard-card__link-button"
        >
          {t("common.seeAll")}
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="seller-dashboard-widget-empty">
          <span className="seller-dashboard-widget-empty__icon">
            <DashboardEmptyIcon />
          </span>
          <strong>{t("dashboard.noLowStockProducts")}</strong>
          <p>
            {t("dashboard.noLowStockProductsDescription")}
          </p>
        </div>
      ) : (
        <div className="seller-low-stock-card__products">
          {products.map((product) => {
            const productName = String(
              product?.name || ""
            );

            return (
              <article
                key={
                  product?.variantId ||
                  product?.id ||
                  product?.sku
                }
                className="seller-low-stock-product"
              >
                <div className="seller-low-stock-product__visual">
                  <AuthenticatedImage
                    src={product?.image || ""}
                    alt={productName}
                    className="seller-low-stock-product__image"
                    fallback={
                      <span className="seller-low-stock-product__placeholder">
                        {productName
                          .charAt(0)
                          .toUpperCase() || "P"}
                      </span>
                    }
                  />
                </div>

                <div className="seller-low-stock-product__details">
                  <h3>{productName || "—"}</h3>

                  {product?.price !== null &&
                  product?.price !== undefined ? (
                    <span className="seller-low-stock-product__price">
                      {product.price}
                    </span>
                  ) : null}

                  <span className="seller-low-stock-product__stock">
                    {t("inventory.stockLeft", {
                      stock: Number(product?.stock) || 0,
                    })}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default LowStockCard;
