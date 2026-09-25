// src/components/product/InfiniteProductGrid.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import ProductGrid from "./ProductGrid.jsx";

const DEFAULT_PAGE_SIZE = 24;
const skeletonItems = Array.from({ length: 8 });

function InfiniteProductGrid({
  loadProducts,
  filters,
  sortBy,
  emptyTitle,
  emptyMessage,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageData,
  autoLoad = false,
}) {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const requestIdRef = useRef(0);
  const isLoadingRef = useRef(false);
  const loadProductsRef = useRef(loadProducts);
  const onPageDataRef = useRef(onPageData);
  const sentinelRef = useRef(null);

  useEffect(() => {
    loadProductsRef.current = loadProducts;
  }, [loadProducts]);

  useEffect(() => {
    onPageDataRef.current = onPageData;
  }, [onPageData]);

  const resetKey = useMemo(
    () => JSON.stringify({ filters, sortBy, pageSize }),
    [filters, pageSize, sortBy]
  );

  const loadPage = useCallback(
    async (nextPage, mode = "append") => {
      if (isLoadingRef.current) {
        return;
      }

      const requestId = requestIdRef.current;

      isLoadingRef.current = true;
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await loadProductsRef.current({
          page: nextPage,
          pageSize,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const nextItems = response.items || response.products || [];

        setProducts((currentProducts) =>
          mode === "replace" ? nextItems : [...currentProducts, ...nextItems]
        );
        setPage(response.page || nextPage);
        setHasMore(Boolean(response.hasMore));
        onPageDataRef.current?.(response);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setErrorMessage(
            error?.code === "BACKEND_NOT_CONFIGURED"
              ? t("backend.productStoreNotConfigured")
              : t("backend.productLoadError")
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [pageSize, t]
  );

  useEffect(() => {
    requestIdRef.current += 1;
    isLoadingRef.current = false;
    setProducts([]);
    setPage(0);
    setHasMore(true);
    setErrorMessage("");
    loadPage(1, "replace");
  }, [loadPage, loadProducts, resetKey]);

  const isInitialLoading = isLoading && products.length === 0;
  const isLoadingMore = isLoading && products.length > 0;
  const isEmpty = !isLoading && products.length === 0 && !errorMessage;
  const resolvedEmptyTitle = emptyTitle || t("buyer.catalog.emptyTitle");
  const resolvedEmptyMessage =
    emptyMessage || t("buyer.catalog.emptyDescription");
  const canAutoLoad =
    autoLoad && typeof IntersectionObserver !== "undefined";

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current || page < 1) {
      return;
    }

    loadPage(page + 1);
  }, [hasMore, loadPage, page]);

  useEffect(() => {
    if (
      !canAutoLoad ||
      !hasMore ||
      page < 1 ||
      errorMessage ||
      typeof IntersectionObserver === "undefined"
    ) {
      return undefined;
    }

    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMore();
        }
      },
      {
        rootMargin: "700px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [canAutoLoad, errorMessage, handleLoadMore, hasMore, page]);

  return (
    <div className="infinite-product-grid">
      {isInitialLoading && (
        <div
          className="infinite-product-grid__skeleton"
          aria-label={t("buyer.catalog.loading")}
        >
          {skeletonItems.map((_, index) => (
            <span key={index} />
          ))}
        </div>
      )}

      {errorMessage && (
        <div className="infinite-product-grid__state">
          <h2>{t("backend.unavailableTitle")}</h2>
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => loadPage(Math.max(page, 1), "replace")}
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {!isInitialLoading && products.length > 0 && (
        <ProductGrid products={products} />
      )}

      {isEmpty && (
        <div className="infinite-product-grid__state">
          <h2>{resolvedEmptyTitle}</h2>
          <p>{resolvedEmptyMessage}</p>
        </div>
      )}

      {!isInitialLoading && products.length > 0 && hasMore && canAutoLoad && (
        <div
          ref={sentinelRef}
          className="infinite-product-grid__sentinel"
          role="status"
          aria-live="polite"
        >
          {isLoadingMore ? t("buyer.catalog.loadingMore") : ""}
        </div>
      )}

      {!isInitialLoading && products.length > 0 && hasMore && !canAutoLoad && (
        <div className="infinite-product-grid__actions">
          <button
            type="button"
            className="infinite-product-grid__load-more"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore
              ? t("buyer.catalog.loadingMore")
              : t("buyer.catalog.loadMore", { count: pageSize })}
          </button>
        </div>
      )}

      {!isLoading && products.length > 0 && !hasMore && (
        <div className="infinite-product-grid__end">
          {t("buyer.catalog.reachedEnd")}
        </div>
      )}
    </div>
  );
}

export default InfiniteProductGrid;
