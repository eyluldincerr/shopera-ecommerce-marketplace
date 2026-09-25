// src/components/cart/CartItem.jsx

import { useTranslation } from "react-i18next";

import useCart from "../../hooks/useCart";
import { formatCurrency } from "../../utils/formatCurrency";

function CartItem({ item }) {
  const { t } = useTranslation();
  const {
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    isCartMutating,
    currencyCode,
  } = useCart();

  if (!item) {
    return null;
  }

  const variantId = item.variantId;
  const quantity = item.quantity;
  const stock = item.availableStock;
  const isIncreaseDisabled = stock !== null && quantity >= stock;
  const canShowPriceChange =
    item.priceChanged &&
    Number.isFinite(item.unitPriceAtAdd) &&
    Number.isFinite(item.unitPrice);

  return (
    <article className="cart-item">
      <button
        type="button"
        className="cart-item__remove"
        onClick={() => removeFromCart(variantId)}
        disabled={isCartMutating}
        aria-label={t("cart.page.removeAria", { product: item.productName })}
      >
        &times;
      </button>

      <div className="cart-item__image-box">
        {item.image ? (
          <img src={item.image} alt={item.productName} />
        ) : (
          <div className="cart-item__image-placeholder">{t("cart.page.productPlaceholder")}</div>
        )}
      </div>

      <div className="cart-item__content">
        <h3>{item.productName}</h3>

        {canShowPriceChange && (
          <p className="cart-item__price-change" role="status">
            {t("cart.priceChanged", {
              oldPrice: formatCurrency(item.unitPriceAtAdd, currencyCode),
              newPrice: formatCurrency(item.unitPrice, currencyCode),
            })}
          </p>
        )}

        <div className="cart-item__bottom">
          <div className="cart-item__quantity">
            <button
              type="button"
              onClick={() => decreaseQuantity(variantId)}
              disabled={isCartMutating}
              aria-label={t("cart.page.decreaseQuantity", { product: item.productName })}
            >
              -
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              onClick={() => increaseQuantity(variantId)}
              disabled={isIncreaseDisabled || isCartMutating}
              aria-label={t("cart.page.increaseQuantity", { product: item.productName })}
            >
              +
            </button>
          </div>

          <strong>
            {formatCurrency(item.subtotal, currencyCode)}
          </strong>
        </div>
      </div>
    </article>
  );
}

export default CartItem;
