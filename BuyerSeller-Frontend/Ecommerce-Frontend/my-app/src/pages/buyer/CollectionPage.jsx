// src/pages/buyer/CollectionPage.jsx

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import Navbar from "../../components/layout/Navbar";
import ProductFilters, {
  ProductFilterChips,
} from "../../components/product/ProductFilters";
import {
  countActiveFilters,
  defaultProductFilters,
} from "../../utils/productFilterUtils";
import InfiniteProductGrid from "../../components/product/InfiniteProductGrid";
import ProductSort from "../../components/product/ProductSort";
import { getNavbarLinks } from "../../services/homeService";
import { getProductsByCollection } from "../../services/productService";

function CollectionPage() {
  const { t } = useTranslation();
  const { collectionSlug } = useParams();
  const [navbarLinks, setNavbarLinks] = useState([]);
  const [collection, setCollection] = useState(null);
  const [filterOptions, setFilterOptions] = useState({});
  const [filters, setFilters] = useState(defaultProductFilters);
  const [sortBy, setSortBy] = useState("best-selling");
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters);

  useEffect(() => {
    setFilters(defaultProductFilters);
  }, [collectionSlug]);

  useEffect(() => {
    let isMounted = true;

    const loadCollectionMeta = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const [links, productData] = await Promise.all([
          getNavbarLinks(),
          getProductsByCollection(collectionSlug, {
            page: 1,
            pageSize: 1,
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setNavbarLinks(links);
        setCollection(productData.collection);
      } catch (error) {
        console.error("Failed to load collection page:", error);
        if (isMounted) {
          setLoadError(
            error?.code === "BACKEND_NOT_CONFIGURED"
              ? t("backend.productStoreNotConfigured")
              : t("backend.productLoadError")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCollectionMeta();

    return () => {
      isMounted = false;
    };
  }, [collectionSlug, t]);

  const loadCollectionProducts = useCallback(
    (params) =>
      getProductsByCollection(collectionSlug, {
        ...params,
        filters,
        sortBy,
      }),
    [collectionSlug, filters, sortBy]
  );

  const handlePageData = useCallback((productData) => {
    setCollection(productData.collection);
    setFilterOptions(productData.filterOptions);
    setTotalCount(productData.totalCount);
  }, []);

  const updateFilter = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(defaultProductFilters);
  };

  const removeFilter = (key, value) => {
    if (key === "price") {
      setFilters((currentFilters) => ({
        ...currentFilters,
        minPrice: "",
        maxPrice: "",
      }));
      return;
    }

    if (Array.isArray(filters[key])) {
      setFilters((currentFilters) => ({
        ...currentFilters,
        [key]: currentFilters[key].filter((item) => item !== value),
      }));
      return;
    }

    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: defaultProductFilters[key],
    }));
  };

  return (
    <>
      <Navbar links={navbarLinks} />

      <main className="catalog-page collection-page">
        <div className="container catalog-page__breadcrumb">
          <Link to="/">{t("buyer.catalog.home")}</Link>
          <span aria-hidden="true">/</span>
          <span>{collection?.title || t("buyer.catalog.collection")}</span>
        </div>

        {isLoading ? (
          <div className="container catalog-page__state">
            {t("buyer.catalog.loading")}
          </div>
        ) : loadError ? (
          <section className="container catalog-page__state" role="alert">
            <h1>{t("backend.unavailableTitle")}</h1>
            <p>{loadError}</p>
          </section>
        ) : !collection ? (
          <section className="container catalog-page__state">
            <h1>{t("buyer.catalog.collectionNotFound")}</h1>
            <p>{t("buyer.catalog.collectionUnavailable")}</p>
            <Link to="/">{t("buyer.catalog.backHome")}</Link>
          </section>
        ) : (
          <div className="container catalog-page__layout">
            <ProductFilters
              filters={filters}
              filterOptions={filterOptions}
              activeFilterCount={activeFilterCount}
              searchPlaceholder={t("buyer.catalog.searchCollection")}
              onChange={updateFilter}
              onClear={clearFilters}
              isMobileOpen={isFilterDrawerOpen}
              onClose={() => setIsFilterDrawerOpen(false)}
            />

            <section className="catalog-page__content">
              <header className="catalog-page__header">
                <div>
                  <h1>{collection.title}</h1>
                  {collection?.subtitle && <p>{collection.subtitle}</p>}
                  <span>{t("buyer.catalog.productCount", { count: totalCount })}</span>
                </div>

                <ProductSort value={sortBy} onChange={setSortBy} />
              </header>

              <div className="catalog-page__mobile-filter-row">
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                >
                  {t("buyer.catalog.filterProducts")}
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
              </div>

              <ProductFilterChips
                filters={filters}
                filterOptions={filterOptions}
                onRemove={removeFilter}
                onClear={clearFilters}
              />

              <InfiniteProductGrid
                loadProducts={loadCollectionProducts}
                filters={filters}
                sortBy={sortBy}
                emptyTitle="No products found"
                emptyMessage="Try changing filters or choosing another collection."
                onPageData={handlePageData}
              />
            </section>
          </div>
        )}
      </main>
    </>
  );
}

export default CollectionPage;
