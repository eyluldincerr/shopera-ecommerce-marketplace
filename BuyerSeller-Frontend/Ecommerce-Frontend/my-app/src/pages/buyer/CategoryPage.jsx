// src/pages/buyer/CategoryPage.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import Navbar from "../../components/layout/Navbar";
import ProductFilters, {
  ProductFilterChips,
} from "../../components/product/ProductFilters";
import {
  countActiveFilters,
  createPublicProductFilterOptions,
  defaultProductFilters,
} from "../../utils/productFilterUtils";
import InfiniteProductGrid from "../../components/product/InfiniteProductGrid";
import ProductSort from "../../components/product/ProductSort";
import { getCategoryBySlug } from "../../services/categoryService";
import { getNavbarLinks } from "../../services/homeService";
import { getProductsByCategory } from "../../services/productService";

function CategoryPage() {
  const { t } = useTranslation();
  const { categorySlug } = useParams();
  const [navbarLinks, setNavbarLinks] = useState([]);
  const [category, setCategory] = useState(null);
  const [filters, setFilters] = useState(defaultProductFilters);
  const [sortBy, setSortBy] = useState("newest");
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters);
  const filterOptions = useMemo(
    () => createPublicProductFilterOptions(t),
    [t]
  );

  useEffect(() => {
    setFilters(defaultProductFilters);
  }, [categorySlug]);

  useEffect(() => {
    let isMounted = true;

    const loadCategoryMeta = async () => {
      try {
        setIsLoading(true);
        setIsNotFound(false);
        setLoadError("");

        const [links, categoryData] = await Promise.all([
          getNavbarLinks(),
          getCategoryBySlug(categorySlug),
        ]);

        if (!isMounted) {
          return;
        }

        setNavbarLinks(links);

        if (!categoryData) {
          setIsNotFound(true);
          setCategory(null);
          return;
        }

        setCategory(categoryData);
      } catch (error) {
        console.error("Failed to load category page:", error);
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

    loadCategoryMeta();

    return () => {
      isMounted = false;
    };
  }, [categorySlug, t]);

  const loadCategoryProducts = useCallback(
    (params) =>
      getProductsByCategory(category?.categoryId, {
        ...params,
        filters,
        search: filters.searchTerm,
        sortBy,
      }),
    [category?.categoryId, filters, sortBy]
  );

  const handlePageData = useCallback((productData) => {
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

      <main className="catalog-page category-page">
        <div className="container catalog-page__breadcrumb">
          <Link to="/">{t("buyer.catalog.home")}</Link>
          <span aria-hidden="true">/</span>
          <span>{category?.categoryName || t("buyer.catalog.category")}</span>
        </div>

        {isLoading ? (
          <div className="container catalog-page__state">
            {t("buyer.catalog.loading")}
          </div>
        ) : loadError ? (
          <div className="container catalog-page__state" role="alert">
            <h1>{t("backend.unavailableTitle")}</h1>
            <p>{loadError}</p>
          </div>
        ) : isNotFound ? (
          <div className="container catalog-page__state">
            <h1>{t("buyer.catalog.categoryNotFound")}</h1>
            <p>{t("buyer.catalog.categoryUnavailable")}</p>
            <Link to="/">{t("buyer.catalog.backHome")}</Link>
          </div>
        ) : (
          <div className="container catalog-page__layout">
            <ProductFilters
              filters={filters}
              filterOptions={filterOptions}
              activeFilterCount={activeFilterCount}
              searchPlaceholder={t("buyer.catalog.searchCategory")}
              onChange={updateFilter}
              onClear={clearFilters}
              isMobileOpen={isFilterDrawerOpen}
              onClose={() => setIsFilterDrawerOpen(false)}
            />

            <section className="catalog-page__content">
              <header className="catalog-page__header">
                <div>
                  <h1>{category.categoryName}</h1>
                  {category.description && <p>{category.description}</p>}
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
                loadProducts={loadCategoryProducts}
                filters={filters}
                sortBy={sortBy}
                emptyTitle={t("buyer.catalog.emptyTitle")}
                emptyMessage={t("buyer.catalog.emptyDescription")}
                onPageData={handlePageData}
              />
            </section>
          </div>
        )}
      </main>
    </>
  );
}

export default CategoryPage;
