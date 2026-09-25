// src/pages/seller/SellerProductsPage.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getSellerProducts,
  getSellerProduct,
  addSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerProductOptions,
  getSellerStoreProfile,
  subscribeSellerData,
} from "../../services/sellerService";

import ProductModal from "../../components/seller/ProductModal";
import SellerProductFilters from "../../components/seller/SellerProductFilters";
import SellerAsyncState from "../../components/seller/SellerAsyncState";
import AuthenticatedImage from "../../components/common/AuthenticatedImage";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";

import { useTranslation } from "react-i18next";
import {
  STOCK_STATUS,
  getStockStatus,
} from "../../constants/marketplace";

function SellerProductsContent() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [hasStore, setHasStore] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    brands: [],
    conditions: [],
    statuses: [],
    stockStatuses: [],
    minPrice: "",
    maxPrice: "",
    minimumRating: 0,
  });

  const [selectedProductIds, setSelectedProductIds] =
    useState([]);

    const [selectedProduct, setSelectedProduct] =
  useState(null);

const [modalMode, setModalMode] =
  useState("add");

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  const [isProductModalOpen, setIsProductModalOpen] =
  useState(false);

  const loadProducts = useCallback(async (retry = false) => {
  try {
    setLoadError("");
    setIsRetrying(retry);
    if (!retry) {
      setIsLoading(true);
    }
    const [data, options, profile] = await Promise.all([
      getSellerProducts({
        page: currentPage,
        pageSize: productsPerPage,
        search: searchTerm,
        filters,
      }),
      getSellerProductOptions(),
      getSellerStoreProfile(),
    ]);
    setProducts(data.items);
    setPagination({
      totalCount: data.totalCount,
      totalPages:
        data.totalPages ||
        Math.max(1, Math.ceil(data.totalCount / productsPerPage)),
      hasMore: data.hasMore,
    });
    setCategoryOptions(options.categories);
    setHasStore(profile.hasStore);
  } catch (error) {
    setLoadError(error.message || t("common.errorDescription"));
  } finally {
    setIsLoading(false);
    setIsRetrying(false);
  }
}, [currentPage, filters, searchTerm, t]);


  useEffect(() => {
  loadProducts();
  const unsubscribe = subscribeSellerData(loadProducts);
  return unsubscribe;
}, [loadProducts]);

  const filterOptions = useMemo(() => {
    const buildOptions = (getValue) => {
      const counts = new Map();
      products.forEach((product) => {
        const value = getValue(product);
        if (value) {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      });
      return [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((first, second) =>
          String(first.value).localeCompare(String(second.value))
        );
    };

    return {
      categories: buildOptions((product) => product.category),
      brands: buildOptions((product) => product.brand),
      conditions: buildOptions((product) => product.condition),
      statuses: buildOptions((product) => product.status),
      stockStatuses: buildOptions((product) => getStockStatus(product.stock)),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        [product.name, product.sku, product.brand, product.modelNumber]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );

      const matchesCategory =
        filters.categories.length === 0 ||
        filters.categories.includes(product.category);
      const matchesBrand =
        filters.brands.length === 0 ||
        filters.brands.includes(product.brand);
      const matchesCondition =
        filters.conditions.length === 0 ||
        filters.conditions.includes(product.condition);
      const matchesStatus =
        filters.statuses.length === 0 ||
        filters.statuses.includes(product.status);
      const matchesStockStatus =
        filters.stockStatuses.length === 0 ||
        filters.stockStatuses.includes(getStockStatus(product.stock));
      const price = Number(product.price);
      const matchesMinimumPrice =
        filters.minPrice === "" || price >= Number(filters.minPrice);
      const matchesMaximumPrice =
        filters.maxPrice === "" || price <= Number(filters.maxPrice);
      const matchesRating =
        filters.minimumRating === 0 ||
        Number(product.rating) >= filters.minimumRating;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesBrand &&
        matchesCondition &&
        matchesStatus &&
        matchesStockStatus &&
        matchesMinimumPrice &&
        matchesMaximumPrice &&
        matchesRating
      );
    });
  }, [
    products,
    searchTerm,
    filters,
  ]);

  const totalPages = pagination.totalPages;
  const visibleProducts = filteredProducts;

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (name, value) => {
    if ((name === "minPrice" || name === "maxPrice") && Number(value) < 0) {
      return;
    }
    setFilters((current) => ({ ...current, [name]: value }));
    setCurrentPage(1);
  };

  const toggleFilterValue = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: current[name].includes(value)
        ? current[name].filter((item) => item !== value)
        : [...current[name], value],
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      categories: [],
      brands: [],
      conditions: [],
      statuses: [],
      stockStatuses: [],
      minPrice: "",
      maxPrice: "",
      minimumRating: 0,
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((currentIds) =>
      currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId]
    );
  };


  const openEditProduct = async (productId) => {
    try {
      setLoadError("");
      setIsLoadingProduct(true);
      const product = await getSellerProduct(productId);
      setModalMode("edit");
      setSelectedProduct(product);
      setIsProductModalOpen(true);
    } catch (error) {
      setLoadError(error.message || t("common.errorDescription"));
    } finally {
      setIsLoadingProduct(false);
    }
  };

  if (isRetrying) {
    return <SellerAsyncState status="retrying" />;
  }

  if (isLoading) {
    return <SellerAsyncState status="loading" />;
  }

  if (loadError) {
    return (
      <SellerAsyncState
        status="error"
        error={loadError}
        onRetry={() => loadProducts(true)}
      />
    );
  }

  if (!hasStore) {
    return (
      <SellerAsyncState
        status="empty"
        title={t("common.storeRequiredTitle")}
        description={t("common.storeRequiredDescription")}
        action={
          <Link to="/seller/store-profile">
            {t("storeProfile.createStore")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="seller-products-content">
      <section className="seller-products-heading">
        <div className="seller-products-heading__text">
          <h1>{t("products.title")}</h1>

          <p>{t("products.description")}</p>
        </div>

        <div className="seller-products-heading__actions">
          <label className="seller-products-search">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={t("products.searchPlaceholder")}
              aria-label={t("products.searchAriaLabel")}
            />
          </label>

          <button
            type="button"
            className="seller-products-filter-toggle"
            onClick={() => setIsFilterOpen((current) => !current)}
          >
            {isFilterOpen
              ? t("products.hideFilters")
              : t("products.showFilters")}
          </button>

          <button
  type="button"
  className="seller-products-add-button"
  onClick={() => {
    setModalMode("add");
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  }}
>
  <span aria-hidden="true">＋</span>
  {t("products.addProduct")}
</button>
        </div>
      </section>

      <div className="seller-products-layout">
        <SellerProductFilters
          isOpen={isFilterOpen}
          filters={{ ...filters, search: searchTerm }}
          options={filterOptions}
          onFilterChange={(name, value) => {
            if (name === "search") {
              setSearchTerm(value);
              setCurrentPage(1);
            } else {
              handleFilterChange(name, value);
            }
          }}
          onToggleValue={toggleFilterValue}
          onClear={clearFilters}
          onClose={() => setIsFilterOpen(false)}
        />
        <div className="seller-products-results">
      {visibleProducts.length > 0 ? (
        <section className="seller-products-grid">
          {visibleProducts.map((product) => {
            const isSelected =
              selectedProductIds.includes(product.id);

            return (
              <article
                key={product.id}
                className={`seller-product-card ${
                  isSelected
                    ? "seller-product-card--selected"
                    : ""
                }`}
              >
                <div className="seller-product-card__top">
                  <label className="seller-product-card__checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        toggleProductSelection(product.id)
                      }
                      aria-label={t("products.selectProduct", { name: product.name })}
                    />

                    <span />
                  </label>

                </div>

                <div className="seller-product-card__visual">
                  <AuthenticatedImage
                    src={product.image}
                    alt={product.name}
                    fallback={<span>{product.symbol}</span>}
                  />
                </div>

<span
  className={`seller-product-card__condition-badge ${
    product.condition !== "NEW"
      ? "seller-product-card__condition-badge--used"
      : "seller-product-card__condition-badge--new"
  }`}
>
  {t(`products.conditionCodes.${product.condition}`)}
</span>

                <div className="seller-product-card__information">
                  <h2>{product.name}</h2>
                  <span className="seller-product-card__variant-count">
                    {t("products.variantCount", {
                      count: product.variantCount ?? product.variants.length,
                    })}
                  </span>

                  <strong className="seller-product-card__price">
                    {product.price == null
                      ? t("products.priceUnavailable")
                      : `$${Number(product.price).toFixed(2)}`}
                  </strong>

                  <div className="seller-product-card__stock-row">
                    <span>{t("products.stock")}: {product.stock}</span>

                    <span
                      className={
                        getStockStatus(product.stock) !== STOCK_STATUS.IN_STOCK
                          ? "seller-product-card__stock seller-product-card__stock--low"
                          : "seller-product-card__stock"
                      }
                    >
                      {getStockStatus(product.stock) === STOCK_STATUS.OUT_OF_STOCK
                        ? t("products.outOfStock")
                        : getStockStatus(product.stock) === STOCK_STATUS.LOW_STOCK
                          ? `${t("products.lowStock")}: ${product.stock}`
                          : `${t("products.stock")}: ${product.stock}`}
                    </span>
                  </div>

                  <div className="seller-product-card__performance">
                    <span>{product.status}</span>
                    {product.reviewCount > 0 && product.rating != null ? (
                      <span className="seller-product-card__rating">
                        ★ {Number(product.rating).toFixed(1)}
                        <small>({product.reviewCount})</small>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="seller-product-card__actions">
                  <button
                  type="button"
                  className="seller-product-card__action seller-product-card__action--edit"
                  aria-label={t("products.editProduct", { name: product.name })}
                  onClick={() => openEditProduct(product.id)}
                  disabled={isLoadingProduct}
                >
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </svg>
</button>

                 <button
  type="button"
  className="seller-product-card__action seller-product-card__action--delete"
  aria-label={t("products.deleteProduct", { name: product.name })}
  onClick={() => {
  setModalMode("delete");
  setSelectedProduct(product);
  setIsProductModalOpen(true);
}}
>
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v5" />
    <path d="M14 11v5" />
  </svg>
</button>

                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="seller-products-empty">
          <h2>{t("products.emptyTitle")}</h2>
          <p>{t("products.emptyDescription")}</p>
        </section>
      )}

      <footer className="seller-products-footer">
        <p>
          {t("products.showing")}{" "}
          {filteredProducts.length === 0
            ? 0
            : (currentPage - 1) * productsPerPage + 1}{" "}
          to{" "}
          {Math.min(
            currentPage * productsPerPage,
            filteredProducts.length
          )}{" "}
          {t("products.of")} {t("products.resultCount", { count: pagination.totalCount })}
        </p>

        <div className="seller-products-pagination">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((page) => page - 1)
            }
            aria-label={t("products.previousPage")}
          >
            ‹
          </button>

          {Array.from(
            { length: totalPages },
            (_, index) => index + 1
          ).map((page) => (
            <button
              key={page}
              type="button"
              className={
                currentPage === page
                  ? "seller-products-pagination__button--active"
                  : ""
              }
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) => page + 1)
            }
            aria-label={t("products.nextPage")}
          >
            ›
          </button>
        </div>

        <div className="seller-products-per-page">
          10 {t("products.perPage")}
          <span aria-hidden="true">⌄</span>
        </div>
      </footer>
        </div>
      </div>

     <ProductModal
  isOpen={isProductModalOpen}
  mode={modalMode}
  product={selectedProduct}
  onClose={() => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
    setModalMode("add");
  }}
  onSave={async (productData) => {
    try {
      if (modalMode === "edit" && selectedProduct) {
        await updateSellerProduct(
          selectedProduct.id,
          productData
        );
      } else {
        await addSellerProduct(productData);
      }

      await loadProducts();

      setIsProductModalOpen(false);
      setSelectedProduct(null);
      setModalMode("add");
    } catch (error) {
      console.error(
        "Product could not be saved:",
        error
      );
      throw error;
    }
  }}
  onDelete={async () => {
    if (!selectedProduct) {
      return;
    }

    try {
      await deleteSellerProduct(selectedProduct.id);
      await loadProducts();

      setIsProductModalOpen(false);
      setSelectedProduct(null);
      setModalMode("add");
    } catch (error) {
      console.error(
        "Product could not be deleted:",
        error
      );
      throw error;
    }
  }}
  categoryOptions={categoryOptions}
/>
    </div>
  );
}

function SellerProductsPage() {
  return (
    <SellerPageShell>
      <SellerProductsContent />
    </SellerPageShell>
  );
}

export default SellerProductsPage;
