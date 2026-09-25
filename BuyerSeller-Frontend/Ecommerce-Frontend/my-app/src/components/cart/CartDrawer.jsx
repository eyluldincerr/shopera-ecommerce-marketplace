// src/components/cart/CartDrawer.jsx

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import CartItem from "./CartItem";
import CartSummary from "./CartSummary";
import useCart from "../../hooks/useCart";
import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";

function CartDrawer() {
  const { t } = useTranslation();
  const {
    cartItems,
    isCartOpen,
    cartCount,
    closeCart,
    clearCart,
    isCartLoading,
    isCartMutating,
    cartError,
  } = useCart();
  const cartOverlay = useOverlayAccessibility({
    isOpen: isCartOpen,
    onClose: closeCart,
  });

  return (
    <div ref={cartOverlay.overlayRef} className="cart-drawer-layer">
      <div
        className={`cart-drawer-overlay ${
          isCartOpen ? "cart-drawer-overlay--open" : ""
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        className={`cart-drawer ${isCartOpen ? "cart-drawer--open" : ""}`}
        role="dialog"
        aria-modal={isCartOpen ? "true" : undefined}
        aria-labelledby="cart-drawer-title"
        aria-describedby="cart-drawer-description"
        inert={!isCartOpen}
        tabIndex="-1"
      >
        <header className="cart-drawer__header">
          <div className="cart-drawer__title">
            <span className="cart-drawer__icon" aria-hidden="true">
              &#128722;
            </span>
            <h2 id="cart-drawer-title">{t("cart.title")}</h2>
            <p id="cart-drawer-description" className="visually-hidden">
              {t("buyer.cart.description", { count: cartCount })}
            </p>

            {cartItems.length > 0 && (
              <button
                type="button"
                className="cart-drawer__clear"
                onClick={clearCart}
                disabled={isCartMutating}
              >
                {t("buyer.cart.clear")}
              </button>
            )}
          </div>

          <button
            ref={cartOverlay.initialFocusRef}
            type="button"
            className="cart-drawer__close"
            onClick={closeCart}
            aria-label={t("buyer.cart.close")}
          >
            &times;
          </button>
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
        ) : cartItems.length > 0 ? (
          <>
            <div className="cart-drawer__items">
              {cartItems.map((item) => (
                <CartItem key={item.cartItemId ?? item.variantId} item={item} />
              ))}
            </div>

            <CartSummary cartCount={cartCount} />
          </>
        ) : (
          <div className="cart-drawer__empty">
            <div className="cart-drawer__empty-illustration">
              &#128722;
            </div>

            <h3>{t("buyer.cart.empty")}</h3>

            <Link
              to="/"
              className="cart-drawer__shop-button"
              onClick={closeCart}
            >
              {t("buyer.cart.shopNow")}
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}

export default CartDrawer;
