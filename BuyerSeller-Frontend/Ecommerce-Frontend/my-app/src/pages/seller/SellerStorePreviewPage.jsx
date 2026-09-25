import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PRODUCT_CONDITION_TRANSLATION_KEYS } from "../../constants/marketplace";
import {
  getSellerStorePreview,
  subscribeSellerData,
} from "../../services/sellerService";
import { formatCurrency } from "../../utils/formatCurrency";
import SellerAsyncState from "../../components/seller/SellerAsyncState";
import AuthenticatedImage from "../../components/common/AuthenticatedImage";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";

function SellerStorePreviewContent() {
  const { t } = useTranslation();
  const carouselRef = useRef(null);
  const [previewData, setPreviewData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollControls = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) {
      return;
    }
    setCanScrollBack(carousel.scrollLeft > 1);
    setCanScrollForward(
      carousel.scrollLeft + carousel.clientWidth <
        carousel.scrollWidth - 1
    );
  }, []);

  const loadPreview = useCallback(async (retry = false) => {
    try {
      setLoadError("");
      setIsRetrying(retry);
      setPreviewData(await getSellerStorePreview());
    } catch (error) {
      setLoadError(error.message || t("common.errorDescription"));
    } finally {
      setIsRetrying(false);
    }
  }, [t]);

  useEffect(() => {
    loadPreview();
    return subscribeSellerData(loadPreview);
  }, [loadPreview]);

  useEffect(() => {
    updateScrollControls();
    window.addEventListener("resize", updateScrollControls);
    return () => window.removeEventListener("resize", updateScrollControls);
  }, [previewData, updateScrollControls]);

  const scrollProducts = (direction) => {
    carouselRef.current?.scrollBy({
      left: direction * Math.max(carouselRef.current.clientWidth * 0.8, 240),
      behavior: "smooth",
    });
  };

  if (isRetrying) {
    return <SellerAsyncState status="retrying" />;
  }

  if (loadError) {
    return (
      <SellerAsyncState
        status="error"
        error={loadError}
        onRetry={() => loadPreview(true)}
      />
    );
  }

  if (!previewData) {
    return (
      <SellerAsyncState status="loading" />
    );
  }

  const { store, sellerUser, policies, overview, products } = previewData;
  if (!store) {
    return (
      <section className="seller-store-preview-state">
        <h1>{t("sidebar.noStore")}</h1>
        <p>{t("storeProfile.noStoreDescription")}</p>
        <Link to="/seller/store-profile">
          {t("storeProfile.createStore")}
        </Link>
      </section>
    );
  }
  const rating = overview.find(
    (item) => item.metricId === "AVERAGE_RATING"
  )?.value;

  return (
    <div className="seller-store-preview">
      <header className="seller-store-preview__heading">
        <div>
          <span>{t("storePreview.previewLabel")}</span>
          <h1>{t("storePreview.title")}</h1>
        </div>
        <Link to="/seller/store-profile">
          ← {t("storePreview.backToProfile")}
        </Link>
      </header>

      <section className="seller-store-preview__hero">
        <div className="seller-store-preview__banner">
          <AuthenticatedImage
            src={store.bannerUrl}
            alt={t("storeProfile.storeBannerAlt", {
              storeName: store.storeName,
            })}
            fallback={<div className="seller-store-preview__banner-fallback" />}
          />
        </div>

        <div className="seller-store-preview__identity">
          <div className="seller-store-preview__logo">
            <AuthenticatedImage
              src={store.logoUrl}
              alt={t("storeProfile.storeLogoAlt", {
                storeName: store.storeName,
              })}
              fallback={
                <span>{store.storeName?.charAt(0).toUpperCase() || "S"}</span>
              }
            />
          </div>
          <div>
            <h2>{store.storeName}</h2>
            {sellerUser.fullName && (
              <span>{t("storePreview.soldBy", { name: sellerUser.fullName })}</span>
            )}
            <p>
              {store.description || t("storePreview.noDescription")}
            </p>
          </div>
          <div className="seller-store-preview__rating">
            <span aria-hidden="true">★</span>
            <strong>{rating || t("storePreview.unrated")}</strong>
          </div>
        </div>
      </section>

      <section className="seller-store-preview__details">
        <article>
          <h2>{t("storePreview.contact")}</h2>
          <p>{store.supportEmail || t("storePreview.notProvided")}</p>
          <p>{store.supportPhone || t("storePreview.notProvided")}</p>
        </article>
        <article>
          <h2>{t("storeProfile.supportPolicy")}</h2>
          <p>{policies.support || t(policies.supportKey)}</p>
        </article>
        <article>
          <h2>{t("storeProfile.returnPolicy")}</h2>
          <p>{policies.return || t(policies.returnKey)}</p>
        </article>
      </section>

      <section className="seller-store-preview__products-section">
        <div className="seller-store-preview__section-heading">
          <h2>{t("storePreview.productsFromStore")}</h2>
          {products.length > 0 && (
            <div className="seller-store-preview__controls">
              <button
                type="button"
                disabled={!canScrollBack}
                onClick={() => scrollProducts(-1)}
                aria-label={t("storePreview.previousProducts")}
              >
                ‹
              </button>
              <button
                type="button"
                disabled={!canScrollForward}
                onClick={() => scrollProducts(1)}
                aria-label={t("storePreview.nextProducts")}
              >
                ›
              </button>
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="seller-store-preview__empty">
            <strong>{t("storePreview.noProducts")}</strong>
            <p>{t("storePreview.noProductsDescription")}</p>
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="seller-store-preview__carousel"
            onScroll={updateScrollControls}
            tabIndex={0}
            aria-label={t("storePreview.productsFromStore")}
          >
            {products.map((product) => (
              <article
                key={`${product.productId}-${product.variantId}`}
                className="seller-store-preview-product"
              >
                <div className="seller-store-preview-product__image">
                  <AuthenticatedImage
                    src={product.imageUrl}
                    alt={product.name}
                    fallback={<span>{product.name.charAt(0)}</span>}
                  />
                  <small>
                    {t(
                      PRODUCT_CONDITION_TRANSLATION_KEYS[product.condition]
                    )}
                  </small>
                </div>
                <div className="seller-store-preview-product__content">
                  <span className="seller-store-preview-product__store">
                    {store.storeName}
                  </span>
                  <span className="seller-store-preview-product__name">
                    {product.name}
                  </span>
                  {product.rating !== null && (
                    <span className="seller-store-preview-product__rating">
                      <span aria-hidden="true">★</span> {product.rating}
                    </span>
                  )}
                  <strong className="seller-store-preview-product__price">
                    {formatCurrency(product.price)}
                  </strong>
                  <span className="seller-store-preview-product__stock">
                    {product.stockQuantity > 0
                      ? t("storePreview.inStock", {
                          count: product.stockQuantity,
                        })
                      : t("products.outOfStock")}
                  </span>
                  <Link
                    to="/seller/products"
                    className="seller-store-preview-product__manage"
                  >
                    {t("storePreview.manageProducts")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SellerStorePreviewPage() {
  return (
    <SellerPageShell>
      <SellerStorePreviewContent />
    </SellerPageShell>
  );
}

export default SellerStorePreviewPage;
