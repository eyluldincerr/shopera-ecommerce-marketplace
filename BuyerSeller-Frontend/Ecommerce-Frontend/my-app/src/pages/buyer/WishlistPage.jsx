// src/pages/buyer/WishlistPage.jsx

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";
import useWishlist from "../../hooks/useWishlist";
import { getWishlistVariantId } from "../../services/wishlistService";
import { formatCurrency } from "../../utils/formatCurrency";

const availabilityKey = (item) => {
  if (item.isAvailable) {
    return "buyerWishlist.availability.inStock";
  }

  if (
    item.productStatus === "OUT_OF_STOCK" ||
    item.variantStatus === "OUT_OF_STOCK" ||
    item.availableStock <= 0
  ) {
    return "buyerWishlist.availability.outOfStock";
  }

  return "buyerWishlist.availability.unavailable";
};

function WishlistPage() {
  const { t } = useTranslation();
  const {
    wishlistItems,
    wishlistCount,
    clearWishlist,
    removeFromWishlist,
    isWishlistLoading,
    isWishlistMutating,
    wishlistError,
    refreshWishlist,
  } = useWishlist();

  if (isWishlistLoading && wishlistItems.length === 0) {
    return (
      <BuyerAccountLayout activePath="/wishlist" pageClassName="wishlist-account-page">
        <section className="wishlist-state-card" aria-live="polite">
          <div className="wishlist-state-card__icon" aria-hidden="true">♡</div>
          <h1>{t("buyerWishlist.loadingTitle")}</h1>
          <p>{t("buyerWishlist.loadingMessage")}</p>
        </section>
      </BuyerAccountLayout>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <BuyerAccountLayout activePath="/wishlist" pageClassName="wishlist-account-page">
        <section className="wishlist-empty">
          <div className="wishlist-empty__icon" aria-hidden="true">♡</div>
          <h1>{t("buyerWishlist.emptyTitle")}</h1>
          <p>{t("buyerWishlist.emptyMessage")}</p>

          {wishlistError ? (
            <div className="wishlist-page__error" role="alert">
              <span>{wishlistError}</span>
              <button type="button" onClick={() => void refreshWishlist()}>
                {t("buyerWishlist.retry")}
              </button>
            </div>
          ) : null}

          <Link to="/" className="wishlist-empty__shop-button">
            {t("buyerWishlist.exploreProducts")}
          </Link>
        </section>
      </BuyerAccountLayout>
    );
  }

  return (
    <BuyerAccountLayout activePath="/wishlist" pageClassName="wishlist-account-page">
      <div className="wishlist-content-layout">
        <section className="wishlist-main" aria-labelledby="wishlist-title">
          <header className="wishlist-page__header">
            <div className="wishlist-page__heading">
              <div className="wishlist-page__title-row">
                <h1 id="wishlist-title">{t("buyerWishlist.title")}</h1>
                <span className="wishlist-page__count">
                  {t("buyerWishlist.savedCount", { count: wishlistCount })}
                </span>
              </div>
              <p>{t("buyerWishlist.subtitle")}</p>
            </div>

            <button
              type="button"
              className="wishlist-page__clear-button"
              onClick={() => void clearWishlist()}
              disabled={isWishlistMutating}
            >
              {t("buyerWishlist.clearAll")}
            </button>
          </header>

          {wishlistError ? (
            <div className="wishlist-page__error" role="alert" aria-live="assertive">
              <span>{wishlistError}</span>
              <button type="button" onClick={() => void refreshWishlist()}>
                {t("buyerWishlist.retry")}
              </button>
            </div>
          ) : null}

          <div className="wishlist-list">
            {wishlistItems.map((wishlistItem) => {
              const productId = wishlistItem.productId;
              const variantId = getWishlistVariantId(wishlistItem);
              const canOpenProduct = wishlistItem.isProductVisible;

              return (
                <article
                  className="wishlist-item"
                  key={wishlistItem.wishlistItemId || variantId}
                >
                  {canOpenProduct ? (
                    <Link
                      to={`/products/${productId}`}
                      className="wishlist-item__image-link"
                    >
                      {wishlistItem.thumbnail ? (
                        <img
                          src={wishlistItem.thumbnail}
                          alt={wishlistItem.name}
                          className="wishlist-item__image"
                        />
                      ) : (
                        <div className="wishlist-item__image-placeholder" aria-hidden="true">
                          ♡
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div className="wishlist-item__image-link wishlist-item__image-link--disabled">
                      {wishlistItem.thumbnail ? (
                        <img
                          src={wishlistItem.thumbnail}
                          alt={wishlistItem.name}
                          className="wishlist-item__image"
                        />
                      ) : (
                        <div className="wishlist-item__image-placeholder" aria-hidden="true">
                          ♡
                        </div>
                      )}
                    </div>
                  )}

                  <div className="wishlist-item__content">
                    {canOpenProduct ? (
                      <Link
                        to={`/products/${productId}`}
                        className="wishlist-item__name"
                      >
                        {wishlistItem.name}
                      </Link>
                    ) : (
                      <span className="wishlist-item__name">{wishlistItem.name}</span>
                    )}

                    <p className="wishlist-item__variant">
                      {[wishlistItem.variantName, wishlistItem.sku && `SKU: ${wishlistItem.sku}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>

                    {wishlistItem.storeName ? (
                      <p className="wishlist-item__store">
                        {t("buyerWishlist.soldBy", { store: wishlistItem.storeName })}
                      </p>
                    ) : null}

                    <div className="wishlist-item__meta-row">
                      <span className="wishlist-item__price">
                        {formatCurrency(
                          wishlistItem.price,
                          wishlistItem.currencyCode
                        )}
                      </span>
                      <span
                        className={`wishlist-item__availability ${
                          wishlistItem.isAvailable
                            ? "wishlist-item__availability--available"
                            : "wishlist-item__availability--unavailable"
                        }`}
                      >
                        {t(availabilityKey(wishlistItem))}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="wishlist-item__remove"
                    onClick={() => void removeFromWishlist(variantId)}
                    disabled={isWishlistMutating}
                    aria-label={t("buyerWishlist.removeAria", {
                      product: wishlistItem.name,
                    })}
                    title={t("buyerWishlist.remove")}
                  >
                    <span aria-hidden="true">×</span>
                  </button>

                  {canOpenProduct ? (
                    <Link
                      to={`/products/${productId}`}
                      className="wishlist-item__cart"
                    >
                      {t("buyerWishlist.viewProduct")}
                    </Link>
                  ) : (
                    <span className="wishlist-item__cart wishlist-item__cart--disabled">
                      {t("buyerWishlist.unavailable")}
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </BuyerAccountLayout>
  );
}

export default WishlistPage;
