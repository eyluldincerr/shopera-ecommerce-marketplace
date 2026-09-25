// src/components/product/WishlistButton.jsx

import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import useWishlist from "../../hooks/useWishlist";
import { getCurrentSession, isAuthenticated } from "../../services/authService";
import {
  getWishlistVariantId,
  resolveWishlistVariant,
} from "../../services/wishlistService";

function WishlistButton({ product, variant }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const { toggleWishlist, isInWishlist, isWishlistMutating } = useWishlist();

  const session = getCurrentSession();
  const canUseBuyerAction = !session || session.role === "Buyer";
  const selectedVariant = resolveWishlistVariant(product, variant);
  const variantId = getWishlistVariantId(selectedVariant);
  const productName = product?.productName || "product";
  const canUseWishlist = variantId !== undefined && variantId !== null;
  const isFavorite = canUseWishlist && isInWishlist(variantId);

  const handleWishlistClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseWishlist) {
      return;
    }

    if (!isAuthenticated()) {
      navigate("/login", {
        state: {
          from: location.pathname,
          message: t("buyerWishlist.signInRequired"),
        },
      });

      return;
    }

    if (session?.role !== "Buyer") {
      return;
    }

    toggleWishlist(product, selectedVariant);
  };

  return (
    <button
      type="button"
      className={`wishlist-toggle ${
        isFavorite ? "wishlist-toggle--active" : ""
      }`}
      onClick={handleWishlistClick}
      disabled={!canUseWishlist || !canUseBuyerAction || isWishlistMutating}
      aria-label={
        isFavorite
          ? t("buyerWishlist.removeAria", { product: productName })
          : t("buyerWishlist.addAria", { product: productName })
      }
      title={isFavorite ? t("buyerWishlist.remove") : t("buyerWishlist.add")}
    >
      <span aria-hidden="true">{isFavorite ? "\u2665" : "\u2661"}</span>
    </button>
  );
}

export default WishlistButton;
