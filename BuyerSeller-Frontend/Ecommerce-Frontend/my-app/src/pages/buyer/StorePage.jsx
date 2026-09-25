import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import Navbar from "../../components/layout/Navbar.jsx";
import ProductFilters, {
  ProductFilterChips,
} from "../../components/product/ProductFilters.jsx";
import ProductGrid from "../../components/product/ProductGrid.jsx";
import StoreShowcase from "../../components/store/StoreShowcase.jsx";
import { getStoreMediaCopy } from "../../components/store/storeMediaCopy.js";
import { getCategories } from "../../services/categoryService.js";
import {
  getPublicStore,
  getPublicStoreProducts,
} from "../../services/storeService.js";
import {
  countActiveFilters,
  createPublicProductFilterOptions,
  defaultProductFilters,
} from "../../utils/productFilterUtils.js";
import "../../styles/catalog/storePage.css";

const PAGE_SIZE = 12;
const PRODUCT_SKELETONS = Array.from({ length: 8 });

const STORE_SORT_OPTIONS = Object.freeze([
  { value: "newest", labelKey: "buyer.catalog.sort.newest" },
  { value: "price_asc", labelKey: "buyer.catalog.sort.priceLow" },
  { value: "price_desc", labelKey: "buyer.catalog.sort.priceHigh" },
  { value: "rating_desc", labelKey: "buyer.catalog.sort.bestRated" },
  { value: "name_asc", labelKey: "buyer.catalog.sort.nameAscending" },
  { value: "name_desc", labelKey: "buyer.catalog.sort.nameDescending" },
]);

const parseStoreId = (value) => {
  const normalized = String(value ?? "").trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const storeId = Number(normalized);

  return Number.isSafeInteger(storeId) ? storeId : null;
};

const isAbortError = (error) =>
  error?.name === "AbortError" || error?.code === "ERR_CANCELED";

const getPageCount = ({ totalPages, totalCount, pageSize }) => {
  if (Number.isInteger(totalPages) && totalPages >= 0) {
    return totalPages;
  }

  return pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;
};

function StorePageState({ title, description, actionLabel, onAction, notFound }) {
  return (
    <section
      className="store-page__state shopera-card"
      role={notFound ? "status" : "alert"}
      aria-live="polite"
    >
      <span className="store-page__state-icon" aria-hidden="true">
        {notFound ? "S" : "!"}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
      {onAction ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : (
        <Link to="/">{actionLabel}</Link>
      )}
    </section>
  );
}

function StorePage() {
  const { t, i18n } = useTranslation();
  const mediaCopy = getStoreMediaCopy(i18n.resolvedLanguage || i18n.language);
  const { storeId: routeStoreId } = useParams();
  const storeId = useMemo(() => parseStoreId(routeStoreId), [routeStoreId]);
  const storeRequestId = useRef(0);
  const productRequestId = useRef(0);

  const [store, setStore] = useState(null);
  const [storeStatus, setStoreStatus] = useState("loading");
  const [storeRetryKey, setStoreRetryKey] = useState(0);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productStatus, setProductStatus] = useState("idle");
  const [productRetryKey, setProductRetryKey] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState(defaultProductFilters);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
  });
  const [brokenBanner, setBrokenBanner] = useState(false);
  const [brokenLogo, setBrokenLogo] = useState(false);
  const activeFilterCount = countActiveFilters(filters);
  const filterOptions = useMemo(
    () =>
      createPublicProductFilterOptions(t, {
        categories,
        includeSearch: false,
      }),
    [categories, t]
  );

  useEffect(() => {
    setSearchInput("");
    setSearch("");
    setSort("newest");
    setFilters(defaultProductFilters);
    setPage(1);
    setProducts([]);
    setPagination({
      page: 1,
      pageSize: PAGE_SIZE,
      totalCount: 0,
      totalPages: 0,
    });
  }, [routeStoreId]);

  useEffect(() => {
    const controller = new AbortController();

    getCategories({ signal: controller.signal })
      .then(setCategories)
      .catch((error) => {
        if (!isAbortError(error)) {
          setCategories([]);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const searchTimer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(searchTimer);
  }, [searchInput]);

  useEffect(() => {
    const requestId = storeRequestId.current + 1;
    storeRequestId.current = requestId;

    if (storeId === null) {
      setStore(null);
      setStoreStatus("not-found");
      return undefined;
    }

    const controller = new AbortController();

    setStoreStatus("loading");
    setBrokenBanner(false);
    setBrokenLogo(false);

    getPublicStore(storeId, { signal: controller.signal })
      .then((storeData) => {
        if (requestId !== storeRequestId.current) {
          return;
        }

        setStore(storeData);
        setStoreStatus("success");
      })
      .catch((error) => {
        if (isAbortError(error) || requestId !== storeRequestId.current) {
          return;
        }

        setStore(null);
        setStoreStatus(error?.status === 404 ? "not-found" : "error");
      });

    return () => controller.abort();
  }, [storeId, storeRetryKey]);

  useEffect(() => {
    const requestId = productRequestId.current + 1;
    productRequestId.current = requestId;

    if (storeId === null || storeStatus !== "success") {
      setProducts([]);
      setProductStatus("idle");
      return undefined;
    }

    const controller = new AbortController();

    setProductStatus("loading");

    getPublicStoreProducts(storeId, {
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      filters,
      sort,
      signal: controller.signal,
    })
      .then((productPage) => {
        if (requestId !== productRequestId.current) {
          return;
        }

        const nextProducts = Array.isArray(productPage.items)
          ? productPage.items
          : [];
        const nextPagination = {
          page: Number(productPage.page) || page,
          pageSize: Number(productPage.pageSize) || PAGE_SIZE,
          totalCount: Number(productPage.totalCount) || 0,
          totalPages: productPage.totalPages,
        };

        setProducts(nextProducts);
        setPagination({
          ...nextPagination,
          totalPages: getPageCount(nextPagination),
        });
        setProductStatus("success");
      })
      .catch((error) => {
        if (isAbortError(error) || requestId !== productRequestId.current) {
          return;
        }

        setProducts([]);
        setProductStatus("error");
      });

    return () => controller.abort();
  }, [filters, page, productRetryKey, search, sort, storeId, storeStatus]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters(defaultProductFilters);
  };

  const removeFilter = (key) => {
    if (key === "price") {
      setPage(1);
      setFilters((currentFilters) => ({
        ...currentFilters,
        minPrice: "",
        maxPrice: "",
      }));
      return;
    }

    updateFilter(key, defaultProductFilters[key]);
  };

  const joinedDate = useMemo(() => {
    if (!store?.createdDate) {
      return "";
    }

    const date = new Date(store.createdDate);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(i18n.resolvedLanguage || "en", {
      month: "long",
      year: "numeric",
    }).format(date);
  }, [i18n.resolvedLanguage, store?.createdDate]);

  const storeInitial = store?.storeName?.trim().charAt(0).toUpperCase() || "S";
  const totalPages = Math.max(0, Number(pagination.totalPages) || 0);
  const currentPage = Math.max(1, Number(pagination.page) || page);
  const hasStoreInformation = Boolean(
    store?.supportEmail ||
      store?.supportPhone ||
      store?.supportPolicy ||
      store?.returnPolicy
  );

  if (storeStatus === "loading") {
    return (
      <>
        <Navbar />
        <main className="store-page">
          <div
            className="container store-page__loading"
            role="status"
            aria-label={t("buyer.store.loading")}
          >
            <span className="store-page__loading-banner" />
            <div className="store-page__loading-copy">
              <span />
              <span />
              <span />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (storeStatus === "not-found") {
    return (
      <>
        <Navbar />
        <main className="store-page">
          <div className="container">
            <StorePageState
              notFound
              title={t("buyer.store.notFoundTitle")}
              description={t("buyer.store.notFoundDescription")}
              actionLabel={t("buyer.catalog.backHome")}
            />
          </div>
        </main>
      </>
    );
  }

  if (storeStatus === "error") {
    return (
      <>
        <Navbar />
        <main className="store-page">
          <div className="container">
            <StorePageState
              title={t("backend.unavailableTitle")}
              description={t("backend.storeLoadError")}
              actionLabel={t("buyer.store.retry")}
              onAction={() => setStoreRetryKey((key) => key + 1)}
            />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="store-page">
        <div className="container">
          <section className="store-page__hero" aria-labelledby="store-title">
            <div className="store-page__banner">
              {store.storeBannerUrl && !brokenBanner ? (
                <img
                  src={store.storeBannerUrl}
                  alt={t("buyer.store.bannerAlt", { storeName: store.storeName })}
                  onError={() => setBrokenBanner(true)}
                />
              ) : (
                <div className="store-page__banner-fallback" aria-hidden="true">
                  <span className="store-page__banner-orb store-page__banner-orb--one" />
                  <span className="store-page__banner-orb store-page__banner-orb--two" />
                  <span className="store-page__banner-display">
                    <span className="store-page__banner-display-top" />
                    <span className="store-page__banner-display-body">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                </div>
              )}

              <Link className="store-page__back-link" to="/stores">
                <span aria-hidden="true">←</span>
                {t("buyer.store.allStores")}
              </Link>
            </div>

            <div className="store-page__identity">
              <div className="store-page__logo">
                {store.storeLogoUrl && !brokenLogo ? (
                  <img
                    src={store.storeLogoUrl}
                    alt={t("buyer.store.logoAlt", { storeName: store.storeName })}
                    onError={() => setBrokenLogo(true)}
                  />
                ) : (
                  <span className="store-page__logo-fallback" aria-hidden="true">
                    <span className="store-page__logo-mark">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="visually-hidden">{storeInitial}</span>
                  </span>
                )}
              </div>

              <div className="store-page__identity-copy">
                <h1 id="store-title">{store.storeName}</h1>
                {store.storeDescription ? <p>{store.storeDescription}</p> : null}
              </div>

              <div className="store-page__identity-actions">
                <a className="store-page__video-button" href="#store-videos">
                  <span className="store-page__video-button-icon" aria-hidden="true">▶</span>
                  <span>{mediaCopy.videosButton}</span>
                </a>

                <div className="store-page__metadata" aria-label={t("buyer.store.breadcrumbLabel")}>
                  <span>
                    {t("buyer.catalog.productCount", {
                      count: store.visibleProductCount,
                    })}
                  </span>
                  {joinedDate ? (
                    <span>{t("buyer.store.joined", { date: joinedDate })}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <StoreShowcase storeId={store.storeId || storeId} />

          {hasStoreInformation ? (
            <section className="store-page__information" aria-labelledby="store-information-title">
              <div className="store-page__section-heading">
                <h2 id="store-information-title">{t("buyer.store.informationTitle")}</h2>
              </div>

              <div className="store-page__information-grid">
                {store.supportEmail ? (
                  <article>
                    <h3>{t("buyer.store.supportEmail")}</h3>
                    <a href={`mailto:${encodeURIComponent(store.supportEmail)}`}>
                      {store.supportEmail}
                    </a>
                  </article>
                ) : null}
                {store.supportPhone ? (
                  <article>
                    <h3>{t("buyer.store.supportPhone")}</h3>
                    <a href={`tel:${store.supportPhone.replace(/[^+\d]/g, "")}`}>
                      {store.supportPhone}
                    </a>
                  </article>
                ) : null}
                {store.supportPolicy ? (
                  <article>
                    <h3>{t("buyer.store.supportPolicy")}</h3>
                    <p>{store.supportPolicy}</p>
                  </article>
                ) : null}
                {store.returnPolicy ? (
                  <article>
                    <h3>{t("buyer.store.returnPolicy")}</h3>
                    <p>{store.returnPolicy}</p>
                  </article>
                ) : null}
              </div>
            </section>
          ) : null}

          <section
            className="store-page__products"
            aria-labelledby="store-products-title"
            aria-busy={productStatus === "loading"}
          >
            <div className="store-page__products-heading">
              <div>
                <h2 id="store-products-title">
                  {t("buyer.store.productsTitle", { storeName: store.storeName })}
                </h2>
                <p aria-live="polite">
                  {t("buyer.catalog.productCount", {
                    count: pagination.totalCount,
                  })}
                </p>
              </div>

              <div className="store-page__controls">
                <label>
                  <span>{t("buyer.store.searchLabel")}</span>
                  <input
                    type="search"
                    value={searchInput}
                    placeholder={t("buyer.store.searchPlaceholder")}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </label>

                <label>
                  <span>{t("buyer.catalog.sort.label")}</span>
                  <select
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value);
                      setPage(1);
                    }}
                  >
                    {STORE_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="store-page__mobile-filter-row">
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
              >
                {t("buyer.catalog.filterProducts")}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>

            <div className="store-page__catalog-layout">
              <ProductFilters
                filters={filters}
                filterOptions={filterOptions}
                activeFilterCount={activeFilterCount}
                onChange={updateFilter}
                onClear={clearFilters}
                isMobileOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
              />

              <div className="store-page__catalog-results">
                <ProductFilterChips
                  filters={filters}
                  filterOptions={filterOptions}
                  onRemove={removeFilter}
                  onClear={clearFilters}
                />

                {productStatus === "loading" ? (
                  <div className="store-page__product-skeleton" role="status">
                    <span className="visually-hidden">{t("buyer.catalog.loading")}</span>
                    {PRODUCT_SKELETONS.map((_, index) => (
                      <span key={index} aria-hidden="true" />
                    ))}
                  </div>
                ) : null}

                {productStatus === "error" ? (
                  <div className="store-page__product-state" role="alert" aria-live="assertive">
                    <h3>{t("buyer.store.productsErrorTitle")}</h3>
                    <p>{t("backend.productLoadError")}</p>
                    <button
                      type="button"
                      onClick={() => setProductRetryKey((key) => key + 1)}
                    >
                      {t("buyer.store.retry")}
                    </button>
                  </div>
                ) : null}

                {productStatus === "success" && products.length === 0 ? (
                  <div className="store-page__product-state" role="status">
                    <h3>
                      {search || activeFilterCount > 0
                        ? t("buyer.store.noMatchesTitle")
                        : t("buyer.store.emptyTitle")}
                    </h3>
                    <p>
                      {search || activeFilterCount > 0
                        ? t("buyer.store.noMatchesDescription")
                        : t("buyer.store.emptyDescription")}
                    </p>
                  </div>
                ) : null}

                {productStatus === "success" && products.length > 0 ? (
                  <ProductGrid products={products} />
                ) : null}

                {productStatus === "success" && products.length > 0 ? (
                  <nav className="store-page__pagination" aria-label={t("buyer.store.paginationLabel")}>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      {t("buyer.store.previous")}
                    </button>
                    <span aria-live="polite">
                      {t("buyer.store.pageStatus", {
                        page: currentPage,
                        totalPages: Math.max(totalPages, 1),
                      })}
                    </span>
                    <button
                      type="button"
                      disabled={totalPages === 0 || currentPage >= totalPages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      {t("buyer.store.next")}
                    </button>
                  </nav>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default StorePage;
