// src/components/product/ProductPurchasePanel.jsx

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import useCart from "../../hooks/useCart";
import useWishlist from "../../hooks/useWishlist";
import { getCurrentSession, isAuthenticated } from "../../services/authService";
import { getVariantAvailability } from "../../services/productVariantService";
import { getWishlistVariantId } from "../../services/wishlistService";

function ProductPurchasePanel({ product, selectedVariant }) {
  const [quantity, setQuantity] = useState(1);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, isCartMutating, cartError } = useCart();
  const { toggleWishlist, isInWishlist, isWishlistMutating, wishlistError } = useWishlist();
  const session = getCurrentSession();
  const isBuyerSession = session?.role === "Buyer";
  const variantId = getWishlistVariantId(selectedVariant);
  const availability = getVariantAvailability(selectedVariant);
  const canUseWishlist = variantId !== undefined && variantId !== null;
  const isFavorite = canUseWishlist && isInWishlist(variantId);
  const canAddToCart = Boolean(variantId && availability.isPurchasable);
  const canUseBuyerAction = !session || isBuyerSession;
  const cartButtonLabel = !canUseBuyerAction
    ? t("buyer.product.purchase.buyerOnly")
    : canAddToCart
      ? t("cart.addToCart")
      : t(availability.labelKey, availability.labelParams);
  const stockLimit = availability.stockLimit;

  useEffect(() => {
    setQuantity((currentQuantity) => {
      if (!stockLimit) {
        return 1;
      }

      return Math.min(Math.max(1, currentQuantity), stockLimit);
    });
  }, [selectedVariant?.variantId, stockLimit]);

  const sendGuestToLogin = (message) => {
    navigate("/login", {
      state: {
        from: location.pathname,
        message,
      },
    });
  };

  const increaseQuantity = () => {
    setQuantity((current) => {
      if (!stockLimit) {
        return 1;
      }

      return Math.min(stockLimit, current + 1);
    });
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const handleAddToCart = async () => {
    if (!canAddToCart) {
      return;
    }

    if (!isAuthenticated()) {
      sendGuestToLogin(
        t("buyer.product.purchase.signInToCart")
      );
      return;
    }

    if (!isBuyerSession) {
      return;
    }

    await addToCart({ variantId, quantity });
  };

  const handleWishlistClick = () => {
    if (!canUseWishlist) {
      return;
    }

    if (!isAuthenticated()) {
      sendGuestToLogin(
        t("buyerWishlist.signInRequired")
      );
      return;
    }

    if (!isBuyerSession) {
      return;
    }

    toggleWishlist(product, selectedVariant);
  };

  return (
    <aside className="product-purchase">
      <div className="product-purchase__quantity-header">
        <h3>{t("buyer.product.purchase.quantity")}</h3>

        <div className="product-purchase__quantity">
          <button
            type="button"
            onClick={decreaseQuantity}
            disabled={quantity <= 1}
            aria-label={t("buyer.product.purchase.decreaseQuantity")}
          >
            -
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            onClick={increaseQuantity}
            disabled={!stockLimit || quantity >= stockLimit}
            aria-label={t("buyer.product.purchase.increaseQuantity")}
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        className="product-purchase__cart-button"
        onClick={handleAddToCart}
        disabled={!canAddToCart || !canUseBuyerAction || isCartMutating}
      >
        {isCartMutating ? t("cart.adding") : cartButtonLabel}
      </button>

      {cartError ? (
        <p className="product-purchase__feedback" role="alert" aria-live="assertive">
          {cartError}
        </p>
      ) : null}

      <button
        type="button"
        className="product-purchase__wishlist-button"
        onClick={handleWishlistClick}
        disabled={!canUseWishlist || !canUseBuyerAction || isWishlistMutating}
      >
        {isFavorite ? t("buyerWishlist.remove") : t("buyerWishlist.add")}
      </button>

      {wishlistError ? (
        <p className="product-purchase__feedback" role="alert" aria-live="assertive">
          {wishlistError}
        </p>
      ) : null}

    </aside>
  );
}

export default ProductPurchasePanel;
