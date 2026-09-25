// src/components/product/ProductFilters.jsx

import { useId } from "react";
import { useTranslation } from "react-i18next";

import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";

const defaultFilterGroups = [
  {
    key: "searchTerm",
    title: "Search inside results",
    control: "search",
  },
];

function toggleArrayValue(values = [], value) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function getFilterGroups(filterOptions) {
  return filterOptions?.groups?.length ? filterOptions.groups : defaultFilterGroups;
}

function normalizeOption(option) {
  if (option && typeof option === "object") {
    const value = option.value ?? option.key;

    return {
      key: String(option.key ?? value),
      value: String(value),
      label: option.label || String(value),
      count: option.count,
      disabled: Boolean(option.disabled),
    };
  }

  return {
    key: String(option),
    value: String(option),
    label: String(option),
    count: undefined,
    disabled: false,
  };
}

function OptionCount({ count }) {
  if (count === undefined || count === null) {
    return null;
  }

  return <span className="product-filters__count">{count}</span>;
}

function SearchFilter({ group, value, placeholder, onChange }) {
  return (
    <section className="product-filters__section">
      <h2>{group.title}</h2>
      <input
        type="search"
        value={value || ""}
        placeholder={group.placeholder || placeholder}
        onChange={(event) => onChange(group.key, event.target.value)}
      />
    </section>
  );
}

function CheckboxGroup({ group, selectedValues = [], onToggle }) {
  const normalizedOptions = (group.options || [])
    .map(normalizeOption)
    .filter((option) => option.value);

  if (!normalizedOptions.length) {
    return null;
  }

  return (
    <section className="product-filters__section">
      <h2>{group.title}</h2>
      <div className="product-filters__options">
        {normalizedOptions.map((option) => (
          <label
            className="product-filters__option"
            key={option.key}
            aria-disabled={option.disabled}
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              disabled={option.disabled}
              onChange={() => onToggle(option.value)}
            />
            <span>{option.label}</span>
            <OptionCount count={option.count} />
          </label>
        ))}
      </div>
    </section>
  );
}

function BooleanCheckboxGroup({ group, filters, onChange }) {
  const normalizedOptions = (group.options || [])
    .map(normalizeOption)
    .filter((option) => option.value);

  if (!normalizedOptions.length) {
    return null;
  }

  return (
    <section className="product-filters__section">
      <h2>{group.title}</h2>
      <div className="product-filters__options">
        {normalizedOptions.map((option) => (
          <label className="product-filters__option" key={option.key}>
            <input
              type="checkbox"
              checked={Boolean(filters[option.value])}
              onChange={(event) => onChange(option.value, event.target.checked)}
            />
            <span>{option.label}</span>
            <OptionCount count={option.count} />
          </label>
        ))}
      </div>
    </section>
  );
}

function PriceRangeFilter({ group, filters, onChange }) {
  const { t } = useTranslation();
  const minKey = group.minKey || "minPrice";
  const maxKey = group.maxKey || "maxPrice";
  const minPrice = group.min ?? 0;
  const configuredMaxPrice = Number(group.max);
  const hasConfiguredMaximum =
    Number.isFinite(configuredMaxPrice) && configuredMaxPrice > minPrice;

  return (
    <section className="product-filters__section">
      <h2>{group.title}</h2>
      <div className="product-filters__price-row">
        <label>
          <span>{t("buyer.filters.minimum")}</span>
          <input
            type="number"
            min={minPrice}
            max={hasConfiguredMaximum ? configuredMaxPrice : undefined}
            value={filters[minKey] || ""}
            placeholder={String(minPrice)}
            onChange={(event) => onChange(minKey, event.target.value)}
          />
        </label>

        <label>
          <span>{t("buyer.filters.maximum")}</span>
          <input
            type="number"
            min={minPrice}
            max={hasConfiguredMaximum ? configuredMaxPrice : undefined}
            value={filters[maxKey] || ""}
            placeholder={
              hasConfiguredMaximum
                ? String(configuredMaxPrice)
                : t("buyer.filters.any")
            }
            onChange={(event) => onChange(maxKey, event.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className="product-filters__inline-clear"
        onClick={() => {
          onChange(minKey, "");
          onChange(maxKey, "");
        }}
      >
        {t("buyer.filters.clearPrice")}
      </button>
    </section>
  );
}

function RadioGroup({ group, value, onChange }) {
  const normalizedOptions = (group.options || [])
    .map(normalizeOption)
    .filter((option) => option.value);

  if (!normalizedOptions.length) {
    return null;
  }

  return (
    <section className="product-filters__section">
      <h2>{group.title}</h2>
      <div className="product-filters__options">
        {normalizedOptions.map((option) => (
          <label className="product-filters__option" key={option.key}>
            <input
              type="radio"
              name={`${group.key}-filter`}
              checked={value === option.value}
              onChange={() => onChange(group.key, option.value)}
            />
            <span>{option.label}</span>
            <OptionCount count={option.count} />
          </label>
        ))}
      </div>
    </section>
  );
}

function SelectFilter({ group, value, onChange }) {
  const selectableOptions = (group.options || [])
    .map(normalizeOption)
    .filter((option, index) => index === 0 || option.value || option.count > 0);

  if (selectableOptions.length <= 1) {
    return null;
  }

  return (
    <section className="product-filters__section">
      <h2>{group.title}</h2>
      <select value={value || ""} onChange={(event) => onChange(group.key, event.target.value)}>
        {selectableOptions.map((option) => (
          <option key={option.key} value={option.value}>
            {option.label}
            {option.value && option.count !== undefined ? ` (${option.count})` : ""}
          </option>
        ))}
      </select>
    </section>
  );
}

function renderFilterGroup({ group, filters, searchPlaceholder, onChange }) {
  if (group.control === "search") {
    return (
      <SearchFilter
        key={group.key}
        group={group}
        value={filters[group.key]}
        placeholder={searchPlaceholder}
        onChange={onChange}
      />
    );
  }

  if (group.control === "checkboxes") {
    return (
      <CheckboxGroup
        key={group.key}
        group={group}
        selectedValues={filters[group.key] || []}
        onToggle={(value) =>
          onChange(group.key, toggleArrayValue(filters[group.key], value))
        }
      />
    );
  }

  if (group.control === "boolean-checkboxes") {
    return (
      <BooleanCheckboxGroup
        key={group.key}
        group={group}
        filters={filters}
        onChange={onChange}
      />
    );
  }

  if (group.control === "price-range") {
    return (
      <PriceRangeFilter
        key={group.key}
        group={group}
        filters={filters}
        onChange={onChange}
      />
    );
  }

  if (group.control === "radio") {
    return (
      <RadioGroup
        key={group.key}
        group={group}
        value={filters[group.key]}
        onChange={onChange}
      />
    );
  }

  if (group.control === "select") {
    return (
      <SelectFilter
        key={group.key}
        group={group}
        value={filters[group.key]}
        onChange={onChange}
      />
    );
  }

  return null;
}

function getOptionLabel(group, value) {
  const option = (group.options || [])
    .map(normalizeOption)
    .find((currentOption) => currentOption.value === String(value));

  return option?.label || value;
}

function getActiveFilterValueCount(value) {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value ? 1 : 0;
}

export function ProductFilterChips({ filters, filterOptions, onRemove, onClear }) {
  const { t } = useTranslation();
  const groups = getFilterGroups(filterOptions).map((group) => ({
    ...group,
    title: t(`buyer.filters.groups.${group.key}`, {
      defaultValue: group.title,
    }),
  }));
  const handledKeys = new Set();
  const chips = [];

  groups.forEach((group) => {
    if (group.control === "checkboxes") {
      handledKeys.add(group.key);

      (filters[group.key] || []).forEach((value) => {
        chips.push({
          key: `${group.key}-${value}`,
          label: `${group.title}: ${getOptionLabel(group, value)}`,
          onRemove: () => onRemove(group.key, value),
        });
      });
    }

    if (group.control === "boolean-checkboxes") {
      (group.options || []).map(normalizeOption).forEach((option) => {
        handledKeys.add(option.value);

        if (filters[option.value]) {
          chips.push({
            key: option.value,
            label: option.label,
            onRemove: () => onRemove(option.value),
          });
        }
      });
    }

    if (group.control === "search") {
      handledKeys.add(group.key);

      if (filters[group.key]) {
        chips.push({
          key: group.key,
          label: `${group.title}: ${filters[group.key]}`,
          onRemove: () => onRemove(group.key),
        });
      }
    }

    if (group.control === "price-range") {
      const minKey = group.minKey || "minPrice";
      const maxKey = group.maxKey || "maxPrice";
      handledKeys.add(minKey);
      handledKeys.add(maxKey);

      if (filters[minKey] || filters[maxKey]) {
        chips.push({
          key: group.key,
          label: `$${filters[minKey] || "0"} - $${
            filters[maxKey] || t("buyer.filters.any")
          }`,
          onRemove: () => onRemove(group.key),
        });
      }
    }

    if (group.control === "radio" || group.control === "select") {
      handledKeys.add(group.key);

      if (filters[group.key]) {
        chips.push({
          key: group.key,
          label: `${group.title}: ${getOptionLabel(group, filters[group.key])}`,
          onRemove: () => onRemove(group.key),
        });
      }
    }
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (handledKeys.has(key) || getActiveFilterValueCount(value) === 0) {
      return;
    }

    chips.push({
      key,
      label: Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${value}`,
      onRemove: () => onRemove(key),
    });
  });

  if (!chips.length) {
    return null;
  }

  return (
    <div
      className="product-filter-chips"
      aria-label={t("buyer.filters.activeFilters")}
    >
      {chips.map((chip) => (
        <button type="button" key={chip.key} onClick={chip.onRemove}>
          {chip.label}
          <span aria-hidden="true"> x</span>
        </button>
      ))}
      <button type="button" className="product-filter-chips__clear" onClick={onClear}>
        {t("buyer.filters.clearAll")}
      </button>
    </div>
  );
}

function ProductFilters({
  filters,
  filterOptions,
  onChange,
  onClear,
  activeFilterCount = 0,
  searchPlaceholder = "Search within these products...",
  isMobileOpen = false,
  onClose,
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const filterOverlay = useOverlayAccessibility({
    isOpen: isMobileOpen,
    onClose,
  });
  const groups = getFilterGroups(filterOptions).map((group) => ({
    ...group,
    title: t(`buyer.filters.groups.${group.key}`, {
      defaultValue: group.title,
    }),
  }));
  const translatedSearchPlaceholder = t("buyer.filters.searchPlaceholder", {
    defaultValue: searchPlaceholder,
  });

  const renderContent = (isDrawer = false) => (
    <>
      <div className="product-filters__header">
        <strong id={isDrawer ? titleId : undefined}>
          {t("buyer.filters.title")}
        </strong>
        <div className="product-filters__header-actions">
          <button
            type="button"
            onClick={onClear}
            disabled={activeFilterCount === 0}
            aria-label={t("buyer.filters.clear")}
          >
            {t("buyer.filters.clear")}
          </button>
          {isDrawer && (
            <button
              ref={filterOverlay.initialFocusRef}
              type="button"
              className="product-filters__close"
              onClick={onClose}
              aria-label={t("buyer.filters.close")}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          )}
        </div>
      </div>

      {isDrawer && (
        <p id={descriptionId} className="visually-hidden">
          {t("buyer.filters.description")}
        </p>
      )}

      {groups.map((group) =>
        renderFilterGroup({
          group,
          filters,
          searchPlaceholder: translatedSearchPlaceholder,
          onChange,
        })
      )}

      <div className="product-filters__mobile-actions">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("buyer.filters.apply")}
        >
          {t("buyer.filters.apply")}
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label={t("buyer.filters.clearFilters")}
        >
          {t("buyer.filters.clearFilters")}
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="product-filters"
        aria-label={t("buyer.filters.productFilters")}
      >
        {renderContent()}
      </aside>

      {isMobileOpen && (
        <div
          ref={filterOverlay.overlayRef}
          className="product-filters-drawer is-open"
        >
          <div
            className="product-filters-drawer__backdrop"
            aria-hidden="true"
            onClick={onClose}
          />
          <aside
            className="product-filters product-filters--drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex="-1"
          >
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}

export default ProductFilters;
