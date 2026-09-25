// src/pages/buyer/ProductDetailPage.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import Navbar from "../../components/layout/Navbar";
import ProductImageGallery from "../../components/product/ProductImageGallery.jsx";
import ProductInfo from "../../components/product/ProductInfo.jsx";
import ProductPurchasePanel from "../../components/product/ProductPurchasePanel.jsx";
import ProductSideInfo from "../../components/product/ProductSideInfo.jsx";
import ProductStoreCard from "../../components/product/ProductStoreCard.jsx";
import ProductTabs from "../../components/product/ProductTabs.jsx";
import RelatedProducts from "../../components/product/RelatedProducts.jsx";

import { getNavbarLinks } from "../../services/homeService";
import {
  getProductById,
  getRelatedProducts,
} from "../../services/productService";
import {
  getDefaultProductVariant,
  getVariantOptionGroups,
  normalizeProductVariants,
  selectVariantByName,
  selectVariantByOption,
} from "../../services/productVariantService";

function ProductDetailPage() {
  const { t } = useTranslation();
  const { productId } = useParams();

  const [navbarLinks, setNavbarLinks] = useState([]);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  useEffect(() => {
    const loadProductPage = async () => {
      try {
        setIsLoading(true);
        setIsNotFound(false);
        setLoadError("");

        const [links, productData, relatedData] = await Promise.all([
          getNavbarLinks(),
          getProductById(productId),
          getRelatedProducts(productId),
        ]);

        setNavbarLinks(links);

        if (!productData) {
          setProduct(null);
          setSelectedVariantId(null);
          setIsNotFound(true);
          return;
        }

        setProduct(productData);
        setSelectedVariantId(null);
        setRelatedProducts(relatedData);
      } catch (error) {
        console.error("Failed to load product detail page:", error);
        setLoadError(
          error?.code === "BACKEND_NOT_CONFIGURED"
            ? t("backend.productStoreNotConfigured")
            : t("backend.productLoadError")
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProductPage();
  }, [productId, t]);

  const normalizedVariants = useMemo(() => {
    return normalizeProductVariants(product?.variants);
  }, [product]);

  const defaultVariant = useMemo(() => {
    return getDefaultProductVariant(normalizedVariants);
  }, [normalizedVariants]);

  const selectedVariant = useMemo(() => {
    return (
      normalizedVariants.find(
        (variant) => variant.variantId === selectedVariantId
      ) ||
      defaultVariant ||
      null
    );
  }, [defaultVariant, normalizedVariants, selectedVariantId]);

  const optionGroups = useMemo(() => {
    return getVariantOptionGroups(normalizedVariants, selectedVariant);
  }, [normalizedVariants, selectedVariant]);

  const galleryImages = useMemo(() => {
    return [...(product?.images || [])]
      .sort((first, second) => first.displayOrder - second.displayOrder)
      .map((image) => image.imageUrl)
      .filter(Boolean);
  }, [product]);

  useEffect(() => {
    setSelectedVariantId(defaultVariant?.variantId || null);
  }, [product?.productId, defaultVariant?.variantId]);

  const handleReviewStatsChange = useCallback(({ averageRating, totalCount }) => {
    setProduct((currentProduct) => {
      if (!currentProduct) {
        return currentProduct;
      }

      const nextRating = Number(averageRating) || 0;
      const nextCount = Number(totalCount) || 0;

      if (
        currentProduct.rating === nextRating &&
        currentProduct.reviewCount === nextCount
      ) {
        return currentProduct;
      }

      return {
        ...currentProduct,
        rating: nextRating,
        reviewCount: nextCount,
      };
    });
  }, []);

  const handleVariantOptionSelect = (optionKey, optionValue) => {
    const nextVariant =
      optionKey === "name"
        ? selectVariantByName(normalizedVariants, optionValue)
        : selectVariantByOption(
            normalizedVariants,
            selectedVariant,
            optionKey,
            optionValue
          );

    if (nextVariant) {
      setSelectedVariantId(nextVariant.variantId);
    }
  };

  if (isLoading) {
    return <div className="page-loader">{t("buyer.product.loading")}</div>;
  }

  if (isNotFound) {
    return (
      <>
        <Navbar links={navbarLinks} />

        <main className="product-detail-page">
          <div className="container">
            <div className="product-detail-page__empty">
              <h1>{t("buyer.product.notFoundTitle")}</h1>
              <p>{t("buyer.product.notFoundDescription")}</p>
              <Link to="/" className="product-detail-page__back">
                {t("buyer.product.backHome")}
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Navbar links={navbarLinks} />
        <main className="product-detail-page">
          <div className="container">
            <div className="product-detail-page__empty" role="alert">
              <h1>{t("backend.unavailableTitle")}</h1>
              <p>{loadError}</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar links={navbarLinks} />

      <main className="product-detail-page">
        <div className="container">
          <section className="product-detail-page__layout">
            <ProductImageGallery
              images={galleryImages}
              productName={product.productName}
            />

            <ProductInfo
              product={product}
              selectedVariant={selectedVariant}
              optionGroups={optionGroups}
              onSelectVariantOption={handleVariantOptionSelect}
            />

            <div className="product-detail-page__right">
              <ProductPurchasePanel
                product={product}
                selectedVariant={selectedVariant}
              />

              <ProductStoreCard product={product} />

              <ProductSideInfo
                title={t("buyer.store.supportPolicy")}
                description={
                  product.store?.supportPolicy ||
                  t("buyer.product.storePolicies.notProvided")
                }
              />

              <ProductSideInfo
                title={t("buyer.store.returnPolicy")}
                description={
                  product.store?.returnPolicy ||
                  t("buyer.product.storePolicies.notProvided")
                }
              />
            </div>

            <ProductTabs product={product} onReviewStatsChange={handleReviewStatsChange} />
            <RelatedProducts products={relatedProducts} categoryId={product.categoryId} />
          </section>
        </div>
      </main>
    </>
  );
}

export default ProductDetailPage;
