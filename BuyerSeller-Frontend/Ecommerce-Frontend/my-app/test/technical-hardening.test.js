import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("route pages are lazy-loaded behind one accessible Suspense fallback", async () => {
  const source = await read("src/routes/AppRoutes.jsx");

  assert.match(source, /import \{ lazy, Suspense \} from "react";/);
  assert.match(source, /<Suspense fallback=\{<RouteLoadingFallback \/>\}>/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /t\("common\.loading"\)/);

  assert.doesNotMatch(source, /import\s+\w+Page\s+from\s+"\.\.\/pages\//);

  const lazyPageImports = source.match(
    /const\s+\w+Page\s*=\s*lazy\(\(\)\s*=>\s*import\("\.\.\/pages\//g
  );
  assert.ok((lazyPageImports?.length || 0) >= 20);
});

test("production stale-chunk recovery reloads at most once per short window", async () => {
  const source = await read("src/main.jsx");

  assert.match(source, /vite:preloadError/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.match(source, /shopera:last-preload-reload/);
  assert.match(source, /10_000/);
});

test("Seller Analytics no longer keeps the unused translation function in monthly chart", async () => {
  const source = await read("src/pages/seller/SellerAnalyticsPage.jsx");
  const monthlyStart = source.indexOf("function MonthlyRevenueChart");
  const monthlyEnd = source.indexOf("function", monthlyStart + 10);
  const monthlySource = source.slice(
    monthlyStart,
    monthlyEnd > monthlyStart ? monthlyEnd : undefined
  );

  assert.match(monthlySource, /const \{ i18n \} = useTranslation\(\);/);
  assert.doesNotMatch(monthlySource, /const \{ t, i18n \}/);
});
