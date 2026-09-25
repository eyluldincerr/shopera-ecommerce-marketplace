import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ProductGrid from "./ProductGrid.jsx";

function RelatedProducts({ products = [], categoryId = null }) {
  const { t } = useTranslation();
  const safeProducts = Array.isArray(products) ? products : [];
  const browsePath = categoryId
    ? `/categories/${encodeURIComponent(String(categoryId))}`
    : "/search";

  if (safeProducts.length === 0) {
    return null;
  }

  const sizeClass =
    safeProducts.length === 1
      ? "related-products--single"
      : safeProducts.length === 2
        ? "related-products--compact"
        : "";

  return (
    <section className={`related-products ${sizeClass}`.trim()}>
      <div className="related-products__header">
        <h2>{t("buyer.product.related.title")}</h2>

        <Link to={browsePath}>{t("buyer.product.related.browse")}</Link>
      </div>

      <ProductGrid products={safeProducts} />
    </section>
  );
}

export default RelatedProducts;
