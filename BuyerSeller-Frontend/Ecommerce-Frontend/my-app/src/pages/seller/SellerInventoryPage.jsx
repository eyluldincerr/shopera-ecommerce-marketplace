// src/pages/seller/SellerInventoryPage.jsx

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import SellerAsyncState from "../../components/seller/SellerAsyncState";
import AuthenticatedImage from "../../components/common/AuthenticatedImage";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";
import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";

const EMPTY_PRODUCTS = [];

import {
  getSellerInventory,
  updateSellerVariantStock,
  subscribeSellerData,
} from "../../services/sellerService";
function InventoryStatisticIcon({ type }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (type === "cube") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5" />
        <path d="M12 12v9" />
      </svg>
    );
  }

  if (type === "bag") {
    return (
      <svg {...commonProps}>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }

  if (type === "warning") {
    return (
      <svg {...commonProps}>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SellerInventoryContent() {
  const { t } = useTranslation();
  const [inventoryData, setInventoryData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
  useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newStock, setNewStock] = useState("");
  const [stockError, setStockError] = useState("");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  const productsPerPage = 10;

  const loadInventory = useCallback(async (retry = false) => {
    try {
      setLoadError("");
      setIsRetrying(retry);
      const data = await getSellerInventory({
        page: currentPage,
        pageSize: productsPerPage,
        search: searchTerm.trim() || undefined,
        categoryId:
          selectedCategory === "ALL"
            ? undefined
            : Number(selectedCategory),
      });
      setInventoryData(data);
    } catch (error) {
      setLoadError(error.message || t("common.errorDescription"));
    } finally {
      setIsRetrying(false);
    }
  }, [currentPage, productsPerPage, searchTerm, selectedCategory, t]);

  useEffect(() => {
  loadInventory();

  const unsubscribe = subscribeSellerData(() => {
    loadInventory();
  });

  return () => {
    unsubscribe();
  };
}, [loadInventory]);

  const products = inventoryData?.products || EMPTY_PRODUCTS;
  const categories = inventoryData?.categories || EMPTY_PRODUCTS;
  const pagination = inventoryData?.pagination || {
    page: 1,
    pageSize: productsPerPage,
    totalCount: 0,
    totalPages: 1,
  };
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const visibleProducts = products;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    setCurrentPage(1);
  };


  const openUpdateStock = (product) => {
  setSelectedProduct(product);
  setNewStock(String(product.stock));
  setStockError("");
};

const closeUpdateStock = () => {
  if (isUpdatingStock) return;
  setSelectedProduct(null);
  setNewStock("");
  setStockError("");
};

const stockOverlay = useOverlayAccessibility({
  isOpen: Boolean(selectedProduct),
  onClose: closeUpdateStock,
  preventClose: isUpdatingStock,
});

const decreaseStock = () => {
  setNewStock((currentStock) => {
    const stock = Number(currentStock) || 0;

    return String(Math.max(0, stock - 1));
  });

  setStockError("");
};

const increaseStock = () => {
  setNewStock((currentStock) => {
    const stock = Number(currentStock) || 0;

    return String(stock + 1);
  });

  setStockError("");
};

const handleUpdateStock = async () => {
  if (!selectedProduct || isUpdatingStock) {
    return;
  }

  const stock = Number(newStock);

  if (
    newStock === "" ||
    Number.isNaN(stock) ||
    stock < 0 ||
    !Number.isInteger(stock)
  ) {
    setStockError(t("inventory.stockValidationError"));

    return;
  }

  try {
    setIsUpdatingStock(true);
    await updateSellerVariantStock(
      selectedProduct.productId,
      selectedProduct.id,
      stock,
      selectedProduct.rowVersion
    );
    await loadInventory();
    setSelectedProduct(null);
    setNewStock("");
    setStockError("");
  } catch (error) {
    console.error("Stock could not be updated:", error);

    setStockError(
      error?.status === 409
        ? t("inventory.staleStockConflict")
        : t("inventory.stockUpdateError")
    );
  } finally {
    setIsUpdatingStock(false);
  }
};

  const getStockTone = (product) => {
  if (product.statusKey === "inventory.status.outOfStock") {
    return "red";
  }

  if (product.statusKey === "inventory.status.lowStock") {
    return "orange";
  }

  return "green";
};

  if (isRetrying) {
    return <SellerAsyncState status="retrying" />;
  }

  if (loadError) {
    return (
      <SellerAsyncState
        status="error"
        error={loadError}
        onRetry={() => loadInventory(true)}
      />
    );
  }

  if (!inventoryData) {
    return <SellerAsyncState status="loading" />;
  }

  if (!inventoryData.hasStore) {
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
    <div className="seller-inventory-content">
      <section className="seller-inventory-heading">
        <div>
          <h1>{t("inventory.title")}</h1>

          <p>{t("inventory.subtitle")}</p>
        </div>

        <div className="seller-inventory-heading__actions">
          <label className="seller-inventory-search">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={t("inventory.search")}
              aria-label={t("inventory.search")}
            />
          </label>

          <select
            className="seller-inventory-category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            aria-label={t("inventory.filterCategory")}
          >
            <option value="ALL">
              {t("inventory.allCategories")}
            </option>
            {categories.map((category) => (
              <option
                key={category.categoryId}
                value={category.categoryId}
              >
                {category.categoryName}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="seller-inventory-statistics">
        {inventoryData.statistics.map((statistic) => (
          <article
            key={statistic.id}
            className="seller-inventory-stat-card"
          >
            <div
              className={`seller-inventory-stat-card__icon seller-inventory-stat-card__icon--${statistic.color}`}
            >
              <InventoryStatisticIcon type={statistic.icon} />
            </div>

            <div className="seller-inventory-stat-card__content">
              <span>{t(statistic.titleKey)}</span>

              <strong>{statistic.value}</strong>

              <small>{t(statistic.descriptionKey)}</small>
            </div>
          </article>
        ))}
      </section>

      {visibleProducts.length > 0 ? (
        <section className="seller-inventory-grid">
          {visibleProducts.map((product) => {
            const stockTone = getStockTone(product);

            return (
              <article
                key={product.id}
                className="seller-inventory-card"
              >
                <div className="seller-inventory-card__top">
                  {product.statusKey !== "inventory.status.inStock" ? (
                    <span
                      className={`seller-inventory-card__badge seller-inventory-card__badge--${stockTone}`}
                    >
                      {t(product.statusKey)}
                    </span>
                  ) : (
                    <span />
                  )}
                </div>

                <div className="seller-inventory-card__visual">
                  <AuthenticatedImage
                    src={product.image}
                    alt={product.name}
                    fallback={<span>{product.symbol}</span>}
                  />
                </div>

                <div className="seller-inventory-card__information">
                  <h2>{product.name}</h2>

                  <p>
                   {t("inventory.sku")}: {product.sku}
                 </p>

                  <strong
                    className={`seller-inventory-card__stock seller-inventory-card__stock--${stockTone}`}
                  >
                    {t("inventory.stock", {
                     stock: product.stock,
                   })}
                  </strong>
                </div>


                <button
  type="button"
  className="seller-inventory-card__update-button"
  onClick={() => openUpdateStock(product)}
>
  {t("inventory.updateStock")}
</button>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="seller-inventory-empty">
         <h2>{t("inventory.noProductsFound")}</h2>
<p>{t("inventory.noProductsDescription")}</p>
        </section>
      )}

      <footer className="seller-inventory-footer">
        <p>
  {t("inventory.showingProducts", {
    start:
      pagination.totalCount === 0
        ? 0
        : (currentPage - 1) * productsPerPage + 1,
    end: Math.min(
      currentPage * productsPerPage,
      pagination.totalCount
    ),
    total: pagination.totalCount,
  })}
</p>

        <div className="seller-inventory-pagination">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((page) => page - 1)
            }
           aria-label={t("inventory.previousPage")}
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
                  ? "seller-inventory-pagination__button--active"
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
            aria-label={t("inventory.nextPage")}
          >
            ›
          </button>
        </div>

        <div className="seller-inventory-per-page">
          {t("inventory.perPage", { count: productsPerPage })}
          <span aria-hidden="true">⌄</span>
        </div>
      </footer>

      {selectedProduct && (
  <div
    ref={stockOverlay.overlayRef}
    className="seller-stock-modal"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        closeUpdateStock();
      }
    }}
  >
    <div
      className="seller-stock-modal__card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seller-stock-modal-title"
      aria-describedby="seller-stock-modal-description"
    >
      <div className="seller-stock-modal__header">
        <div>
          <h2 id="seller-stock-modal-title">
            {t("inventory.updateStock")}
          </h2>

          <p id="seller-stock-modal-description">{selectedProduct.name}</p>
        </div>

        <button
          ref={stockOverlay.initialFocusRef}
          type="button"
          className="seller-stock-modal__close"
          onClick={closeUpdateStock}
          aria-label={t("inventory.closeUpdateStock")}
        >
          ×
        </button>
      </div>

      <div className="seller-stock-modal__current">
        <span>{t("inventory.currentStock")}</span>
        <strong>{selectedProduct.stock}</strong>
      </div>

      <label className="seller-stock-modal__field">
        <span>{t("inventory.newStockQuantity")}</span>

        <div className="seller-stock-modal__quantity">
          <button
            type="button"
            onClick={decreaseStock}
            aria-label={t("inventory.decreaseStock")}
          >
            −
          </button>

          <input
            type="number"
            min="0"
            step="1"
            value={newStock}
            onChange={(event) => {
              setNewStock(event.target.value);
              setStockError("");
            }}
            aria-label={t("inventory.newStockQuantity")}
          />

          <button
            type="button"
            onClick={increaseStock}
            aria-label={t("inventory.increaseStock")}
          >
            +
          </button>
        </div>
      </label>

      {stockError ? (
  <p className="seller-stock-modal__error">
    {stockError}
  </p>
) : null}

      <div className="seller-stock-modal__actions">
        <button
          type="button"
          className="seller-stock-modal__cancel"
          onClick={closeUpdateStock}
        >
          {t("common.cancel")}
        </button>

        <button
          type="button"
          className="seller-stock-modal__submit"
          onClick={handleUpdateStock}
          disabled={
            isUpdatingStock ||
            newStock === "" ||
            Number(newStock) < 0 ||
            !Number.isInteger(Number(newStock))
          }
          aria-busy={isUpdatingStock}
        >
          {isUpdatingStock ? t("common.loading") : t("inventory.updateStock")}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

function SellerInventoryPage() {
  return (
    <SellerPageShell>
      <SellerInventoryContent />
    </SellerPageShell>
  );
}

export default SellerInventoryPage;
