import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { PRODUCT_ENDPOINTS } from "../src/config/apiEndpoints.js";
import { getTopBrands } from "../src/services/homeService.js";

const root = process.cwd();
const read = (relativePath) =>
  readFile(path.join(root, relativePath), "utf8");

test("Top Brands uses the real public backend endpoint and routes brands into supported search", async () => {
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    assert.equal(String(url), "/api/products/brands?limit=20");
    return new Response(
      JSON.stringify([
        { brand: "Acme", visibleProductCount: 4 },
        { Brand: "Nova", VisibleProductCount: 2 },
      ]),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  };

  try {
    assert.equal(PRODUCT_ENDPOINTS.brands, "/api/products/brands");
    assert.deepEqual(await getTopBrands(), [
      {
        id: "Acme",
        name: "Acme",
        mark: "Acme",
        visibleProductCount: 4,
        path: "/search?brand=Acme",
      },
      {
        id: "Nova",
        name: "Nova",
        mark: "Nova",
        visibleProductCount: 2,
        path: "/search?brand=Nova",
      },
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("active Buyer home discovery no longer links to unsupported collections", async () => {
  const files = await Promise.all([
    read("src/data/homeData.js"),
    read("src/data/heroSlides.js"),
    read("src/services/categoryService.js"),
    read("src/components/home/TopBrandsOffers.jsx"),
    read("src/components/product/RelatedProducts.jsx"),
  ]);

  for (const source of files) {
    assert.doesNotMatch(source, /\/collections\//);
  }

  assert.match(files[0], /\/search\?sort=newest/);
  assert.match(files[0], /\/search\?sort=best-rated/);
  assert.match(files[0], /\/search\?inStock=1/);
});

test("Search Results consumes supported route query filters for brand, stock, and sorting", async () => {
  const searchPage = await read("src/pages/buyer/SearchResultsPage.jsx");

  assert.match(searchPage, /params\.get\("brand"\)/);
  assert.match(searchPage, /params\.get\("inStock"\)/);
  assert.match(searchPage, /SEARCH_SORT_ALIASES/);
  assert.match(searchPage, /rating_desc:\s*"best-rated"/);
  assert.match(searchPage, /best_selling:\s*"best-selling"/);
  assert.match(searchPage, /brandProducts/);
});

test("related Product navigation stays on the real category/search catalogue", async () => {
  const related = await read("src/components/product/RelatedProducts.jsx");
  const detail = await read("src/pages/buyer/ProductDetailPage.jsx");

  assert.match(related, /`\/categories\/\$\{encodeURIComponent/);
  assert.match(related, /:\s*"\/search"/);
  assert.match(detail, /categoryId=\{product\.categoryId\}/);
});


test("Product detail side information removes unsupported promotional claims", async () => {
  const detailData = await read("src/data/productDetailData.js");

  assert.doesNotMatch(detailData, /10\.000\+|Secure Payments|May 18|30-Day Returns|orders over \$50/i);
  assert.match(detailData, /deliveryInfo\.tracking/);
  assert.match(detailData, /deliveryInfo\.deliveredReview/);
});
