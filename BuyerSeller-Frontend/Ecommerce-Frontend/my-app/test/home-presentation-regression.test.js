import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  HOME_QUICK_LINKS,
  getCategoryPath,
  getHomeCategories,
  getHomeQuickLinks,
} from "../src/services/categoryService.js";
import {
  getRoutePolicy,
  ROUTES,
} from "../src/routes/routePolicy.js";

const root = process.cwd();
const read = (relativePath) =>
  readFile(path.join(root, relativePath), "utf8");

test("static quick links use only supported catalogue routes and remain independent of Category results", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, "/api/categories");

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const [categories, quickLinks] = await Promise.all([
    getHomeCategories(),
    getHomeQuickLinks(),
  ]);

  assert.deepEqual(categories, []);
  assert.deepEqual(
    quickLinks.map(({ id, path }) => ({ id, path })),
    [
      { id: "new-arrivals", path: "/search?sort=newest&newArrivals=1" },
      { id: "top-rated", path: "/search?sort=best-rated&minRating=4" },
      { id: "in-stock", path: "/search?inStock=1" },
      { id: "all-products", path: "/search" },
    ]
  );
});

test("HomePage owns static adjacent buttons independently of Category results", async () => {
  const homePage = await read("src/pages/buyer/HomePage.jsx");

  assert.equal(HOME_QUICK_LINKS.length, 4);
  assert.match(homePage, /quickLinks:\s*HOME_QUICK_LINKS\.map/);
  assert.match(homePage, /Promise\.allSettled/);
  assert.match(homePage, /categoryResult\.status === "rejected"/);
  assert.match(homePage, /quickLinkResult\.status === "fulfilled"/);
  assert.doesNotMatch(homePage, /return <div className="page-loader"/);
});

test("dynamic Category links target the canonical CategoryPage route", async () => {
  const categoryPath = getCategoryPath({ categoryId: 42 });
  const categoryNav = await read("src/components/home/CategoryNav.jsx");
  const appRoutes = await read("src/routes/AppRoutes.jsx");

  assert.equal(categoryPath, "/categories/42");
  assert.equal(getRoutePolicy(categoryPath).path, ROUTES.CATEGORY);
  assert.match(appRoutes, /path=\{ROUTES\.CATEGORY\}/);
  assert.match(appRoutes, /element=\{<CategoryPage\s*\/>\}/);
  assert.match(categoryNav, /getCategoryPath\(item\)/);
  assert.doesNotMatch(
    categoryNav,
    /categoryRouteValue\s*\?\s*`?\/collections/
  );
});

test("Store Stories uses the real Store Media backend and visual story cards", async () => {
  const storeStories = await read("src/components/home/StoreStories.jsx");
  const mediaViewer = await read("src/components/store/StoreMediaViewer.jsx");
  const mediaService = await read("src/services/storeMediaService.js");

  assert.match(mediaService, /\/api\/stores\/stories/);
  assert.match(mediaService, /\/api\/seller\/store\/media/);
  assert.match(storeStories, /<h2>\{copy\.storeStories\}<\/h2>/);
  assert.match(storeStories, /store-story-card/);
  assert.match(storeStories, /store-stories__track--loading/);
  assert.match(storeStories, /<StoreMediaViewer/);
  assert.match(mediaViewer, /role="dialog"/);
  assert.match(mediaViewer, /youtube-nocookie|embedUrl/);
  assert.doesNotMatch(storeStories, /storeStoriesData/);
  assert.doesNotMatch(mediaService, /localStorage/);
});
