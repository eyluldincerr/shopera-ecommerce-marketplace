// src/components/product/ProductSort.jsx

import { useTranslation } from "react-i18next";

const sortOptions = [
  { value: "newest", labelKey: "buyer.catalog.sort.newest" },
  { value: "price-low", labelKey: "buyer.catalog.sort.priceLow" },
  { value: "price-high", labelKey: "buyer.catalog.sort.priceHigh" },
  { value: "best-rated", labelKey: "buyer.catalog.sort.bestRated" },
  { value: "best-selling", labelKey: "buyer.catalog.sort.bestSelling" },
  { value: "name-asc", labelKey: "buyer.catalog.sort.nameAscending" },
  { value: "name-desc", labelKey: "buyer.catalog.sort.nameDescending" },
];

function ProductSort({ value, onChange }) {
  const { t } = useTranslation();

  return (
    <label className="product-sort">
      <span>{t("buyer.catalog.sort.label")}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ProductSort;
