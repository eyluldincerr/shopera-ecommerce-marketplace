import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

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
import { getNavbarLinks } from "../../services/homeService";
import { searchProducts } from "../../services/productService";

const SEARCH_SORT_ALIASES = Object.freeze({
  newest: "newest",
  "price-low": "price-low",
  price_asc: "price-low",
  "price-high": "price-high",
  price_desc: "price-high",
  "best-rated": "best-rated",
  rating_desc: "best-rated",
  "best-selling": "best-selling",
  best_selling: "best-selling",
  "name-asc": "name-asc",
  name_asc: "name-asc",
  "name-desc": "name-desc",
  name_desc: "name-desc",
});

const isTruthyQueryValue = (value) =>
  ["1", "true", "yes"].includes(String(value || "").trim().toLowerCase());

const parseMinimumRating = (value) => {
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5
    ? rating
    : undefined;
};

const createSearchRouteState = (queryString) => {
  const params = new URLSearchParams(queryString);
  const sortParam = String(params.get("sort") || "newest").trim().toLowerCase();

  return {
    searchTerm: params.get("q") || "",
    sortBy: SEARCH_SORT_ALIASES[sortParam] || "newest",
    minimumRating: parseMinimumRating(params.get("minRating")),
    newArrivalsOnly: isTruthyQueryValue(params.get("newArrivals")),
    filters: {
      ...defaultProductFilters,
      categoryId: params.get("categoryId") || "",
      brand: params.get("brand") || "",
      conditions: params.get("condition") || "",
      minPrice: params.get("minPrice") || "",
      maxPrice: params.get("maxPrice") || "",
      inStock: isTruthyQueryValue(params.get("inStock")),
    },
  };
};

function SearchResultsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const routeQueryKey = searchParams.toString();
  const routeState = useMemo(
    () => createSearchRouteState(routeQueryKey),
    [routeQueryKey]
  );
  const [navbarLinks, setNavbarLinks] = useState([]);
  const [filters, setFilters] = useState(() => routeState.filters);
  const [sortBy, setSortBy] = useState(() => routeState.sortBy);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters);
  const filterOptions = useMemo(
    () => createPublicProductFilterOptions(t),
    [t]
  );
  const refinedSearchTerm = filters.searchTerm.trim() || routeState.searchTerm;
  const activeBrand = String(filters.brand || "").trim();

  useEffect(() => {
    setFilters(routeState.filters);
    setSortBy(routeState.sortBy);
  }, [routeState]);

  useEffect(() => {
    let isMounted = true;

    const loadSearchMeta = async () => {
      try {
        setIsLoading(true);

        const links = await getNavbarLinks();

        if (!isMounted) {
          return;
        }

        setNavbarLinks(links);
      } catch (error) {
        console.error("Failed to load search page:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSearchMeta();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadSearchResultProducts = useCallback(
    (params) =>
      searchProducts(refinedSearchTerm, {
        ...params,
        filters,
        sortBy,
        minimumRating: routeState.minimumRating,
        newArrivalsOnly: routeState.newArrivalsOnly,
      }),
    [
      filters,
      refinedSearchTerm,
      routeState.minimumRating,
      routeState.newArrivalsOnly,
      sortBy,
    ]
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

  const pageTitle = refinedSearchTerm
    ? t("buyer.catalog.searchResultsFor", { searchTerm: refinedSearchTerm })
    : activeBrand
      ? t("buyer.catalog.brandProducts", { brand: activeBrand })
      : routeState.minimumRating !== undefined
        ? t("buyer.home.productSections.topRated.title")
        : routeState.newArrivalsOnly
          ? t("buyer.home.productSections.newArrivals.title")
          : t("buyer.catalog.searchProducts");

  return (
    <>
      <Navbar links={navbarLinks} />

      <main className="catalog-page search-results-page">
        <div className="container catalog-page__breadcrumb">
          <Link to="/">{t("buyer.catalog.home")}</Link>
          <span aria-hidden="true">/</span>
          <span>{t("navbar.search")}</span>
        </div>

        {isLoading ? (
          <div className="container catalog-page__state">
            {t("buyer.catalog.loading")}
          </div>
        ) : (
          <div className="container catalog-page__layout">
            <ProductFilters
              filters={filters}
              filterOptions={filterOptions}
              activeFilterCount={activeFilterCount}
              searchPlaceholder={t("buyer.catalog.searchResults")}
              onChange={updateFilter}
              onClear={clearFilters}
              isMobileOpen={isFilterDrawerOpen}
              onClose={() => setIsFilterDrawerOpen(false)}
            />

            <section className="catalog-page__content">
              <header className="catalog-page__header">
                <div>
                  <h1>{pageTitle}</h1>
                  <p>{t("buyer.catalog.searchDescription")}</p>
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
                loadProducts={loadSearchResultProducts}
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

export default SearchResultsPage;
