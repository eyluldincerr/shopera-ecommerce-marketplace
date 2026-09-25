// src/components/product/ProductTabs.jsx

import { useState } from "react";
import { useTranslation } from "react-i18next";
import ProductReviews from "./ProductReviews.jsx";
import {
  formatProductInfoItem,
  toProductInfoText,
} from "../../utils/productInfoText.js";

function ProductTabs({ product, onReviewStatsChange }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("details");

  if (!product) {
    return null;
  }

  const tabs = [
    { id: "details", label: t("productReviews.tabs.details") },
    { id: "specifications", label: t("productReviews.tabs.specifications") },
    { id: "box", label: t("productReviews.tabs.box") },
    { id: "reviews", label: t("productReviews.tabs.reviews") },
  ];

  const detailItems = (product.productInfo?.productDetails?.items || [])
    .map((item, index) => ({
      key: item?.id || item?.label || index,
      text: formatProductInfoItem(item),
    }))
    .filter((item) => item.text);
  const specificationItems = (
    product.productInfo?.specifications?.groups || []
  )
    .flatMap((group) => group.items || [])
    .map((item, index) => ({
      key: item?.id || item?.label || index,
      label: toProductInfoText(item?.label),
      value: toProductInfoText(item?.value),
    }))
    .filter((item) => item.label || item.value);
  const boxItems = (product.productInfo?.whatsInTheBox?.items || [])
    .map((item, index) => ({
      key: item?.id || item?.label || index,
      text: formatProductInfoItem(item),
    }))
    .filter((item) => item.text);

  return (
    <section className="product-tabs">
      <div className="product-tabs__header" role="tablist" aria-label={t("productReviews.tabs.ariaLabel")}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "product-tabs__button--active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="product-tabs__content">
        {activeTab === "details" && (
          <ul>
            {detailItems.map((item) => (
              <li key={item.key}>{item.text}</li>
            ))}
          </ul>
        )}

        {activeTab === "specifications" && (
          <div className="product-tabs__specs">
            {specificationItems.map((item) => (
              <div key={item.key}>
                {item.label && <strong>{item.label}</strong>}
                {item.value && <span>{item.value}</span>}
              </div>
            ))}
          </div>
        )}

        {activeTab === "box" && (
          <ul>
            {boxItems.map((item) => (
              <li key={item.key}>{item.text}</li>
            ))}
          </ul>
        )}

        {activeTab === "reviews" && (
          <ProductReviews
            productId={product.productId}
            initialAverageRating={product.rating ?? 0}
            initialReviewCount={product.reviewCount ?? 0}
            onStatsChange={onReviewStatsChange}
          />
        )}
      </div>
    </section>
  );
}

export default ProductTabs;
