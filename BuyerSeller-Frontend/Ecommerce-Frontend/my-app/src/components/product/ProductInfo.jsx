// src/components/product/ProductInfo.jsx

import { useTranslation } from "react-i18next";
import {
  getSelectedVariantDetails,
  getVariantAvailability,
  getVariantPriceInfo,
} from "../../services/productVariantService";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatProductInfoItem } from "../../utils/productInfoText.js";

function ProductInfo({
  product,
  selectedVariant,
  optionGroups = [],
  onSelectVariantOption,
}) {
  const { t } = useTranslation();

  if (!product) {
    return null;
  }

  const priceInfo = getVariantPriceInfo(selectedVariant);
  const availability = getVariantAvailability(selectedVariant);
  const variantDetails = getSelectedVariantDetails(selectedVariant);
  const detailItems = product.productInfo?.productDetails?.items || [];
  const visibleDetailItems = detailItems
    .map((item, index) => ({
      key: item?.id || item?.label || index,
      text: formatProductInfoItem(item),
    }))
    .filter((item) => item.text);

  return (
    <section className="product-info-box">
      <h1>{product.productName}</h1>

      {product.rating != null && (
        <div className="product-info-box__rating">
          <span
            aria-label={t("productReviews.ratingOutOfFive", {
              rating: Number(product.rating || 0).toFixed(1),
            })}
          >
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} aria-hidden="true">
                {index + 1 <= Math.round(Number(product.rating) || 0) ? "★" : "☆"}
              </span>
            ))}
          </span>
          <strong>{Number(product.rating || 0).toFixed(1)}</strong>
          {product.reviewCount != null && (
            <small>{t("productReviews.reviewCountShort", { count: product.reviewCount })}</small>
          )}
        </div>
      )}

      <div className="product-info-box__price-row">
        <strong>{formatCurrency(priceInfo.price)}</strong>

        {priceInfo.oldPrice && <del>{formatCurrency(priceInfo.oldPrice)}</del>}

        {priceInfo.discountText && (
          <span className="product-info-box__discount">
            {priceInfo.discountText}
          </span>
        )}
      </div>

      <p className="product-info-box__description">
        {product.shortDescription}
      </p>

      <ul className="product-info-box__features">
        {visibleDetailItems.map((item) => (
          <li key={item.key}>{item.text}</li>
        ))}
      </ul>

      {optionGroups.length > 0 && (
        <div className="product-info-box__options">
          {optionGroups.map((group) => {
            const selectedOption = group.options.find((option) => option.selected);

            return (
              <div className="product-info-box__option-group" key={group.key}>
                <div className="product-info-box__option-heading">
                  <h3>{t(`buyer.product.options.${group.key}`, { defaultValue: group.label })}</h3>
                  {selectedOption && (
                    <span className="product-info-box__option-current">
                      {t("buyer.product.selectedOption", { value: selectedOption.value })}
                    </span>
                  )}
                </div>

                <div className="product-info-box__variant-options">
                  {group.options.map((option) => (
                    <button
                      key={`${group.key}-${option.value}`}
                      type="button"
                      className={
                        option.selected
                          ? "product-info-box__variant-option product-info-box__variant-option--active"
                          : "product-info-box__variant-option"
                      }
                      onClick={() => onSelectVariantOption?.(group.key, option.value)}
                      disabled={option.disabled}
                      aria-pressed={option.selected}
                    >
                      <span>{option.value}</span>
                      {option.selected && (
                        <span
                          className="product-info-box__variant-check"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {variantDetails.length > 0 && (
        <dl className="product-info-box__variant-details">
          {variantDetails.map((detail) => (
            <div key={detail.label}>
              <dt>{t(`buyer.product.variantDetails.${detail.key || detail.label.toLowerCase()}`, { defaultValue: detail.label })}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className={`product-info-box__stock product-info-box__stock--${availability.tone}`}>
        {t(availability.labelKey, availability.labelParams)}
      </p>
    </section>
  );
}

export default ProductInfo;
