import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) =>
  readFile(path.join(root, relativePath), "utf8");

test("Category and Search send their effective database search to Product service", async () => {
  const categoryPage = await read("src/pages/buyer/CategoryPage.jsx");
  const searchPage = await read("src/pages/buyer/SearchResultsPage.jsx");

  assert.match(categoryPage, /getProductsByCategory\(category\?\.categoryId/);
  assert.match(categoryPage, /search:\s*filters\.searchTerm/);
  assert.match(searchPage, /refinedSearchTerm\s*=\s*filters\.searchTerm\.trim\(\)/);
  assert.match(searchPage, /searchProducts\(refinedSearchTerm/);
});

test("Buyer sorting exposes only confirmed backend catalogue sorts", async () => {
  const sort = await read("src/components/product/ProductSort.jsx");

  for (const value of [
    "newest",
    "price-low",
    "price-high",
    "best-rated",
    "best-selling",
    "name-asc",
    "name-desc",
  ]) {
    assert.match(sort, new RegExp(`value: ["']${value}["']`));
  }

  assert.doesNotMatch(sort, /biggest-discount/);
});

test("Buyer catalogue exposes only confirmed database-backed filters", async () => {
  const filterUtils = await read("src/utils/productFilterUtils.js");
  const adapter = await read("src/services/adapters/productHttpAdapter.js");
  const categoryPage = await read("src/pages/buyer/CategoryPage.jsx");
  const searchPage = await read("src/pages/buyer/SearchResultsPage.jsx");

  for (const key of [
    "searchTerm",
    "brand",
    "conditions",
    "price",
    "availability",
  ]) {
    assert.match(filterUtils, new RegExp(`key: ["']${key}["']`));
  }

  assert.match(adapter, /brand:\s*options\.brand\s*\?\?\s*filters\.brand/);
  assert.match(adapter, /minimumPrice:/);
  assert.match(adapter, /maximumPrice:/);
  assert.match(adapter, /inStockOnly:/);
  assert.match(categoryPage, /createPublicProductFilterOptions\(t\)/);
  assert.match(searchPage, /createPublicProductFilterOptions\(t\)/);
  assert.doesNotMatch(
    filterUtils,
    /discountPercent|sellerRating|storageCapacities|rams|colors|sizes/
  );
});
