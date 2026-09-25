import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Navbar from "../../components/layout/Navbar";
import useCart from "../../hooks/useCart";
import { formatCurrency } from "../../utils/formatCurrency";

function getVariantDetails(item) {
  return [
    item.variantName,
    item.sku,
    item.size,
    item.color,
    item.storageCapacity,
  ].filter(Boolean);
}

function CartPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    cartItems,
    cartCount,
    subtotal,
    total,
    currencyCode,
    clearCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    isCartLoading,
    isCartMutating,
    cartError,
  } = useCart();
  const isEmpty = cartItems.length === 0;

  const handleCheckout = () => {
    if (isEmpty) {
      return;
    }

    navigate("/checkout");
  };

  return (
    <>
      <Navbar />

      <main className="cart-page">
        <section className="container cart-page__layout">
          <header className="cart-page__header">
            <div>
              <h1>{t("cart.page.title")}</h1>
              <p>{t("cart.page.ready", { count: cartCount })}</p>
            </div>

            {!isEmpty && (
              <button
                type="button"
                onClick={clearCart}
                disabled={isCartMutating}
              >
                {t("buyer.cart.clear")}
              </button>
            )}
          </header>

          {cartError ? (
            <p className="cart-feedback" role="alert">
              {cartError}
            </p>
          ) : null}

          {isCartLoading ? (
            <p className="cart-feedback" role="status">
              {t("cart.loading")}
            </p>
          ) : isEmpty ? (
            <section className="cart-page__empty">
              <div className="cart-drawer__empty-illustration" aria-hidden="true">
                &#128722;
              </div>
              <h2>{t("cart.page.emptyTitle")}</h2>
              <p>{t("cart.page.emptyMessage")}</p>
              <Link to="/">{t("cart.page.shopNow")}</Link>
              <div className="cart-page__empty-checkout">
                <button type="button" disabled aria-describedby="empty-cart-checkout-note">
                  {t("cart.page.checkout")}
                </button>
                <p id="empty-cart-checkout-note">
                  {t("cart.page.checkoutDisabledHint")}
                </p>
              </div>
            </section>
          ) : (
            <div className="cart-page__content">
              <section className="cart-page__items" aria-label={t("cart.page.itemsAria")}>
                {cartItems.map((item) => {
                  const variantDetails = getVariantDetails(item);
                  const variantId = item.variantId;
                  const quantity = item.quantity;
                  const stock = item.availableStock;
                  const isIncreaseDisabled = stock !== null && quantity >= stock;
                  const canShowPriceChange =
                    item.priceChanged &&
                    Number.isFinite(item.unitPriceAtAdd) &&
                    Number.isFinite(item.unitPrice);

                  return (
                    <article
                      className="cart-page-item"
                      key={item.cartItemId ?? variantId}
                    >
                      <div className="cart-page-item__image">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} />
                        ) : (
                          <span>{t("cart.page.productPlaceholder")}</span>
                        )}
                      </div>

                      <div className="cart-page-item__body">
                        <h2>{item.productName}</h2>
                        {variantDetails.length > 0 && (
                          <p>{variantDetails.join(" / ")}</p>
                        )}
                        {canShowPriceChange && (
                          <p className="cart-item__price-change" role="status">
                            {t("cart.priceChanged", {
                              oldPrice: formatCurrency(item.unitPriceAtAdd, currencyCode),
                              newPrice: formatCurrency(item.unitPrice, currencyCode),
                            })}
                          </p>
                        )}
                      </div>

                      <strong>{formatCurrency(item.unitPrice, currencyCode)}</strong>

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

                      <strong>{formatCurrency(item.subtotal, currencyCode)}</strong>

                      <button
                        type="button"
                        className="cart-page-item__remove"
                        onClick={() => removeFromCart(variantId)}
                        disabled={isCartMutating}
                      >
                        {t("cart.page.remove")}
                      </button>
                    </article>
                  );
                })}
              </section>

              <aside className="cart-page-summary">
                <h2>{t("cart.summary.orderSummary")}</h2>
                <div className="cart-summary__row">
                  <span>{t("cart.summary.subtotal")}</span>
                  <strong>{formatCurrency(subtotal, currencyCode)}</strong>
                </div>
                <div className="cart-summary__row">
                  <span>{t("cart.summary.shipping")}</span>
                  <strong>{t("cart.summary.free")}</strong>
                </div>
                <div className="cart-summary__row cart-page-summary__total">
                  <span>{t("cart.summary.total")}</span>
                  <strong>{formatCurrency(total, currencyCode)}</strong>
                </div>
                <button
                  type="button"
                  className="cart-summary__checkout"
                  onClick={handleCheckout}
                  disabled={isEmpty}
                >
                  <span>
                    <small>{t("cart.summary.items", { count: cartCount })}</small>
                    <strong>{formatCurrency(total, currencyCode)}</strong>
                  </span>
                  <span>{t("cart.summary.checkout")}</span>
                </button>
              </aside>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default CartPage;
