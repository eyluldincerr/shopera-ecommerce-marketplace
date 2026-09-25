import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  getRoutePolicy,
  ROUTE_ACCESS,
  ROUTES,
} from "../src/routes/routePolicy.js";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("the dynamic Store route is registered as public and remains unguarded", async () => {
  const appRoutes = await read("src/routes/AppRoutes.jsx");
  const policy = getRoutePolicy("/stores/1");
  const storeRouteStart = appRoutes.indexOf("path={ROUTES.STORE}");
  const notFoundRouteStart = appRoutes.indexOf('<Route path="*"');

  assert.equal(ROUTES.STORE, "/stores/:storeId");
  assert.equal(policy?.access, ROUTE_ACCESS.PUBLIC);
  assert.match(
    appRoutes,
    /const StorePage = lazy\(\(\) => import\("\.\.\/pages\/buyer\/StorePage\.jsx"\)\);/
  );
  assert.ok(storeRouteStart >= 0);
  assert.ok(storeRouteStart < notFoundRouteStart);

  assert.match(
    appRoutes,
    /<Route\s+path=\{ROUTES\.STORE\}\s+element=\{<StorePage\s*\/>\}\s*\/>/
  );
});

test("StorePage reads Store data through the service and owns no HTTP calls", async () => {
  const [page, service, adapter, endpoints] = await Promise.all([
    read("src/pages/buyer/StorePage.jsx"),
    read("src/services/storeService.js"),
    read("src/services/adapters/storeHttpAdapter.js"),
    read("src/config/apiEndpoints.js"),
  ]);

  assert.match(page, /getPublicStore\(storeId/);
  assert.match(page, /getPublicStoreProducts\(storeId/);
  assert.doesNotMatch(page, /\bfetch\s*\(|\baxiosClient\b|\/api\/stores/);
  assert.match(service, /import storeHttpAdapter/);
  assert.match(service, /storeHttpAdapter\.getPublicStore\(storeId, options\)/);
  assert.match(
    service,
    /storeHttpAdapter\.listPublicStoreProducts\(storeId, options\)/
  );
  assert.match(adapter, /mapProductPageDto/);
  assert.match(adapter, /mapProductQueryParams\(options\)/);

  for (const endpoint of [
    "/api/stores",
    "/api/stores/:storeId",
    "/api/stores/by-slug/:storeSlug",
    "/api/stores/:storeId/products",
  ]) {
    assert.match(endpoints, new RegExp(endpoint.replace(/[/:]/g, "\\$&")));
  }
});

test("Store Products keep filters, sorting, and pagination backend-owned", async () => {
  const [page, productAdapter] = await Promise.all([
    read("src/pages/buyer/StorePage.jsx"),
    read("src/services/adapters/productHttpAdapter.js"),
  ]);

  assert.match(page, /pageSize: PAGE_SIZE/);
  assert.match(page, /search: search \|\| undefined/);
  assert.match(page, /filters,/);
  assert.match(page, /getCategories\(\{ signal: controller\.signal \}\)/);
  assert.match(page, /createPublicProductFilterOptions\(t,/);
  assert.match(page, /<ProductFilters/);
  assert.match(page, /<ProductFilterChips/);
  assert.match(page, /sort,/);
  assert.match(page, /productPage\.totalCount/);
  assert.match(page, /productPage\.totalPages/);
  assert.doesNotMatch(page, /products\.slice\(|\.sort\(/);

  for (const sort of [
    "newest",
    "price_asc",
    "price_desc",
    "rating_desc",
    "name_asc",
    "name_desc",
  ]) {
    assert.match(productAdapter, new RegExp(`${sort}:?\\s*["']${sort}["']`));
  }
});

test("StorePage has real-image fallbacks and complete public states without confidential cost", async () => {
  const [page, stylesheet] = await Promise.all([
    read("src/pages/buyer/StorePage.jsx"),
    read("src/styles/catalog/storePage.css"),
  ]);

  assert.match(page, /store-page__banner-fallback/);
  assert.match(page, /storeInitial/);
  assert.match(stylesheet, /linear-gradient/);
  assert.doesNotMatch(page, /https?:\/\//);
  assert.doesNotMatch(stylesheet, /url\(\s*["']?https?:\/\//);
  assert.doesNotMatch(page, /costPrice|CostPrice/);
  assert.match(page, /storeStatus === "loading"/);
  assert.match(page, /storeStatus === "not-found"/);
  assert.match(page, /storeStatus === "error"/);
  assert.match(page, /products\.length === 0/);
  assert.match(page, /<ProductGrid products={products}/);
  assert.match(page, /new AbortController\(\)/);
  assert.match(page, /requestId !== .*RequestId\.current/);
});
