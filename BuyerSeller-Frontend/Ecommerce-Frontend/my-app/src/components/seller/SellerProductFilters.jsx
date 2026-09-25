import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PRODUCT_STATUS,
  STOCK_STATUS,
} from "../../constants/marketplace";
import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";

function CheckboxSection({ title, options, selectedValues, onToggle, getLabel }) {
  if (options.length === 0) {
    return null;
  }

  return (
    <section className="seller-product-filters__section">
      <h3>{title}</h3>
      <div className="seller-product-filters__options">
        {options.map(({ value, count }) => (
          <label key={value} className="seller-product-filters__option">
            <input
              type="checkbox"
              checked={selectedValues.includes(value)}
              onChange={() => onToggle(value)}
            />
            <span className="seller-product-filters__checkbox" />
            <span className="seller-product-filters__option-label">
              {getLabel(value)}
            </span>
            <small>{count}</small>
          </label>
        ))}
      </div>
    </section>
  );
}

function SellerProductFilters({
  isOpen,
  filters,
  options,
  onFilterChange,
  onToggleValue,
  onClear,
  onClose,
}) {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1000px)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1000px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  const filterOverlay = useOverlayAccessibility({
    isOpen: isMobile && isOpen,
    onClose,
  });

  const publicationLabels = {
    [PRODUCT_STATUS.ACTIVE]: t("products.active"),
    [PRODUCT_STATUS.DRAFT]: t("products.draft"),
    [PRODUCT_STATUS.INACTIVE]: t("products.inactive"),
    [PRODUCT_STATUS.DELETED]: t("products.deleted"),
  };
  const stockLabels = {
    [STOCK_STATUS.IN_STOCK]: t("products.inStock"),
    [STOCK_STATUS.LOW_STOCK]: t("products.lowStock"),
    [STOCK_STATUS.OUT_OF_STOCK]: t("products.outOfStock"),
  };

  return (
    <>
      {isMobile && isOpen && (
        <button
          type="button"
          className="seller-product-filters__overlay"
          onClick={onClose}
          aria-label={t("products.hideFilters")}
        />
      )}
      <aside
        ref={filterOverlay.overlayRef}
        className={`seller-product-filters ${
          isOpen ? "seller-product-filters--open" : ""
        }`}
        role={isMobile && isOpen ? "dialog" : "complementary"}
        aria-modal={isMobile && isOpen ? "true" : undefined}
        aria-labelledby="seller-product-filters-title"
        inert={isMobile && !isOpen}
        tabIndex={isMobile && isOpen ? -1 : undefined}
      >
        <header className="seller-product-filters__header">
          <h2 id="seller-product-filters-title">{t("products.advancedFilters")}</h2>
          <button
            ref={filterOverlay.initialFocusRef}
            type="button"
            onClick={onClose}
            aria-label={t("products.hideFilters")}
          >
            ×
          </button>
        </header>

        <section className="seller-product-filters__section">
          <label htmlFor="seller-filter-search">
            <h3>{t("products.searchInside")}</h3>
          </label>
          <input
            id="seller-filter-search"
            type="search"
            value={filters.search}
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder={t("products.searchInsidePlaceholder")}
          />
        </section>

        <CheckboxSection
          title={t("products.category")}
          options={options.categories}
          selectedValues={filters.categories}
          onToggle={(value) => onToggleValue("categories", value)}
          getLabel={(value) => value}
        />
        <CheckboxSection
          title={t("products.brand")}
          options={options.brands}
          selectedValues={filters.brands}
          onToggle={(value) => onToggleValue("brands", value)}
          getLabel={(value) => value}
        />
        <CheckboxSection
          title={t("products.condition")}
          options={options.conditions}
          selectedValues={filters.conditions}
          onToggle={(value) => onToggleValue("conditions", value)}
          getLabel={(value) => t(`products.conditionCodes.${value}`)}
        />
        <CheckboxSection
          title={t("products.publicationStatus")}
          options={options.statuses}
          selectedValues={filters.statuses}
          onToggle={(value) => onToggleValue("statuses", value)}
          getLabel={(value) => publicationLabels[value] || value}
        />
        <CheckboxSection
          title={t("products.availability")}
          options={options.stockStatuses}
          selectedValues={filters.stockStatuses}
          onToggle={(value) => onToggleValue("stockStatuses", value)}
          getLabel={(value) => stockLabels[value] || value}
        />

        <section className="seller-product-filters__section">
          <h3>{t("products.priceRange")}</h3>
          <div className="seller-product-filters__price">
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.minPrice}
              onChange={(event) => onFilterChange("minPrice", event.target.value)}
              placeholder={t("products.minimumPrice")}
              aria-label={t("products.minimumPrice")}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.maxPrice}
              onChange={(event) => onFilterChange("maxPrice", event.target.value)}
              placeholder={t("products.maximumPrice")}
              aria-label={t("products.maximumPrice")}
            />
          </div>
        </section>

        <section className="seller-product-filters__section">
          <h3>{t("products.rating")}</h3>
          <div className="seller-product-filters__options">
            {[4, 3, 2, 1].map((rating) => (
              <label key={rating} className="seller-product-filters__option">
                <input
                  type="radio"
                  name="seller-minimum-rating"
                  checked={filters.minimumRating === rating}
                  onChange={() => onFilterChange("minimumRating", rating)}
                />
                <span className="seller-product-filters__checkbox" />
                <span className="seller-product-filters__option-label">
                  {t("products.starsAndUp", { count: rating })}
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="seller-product-filters__actions">
          <button
            type="button"
            className="seller-product-filters__clear"
            onClick={onClear}
          >
            {t("products.clearFilters")}
          </button>
          <button type="button" onClick={onClose}>
            {t("orders.applyFilters")}
          </button>
        </div>
      </aside>
    </>
  );
}

export default SellerProductFilters;
