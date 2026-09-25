import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Admin app exposes only Admin runtime routes", async () => {
  const routes = await source("../src/routes/AppRoutes.jsx");
  assert.match(routes, /path="\/admin"/);
  assert.match(routes, /path="\/login"/);
  assert.doesNotMatch(routes, /pages\/buyer|pages\/seller/);
  assert.doesNotMatch(routes, /path="\/cart"|path="\/checkout"|path="\/account|path="\/seller|path="\/products|path="\/collections/);
});

test("Admin runtime does not mount Buyer Cart context or drawer", async () => {
  const main = await source("../src/main.jsx");
  const app = await source("../src/App.jsx");
  assert.doesNotMatch(main, /CartContextProvider/);
  assert.doesNotMatch(app, /CartDrawer/);
});

test("Admin local development does not bypass Vite proxy", async () => {
  const env = await source("../.env.development");
  const vite = await source("../vite.config.js");
  assert.doesNotMatch(env, /^VITE_API_BASE_URL=/m);
  assert.match(vite, /port:\s*5174/);
  assert.match(vite, /"\/api"/);
  assert.match(vite, /"\/hubs"/);
});

test("Admin source tree does not retain Buyer/Seller storefront implementation", async () => {
  const { access } = await import("node:fs/promises");
  const legacyPaths = [
    "../src/pages/buyer",
    "../src/pages/seller",
    "../src/components/buyer",
    "../src/components/cart",
    "../src/components/home",
    "../src/components/product",
    "../src/components/seller",
    "../src/context",
    "../src/hooks",
    "../src/services",
    "../src/styles/buyer",
    "../src/styles/cart",
    "../src/styles/collection",
    "../src/styles/home",
    "../src/styles/product",
    "../src/styles/seller",
  ];

  for (const relativePath of legacyPaths) {
    await assert.rejects(access(new URL(relativePath, import.meta.url)));
  }

  const appCss = await source("../src/App.css");
  assert.doesNotMatch(
    appCss,
    /styles\/(?:buyer|cart|collection|home|layout|product|seller)\//,
  );
});
