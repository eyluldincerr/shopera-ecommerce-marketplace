import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { getStoreRoute } from "../../routes/routePolicy.js";

function ProductStoreCard({ product }) {
  const { t } = useTranslation();
  const [logoBroken, setLogoBroken] = useState(false);
  const store = product?.store || {};
  const storeId = store.storeId ?? product?.storeId;
  const storeName = store.storeName || product?.storeName || "";
  const storeLogoUrl = store.storeLogoUrl || "";
  const productCount = Number(store.visibleProductCount) || 0;
  const initial = storeName.trim().charAt(0).toUpperCase() || "S";

  if (!storeId || !storeName) {
    return null;
  }

  return (
    <aside className="product-store-card" aria-labelledby="product-store-title">
      <span className="product-store-card__eyebrow">
        {t("buyer.product.storeSeller.eyebrow")}
      </span>

      <div className="product-store-card__identity">
        <span className="product-store-card__logo" aria-hidden="true">
          {storeLogoUrl && !logoBroken ? (
            <img src={storeLogoUrl} alt="" onError={() => setLogoBroken(true)} />
          ) : (
            initial
          )}
        </span>

        <div>
          <h2 id="product-store-title">{storeName}</h2>
          <p>
            {store.storeDescription ||
              t("buyer.product.storeSeller.fallbackDescription")}
          </p>
        </div>
      </div>

      <div className="product-store-card__footer">
        {productCount > 0 ? (
          <span>
            {t("buyer.product.storeSeller.products", { count: productCount })}
          </span>
        ) : (
          <span>{t("buyer.product.storeSeller.shoperaStore")}</span>
        )}

        <Link to={getStoreRoute(storeId)}>
          {t("buyer.product.storeSeller.visitStore")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}

export default ProductStoreCard;
