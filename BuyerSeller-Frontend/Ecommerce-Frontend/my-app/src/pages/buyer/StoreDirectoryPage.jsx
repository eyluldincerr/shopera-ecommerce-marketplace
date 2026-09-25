import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import Navbar from "../../components/layout/Navbar.jsx";
import { getStoreRoute } from "../../routes/routePolicy.js";
import { getPublicStores } from "../../services/storeService.js";
import "../../styles/catalog/storeDirectoryPage.css";

const PAGE_SIZE = 12;
const SKELETONS = Array.from({ length: 8 });
const STORE_TONE_COUNT = 4;

const isAbortError = (error) =>
  error?.name === "AbortError" || error?.code === "ERR_CANCELED";

function StoreLogo({ store }) {
  const [broken, setBroken] = useState(false);

  if (!store.storeLogoUrl || broken) {
    return null;
  }

  return (
    <span className="store-directory__logo">
      <img
        src={store.storeLogoUrl}
        alt=""
        onError={() => setBroken(true)}
      />
    </span>
  );
}

function StoreCard({ store, t }) {
  const [bannerBroken, setBannerBroken] = useState(false);
  const tone = Math.abs(Number(store.storeId) || 0) % STORE_TONE_COUNT;

  return (
    <article
      className={`store-directory__card store-directory__card--tone-${tone}`}
    >
      <Link
        to={getStoreRoute(store.storeId)}
        className="store-directory__card-link"
        aria-label={t("buyer.storesDirectory.openStore", {
          storeName: store.storeName,
        })}
      >
        <div className="store-directory__banner">
          {store.storeBannerUrl && !bannerBroken ? (
            <img
              src={store.storeBannerUrl}
              alt={t("buyer.storesDirectory.bannerAlt", {
                storeName: store.storeName,
              })}
              onError={() => setBannerBroken(true)}
            />
          ) : (
            <span
              className="store-directory__banner-fallback"
              aria-hidden="true"
            >
              <span />
            </span>
          )}

          <span className="store-directory__banner-shade" aria-hidden="true" />
          <StoreLogo store={store} />
        </div>

        <div className="store-directory__card-body">
          <div className="store-directory__card-heading">
            <h2>{store.storeName}</h2>
            <span className="store-directory__verified">
              {t("buyer.storesDirectory.activeStore")}
            </span>
          </div>

          <p>
            {store.storeDescription ||
              t("buyer.storesDirectory.fallbackDescription", {
                storeName: store.storeName,
              })}
          </p>

          <div className="store-directory__card-footer">
            <span>
              {t("buyer.storesDirectory.productCount", {
                count: store.visibleProductCount,
              })}
            </span>
            <strong>
              {t("buyer.storesDirectory.viewStore")}
              <span aria-hidden="true">→</span>
            </strong>
          </div>
        </div>
      </Link>
    </article>
  );
}

function StoreDirectoryPage() {
  const { t } = useTranslation();
  const [stores, setStores] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
  });
  const [status, setStatus] = useState("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    getPublicStores({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      signal: controller.signal,
    })
      .then((result) => {
        const items = Array.isArray(result.items) ? result.items : [];
        const totalCount = Number(result.totalCount) || 0;
        const pageSize = Number(result.pageSize) || PAGE_SIZE;
        const totalPages =
          Number(result.totalPages) ||
          (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0);

        setStores(items);
        setPagination({
          page: Number(result.page) || page,
          pageSize,
          totalCount,
          totalPages,
        });
        setStatus("success");
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        console.error("Stores could not be loaded:", error);
        setStores([]);
        setStatus("error");
      });

    return () => controller.abort();
  }, [page, retryKey, search]);

  const resultLabel = useMemo(
    () =>
      t("buyer.storesDirectory.totalCount", {
        count: pagination.totalCount,
      }),
    [pagination.totalCount, t]
  );

  const totalPages = Math.max(0, Number(pagination.totalPages) || 0);
  const currentPage = Math.max(1, Number(pagination.page) || page);

  return (
    <>
      <Navbar />
      <main className="store-directory">
        <div className="container">
          <section className="store-directory__intro">
            <div>
              <h1>{t("buyer.storesDirectory.title")}</h1>
              <p>{t("buyer.storesDirectory.description")}</p>
            </div>

            <div className="store-directory__count" aria-live="polite">
              <strong>{pagination.totalCount}</strong>
              <span>{t("buyer.storesDirectory.storeCountLabel")}</span>
            </div>
          </section>

          <section
            className="store-directory__toolbar"
            aria-label={t("buyer.storesDirectory.searchLabel")}
          >
            <label>
              <span>{t("buyer.storesDirectory.searchLabel")}</span>
              <div className="store-directory__search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={searchInput}
                  placeholder={t("buyer.storesDirectory.searchPlaceholder")}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
            </label>
            <p>{resultLabel}</p>
          </section>

          {status === "loading" ? (
            <div
              className="store-directory__grid"
              role="status"
              aria-label={t("buyer.storesDirectory.loading")}
            >
              {SKELETONS.map((_, index) => (
                <span
                  key={index}
                  className="store-directory__skeleton"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : null}

          {status === "error" ? (
            <section className="store-directory__state" role="alert">
              <span aria-hidden="true">!</span>
              <h2>{t("buyer.storesDirectory.errorTitle")}</h2>
              <p>{t("buyer.storesDirectory.errorDescription")}</p>
              <button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
              >
                {t("buyer.storesDirectory.retry")}
              </button>
            </section>
          ) : null}

          {status === "success" && stores.length === 0 ? (
            <section className="store-directory__state" role="status">
              <span aria-hidden="true">◇</span>
              <h2>{t("buyer.storesDirectory.noResultsTitle")}</h2>
              <p>
                {search
                  ? t("buyer.storesDirectory.noResultsDescription")
                  : t("buyer.storesDirectory.emptyDescription")}
              </p>
              {search ? (
                <button type="button" onClick={() => setSearchInput("")}>
                  {t("buyer.storesDirectory.clearSearch")}
                </button>
              ) : (
                <Link to="/">{t("buyer.storesDirectory.backHome")}</Link>
              )}
            </section>
          ) : null}

          {status === "success" && stores.length > 0 ? (
            <>
              <section className="store-directory__grid" aria-label={resultLabel}>
                {stores.map((store) => (
                  <StoreCard key={store.storeId} store={store} t={t} />
                ))}
              </section>

              {totalPages > 1 ? (
                <nav
                  className="store-directory__pagination"
                  aria-label={t("buyer.storesDirectory.paginationLabel")}
                >
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    {t("buyer.storesDirectory.previous")}
                  </button>
                  <span>
                    {t("buyer.storesDirectory.pageStatus", {
                      page: currentPage,
                      totalPages,
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                  >
                    {t("buyer.storesDirectory.next")}
                  </button>
                </nav>
              ) : null}
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}

export default StoreDirectoryPage;
