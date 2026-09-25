// src/components/product/ProductCard.jsx

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import useCart from "../../hooks/useCart";
import { getCurrentSession, isAuthenticated } from "../../services/authService";
import {
  getWishlistVariantId,
  resolveWishlistVariant,
} from "../../services/wishlistService";
import { formatCurrency } from "../../utils/formatCurrency";
import { getVariantAvailability } from "../../services/productVariantService";
import WishlistButton from "./WishlistButton.jsx";

function ProductCard({ product }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { addToCart, isCartMutating } = useCart();

  if (!product) {
    return null;
  }

  const wishlistVariant = resolveWishlistVariant(product);
  const session = getCurrentSession();
  const canUseBuyerAction = !session || session.role === "Buyer";
  const productId = product.productId;
  const variantId = getWishlistVariantId(wishlistVariant);
  const variantAvailability = getVariantAvailability(wishlistVariant);
  const canAddDirectly = Boolean(
    variantId && variantAvailability.isPurchasable
  );
  const primaryImage =
    product.primaryImage ||
    product.images?.find((image) => image.isPrimary)?.imageUrl ||
    product.images?.[0]?.imageUrl ||
    "";
  const displayPrice =
    product.minPrice ?? wishlistVariant?.price ?? product.variants?.[0]?.price ?? 0;
  const rating = Number(product.rating);
  const reviewCount = Number(product.reviewCount);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const sellerLabel = product.brand || product.storeName || "Shopera";

  const handleAddToCart = async () => {
    if (!canAddDirectly) {
      return;
    }

    if (!isAuthenticated()) {
      navigate("/login", {
        state: {
          from: location.pathname,
          message: t("buyer.product.purchase.signInToCart"),
        },
      });

      return;
    }

    if (session?.role !== "Buyer") {
      return;
    }

    await addToCart({ variantId, quantity: 1 });
  };

  return (
    <article className="product-card">
      <div className="product-card__media">
        <WishlistButton product={product} variant={wishlistVariant} />

        <Link
          to={`/products/${productId}`}
          className="product-card__image-link"
          aria-label={t("cart.viewProduct")}
        >
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.productName}
              className="product-card__image"
            />
          ) : (
            <div className="product-card__image-placeholder">
              <span className="product-card__placeholder-mark" aria-hidden="true">
                ◇
              </span>
              <span>{t("buyer.product.imagePlaceholder")}</span>
            </div>
          )}
        </Link>

        {product.badge && (
          <span className="product-card__badge">{product.badge}</span>
        )}
      </div>

      <div className="product-card__content">
        <div className="product-card__meta-row">
          <span className="product-card__seller">{sellerLabel}</span>
          {hasRating && (
            <span className="product-card__rating" title={`${rating.toFixed(1)} / 5`}>
              <span aria-hidden="true">★</span>
              <strong>{rating.toFixed(1)}</strong>
              {Number.isFinite(reviewCount) && reviewCount > 0 && (
                <span className="product-card__reviews">({reviewCount})</span>
              )}
            </span>
          )}
        </div>

        <Link to={`/products/${productId}`} className="product-card__name">
          {product.productName}
        </Link>

        <div className="product-card__footer">
          <div className="product-card__price-stack">
            <span className="product-card__price">
              {formatCurrency(displayPrice)}
            </span>
          </div>

          <div className="product-card__quick-actions">
            {canAddDirectly && (
              <button
                type="button"
                className="product-card__quick-add"
                onClick={handleAddToCart}
                disabled={!canUseBuyerAction || isCartMutating}
                aria-label={t("cart.addProduct", {
                  productName: product.productName,
                })}
                title={isCartMutating ? t("cart.adding") : t("cart.addToCart")}
              >
                <span aria-hidden="true">+</span>
              </button>
            )}

            <Link
              to={`/products/${productId}`}
              className="product-card__open"
              aria-label={t("cart.viewProduct")}
              title={t("cart.viewProduct")}
            >
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
