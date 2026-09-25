import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  HOME_FEED_KEYS,
  HOME_SECTION_RENDERERS,
  createExcludedProductFeedLoader,
  dedupeHomePreviewSections,
  getHomeSectionFeedLoader,
} from "../src/services/productService.js";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("Buyer homepage exposes real preview rails plus an infinite discovery feed", async () => {
  const [productService, homePage] = await Promise.all([
    read("src/services/productService.js"),
    read("src/pages/buyer/HomePage.jsx"),
  ]);

  assert.equal(HOME_SECTION_RENDERERS.PREVIEW, "product-preview");
  assert.equal(HOME_SECTION_RENDERERS.FEED, "product-feed");
  assert.equal(HOME_FEED_KEYS.DISCOVER, "discover");
  assert.equal(typeof getHomeSectionFeedLoader(HOME_FEED_KEYS.DISCOVER), "function");
  assert.equal(getHomeSectionFeedLoader("unsupported-feed"), null);

  for (const sectionId of [
    "top-rated-products",
    "new-arrivals-products",
    "best-selling-products",
    "ready-to-buy-products",
    "discover-products",
  ]) {
    assert.match(productService, new RegExp(sectionId));
  }

  assert.match(productService, /sort:\s*["']rating_desc["']/);
  assert.match(productService, /sort:\s*["']best_selling["']/);
  assert.match(productService, /inStockOnly:\s*true/);
  assert.match(homePage, /<InfiniteProductGrid[\s\S]*autoLoad[\s\S]*pageSize=\{20\}/);
});

test("Home discovery uses horizontal carousel controls and the visual category rail without replacing catalogue paging", async () => {
  const [productSection, brands, categoryRail, homePage, brandStyles, infiniteGrid] = await Promise.all([
    read("src/components/product/ProductSection.jsx"),
    read("src/components/home/TopBrandsOffers.jsx"),
    read("src/components/home/HomeCategoryRail.jsx"),
    read("src/pages/buyer/HomePage.jsx"),
    read("src/styles/home/topBrandsOffers.css"),
    read("src/components/product/InfiniteProductGrid.jsx"),
  ]);

  assert.match(productSection, /useHorizontalRail/);
  assert.match(productSection, /product-section__edge-arrow--next/);
  assert.match(brands, /top-brands-offers__rail-arrow--next/);
  assert.match(homePage, /<HomeCategoryRail categories=\{homeData\.categories\}/);
  assert.match(categoryRail, /useHorizontalRail/);
  assert.match(categoryRail, /category\.imageUrl/);
  assert.doesNotMatch(categoryRail, /getCategoryVisual/);
  assert.match(brandStyles, /grid-auto-columns:\s*152px/);
  assert.match(infiniteGrid, /IntersectionObserver/);
  assert.match(infiniteGrid, /rootMargin:\s*["']700px 0px["']/);
  assert.match(infiniteGrid, /loadPage\(page \+ 1\)/);
});

test("new homepage discovery copy exists in both supported locales", async () => {
  const [english, turkish] = await Promise.all([
    read("src/locales/en.json").then(JSON.parse),
    read("src/locales/tr.json").then(JSON.parse),
  ]);

  for (const locale of [english, turkish]) {
    for (const key of [
      "topRated",
      "newArrivals",
      "bestSellers",
      "inStock",
      "discover",
    ]) {
      assert.ok(locale.buyer.home.productSections[key].title);
      assert.ok(locale.buyer.home.productSections[key].subtitle);
    }

    assert.ok(locale.buyer.home.discovery.categoriesTitle);
    assert.ok(locale.buyer.home.discovery.categoriesSubtitle);
    assert.ok(locale.buyer.home.discovery.previous);
    assert.ok(locale.buyer.home.discovery.next);
    assert.ok(locale.buyer.catalog.loadingMore);
    assert.ok(locale.buyer.catalog.reachedEnd);
  }
});


test("Home preview sections do not repeat the same Product across rails", () => {
  const sections = dedupeHomePreviewSections([
    {
      id: "top-rated-products",
      renderer: HOME_SECTION_RENDERERS.PREVIEW,
      products: [{ productId: 1 }, { productId: 2 }],
    },
    {
      id: "new-arrivals-products",
      renderer: HOME_SECTION_RENDERERS.PREVIEW,
      products: [{ productId: 2 }, { productId: 3 }],
    },
    {
      id: "best-selling-products",
      renderer: HOME_SECTION_RENDERERS.PREVIEW,
      products: [{ productId: 1 }],
    },
  ]);

  assert.deepEqual(
    sections.map((section) => section.products.map((product) => product.productId)),
    [[1, 2], [3], []]
  );
});

test("Discover feed skips Products already featured above and advances empty backend pages", async () => {
  const requestedPages = [];
  const baseLoader = async ({ page, pageSize }) => {
    requestedPages.push(page);

    if (page === 1) {
      return {
        items: [{ productId: 1 }, { productId: 2 }],
        page: 1,
        pageSize,
        hasMore: true,
      };
    }

    return {
      items: [{ productId: 3 }, { productId: 4 }],
      page: 2,
      pageSize,
      hasMore: false,
    };
  };

  const loader = createExcludedProductFeedLoader(baseLoader, [1, 2]);
  const response = await loader({ page: 1, pageSize: 20 });

  assert.deepEqual(requestedPages, [1, 2]);
  assert.deepEqual(response.items.map((product) => product.productId), [3, 4]);
  assert.equal(response.page, 2);
  assert.equal(response.hasMore, false);
});

test("Home hides an empty de-duplicated Discover feed instead of showing another repeated block", async () => {
  const homePage = await read("src/pages/buyer/HomePage.jsx");
  const sectionStyles = await read("src/styles/product/productSectionPreview.css");

  assert.match(homePage, /featuredProductIds/);
  assert.match(homePage, /visibility === "empty"/);
  assert.match(homePage, /createExcludedProductFeedLoader/);
  assert.match(sectionStyles, /repeat\(5, minmax\(0, 1fr\)\)/);
});
