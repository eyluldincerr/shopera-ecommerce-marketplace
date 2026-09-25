import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Top Rated discovery requires real 4+ ratings and New Arrivals is recent-only", async () => {
  const [homeData, heroSlides, categoryService, productService, adapter, searchPage] =
    await Promise.all([
      read("src/data/homeData.js"),
      read("src/data/heroSlides.js"),
      read("src/services/categoryService.js"),
      read("src/services/productService.js"),
      read("src/services/adapters/productHttpAdapter.js"),
      read("src/pages/buyer/SearchResultsPage.jsx"),
    ]);

  for (const source of [homeData, heroSlides, categoryService, productService]) {
    assert.match(source, /sort=best-rated&minRating=4/);
    assert.match(source, /sort=newest&newArrivals=1/);
  }

  assert.match(productService, /minimumRating:\s*4/);
  assert.match(productService, /newArrivalsOnly:\s*true/);
  assert.match(adapter, /minimumRating:\s*options\.minimumRating/);
  assert.match(adapter, /newArrivalsOnly:\s*options\.newArrivalsOnly/);
  assert.match(searchPage, /params\.get\("minRating"\)/);
  assert.match(searchPage, /params\.get\("newArrivals"\)/);
  assert.match(searchPage, /minimumRating:\s*routeState\.minimumRating/);
  assert.match(searchPage, /newArrivalsOnly:\s*routeState\.newArrivalsOnly/);
});
