// src/components/cart/CartSummary.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import useCart from "../../hooks/useCart";
import { formatCurrency } from "../../utils/formatCurrency";

function CartSummary({ cartCount }) {
  const { t } = useTranslation();
  const {
    subtotal,
    discount,
    total,
    currencyCode,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    isCartMutating,
    closeCart,
  } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    if (!appliedCoupon) {
      return;
    }

    setCouponCode(appliedCoupon.couponCode || "");
    setCouponMessage("");
  }, [appliedCoupon]);

  const handleApplyCoupon = async (event) => {
    event.preventDefault();

    if (isApplyingCoupon || isCartMutating) {
      return;
    }

    setIsApplyingCoupon(true);
    setCouponMessage("");

    try {
      const result = await applyCoupon(couponCode);
      setCouponMessage(result?.message || "");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode("");
    setCouponMessage(t("cart.couponRemoved"));
  };

  return (
    <footer className="cart-summary">
      <div className="cart-summary__row">
        <span>{t("cart.summary.subtotal")}</span>
        <strong>{formatCurrency(subtotal, currencyCode)}</strong>
      </div>

      {discount > 0 && (
        <div className="cart-summary__row cart-summary__row--discount">
          <span>{t("cart.summary.discount")}</span>
          <strong>-{formatCurrency(discount, currencyCode)}</strong>
        </div>
      )}

      <div className="cart-summary__row">
        <span>{t("cart.summary.shipping")}</span>
        <strong>{t("cart.summary.free")}</strong>
      </div>

      {appliedCoupon ? (
        <div className="cart-summary__promo-status" role="status">
          <span>
            {t("cart.couponActive", { code: appliedCoupon.couponCode })}
          </span>
          <button
            type="button"
            className="cart-summary__promo-remove"
            onClick={handleRemoveCoupon}
          >
            {t("cart.removeCoupon")}
          </button>
        </div>
      ) : (
        <form className="cart-summary__promo-form" onSubmit={handleApplyCoupon}>
          <label className="cart-summary__promo-label" htmlFor="cart-coupon-code">
            {t("cart.promoCode")}
          </label>
          <div className="cart-summary__promo-controls">
            <input
              id="cart-coupon-code"
              className="cart-summary__promo-input"
              type="text"
              value={couponCode}
              onChange={(event) => {
                setCouponCode(event.target.value.toUpperCase());
                setCouponMessage("");
              }}
              placeholder={t("cart.promoPlaceholder")}
              maxLength={50}
              autoComplete="off"
              disabled={isApplyingCoupon || isCartMutating}
            />
            <button
              type="submit"
              className="cart-summary__promo-button"
              disabled={isApplyingCoupon || isCartMutating}
            >
              {t(isApplyingCoupon ? "cart.applyingCoupon" : "cart.applyCoupon")}
            </button>
          </div>
        </form>
      )}

      {couponMessage && (
        <p className="cart-summary__promo-message" role="status" aria-live="polite">
          {couponMessage}
        </p>
      )}

      <div className="cart-summary__row cart-summary__row--total">
        <span>{t("cart.summary.total")}</span>
        <strong>{formatCurrency(total, currencyCode)}</strong>
      </div>

      <Link
        to="/checkout"
        className="cart-summary__checkout"
        onClick={closeCart}
      >
        <span>
          <small>{t("cart.summary.items", { count: cartCount })}</small>
          <strong>{formatCurrency(total, currencyCode)}</strong>
        </span>

        <span>{t("cart.summary.proceed")}</span>
      </Link>
    </footer>
  );
}

export default CartSummary;
