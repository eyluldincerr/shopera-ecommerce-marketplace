import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("store media management has its own Seller route and sidebar entry", async () => {
  const [policy, routes, sidebar] = await Promise.all([
    read("src/routes/routePolicy.js"),
    read("src/routes/AppRoutes.jsx"),
    read("src/components/seller/SellerSidebar.jsx"),
  ]);

  assert.match(policy, /SELLER_STORE_MEDIA:\s*"\/seller\/store-media"/);
  assert.match(policy, /ROUTES\.SELLER_STORE_MEDIA, access: ROUTE_ACCESS\.SELLER/);
  assert.match(routes, /SellerStoreMediaPage/);
  assert.match(routes, /ROUTES\.SELLER_STORE_MEDIA/);
  assert.match(sidebar, /ROUTES\.SELLER_STORE_MEDIA/);
});

test("store media is removed from Store Profile and managed on the dedicated page", async () => {
  const [profile, mediaPage, panel] = await Promise.all([
    read("src/pages/seller/SellerStoreProfilePage.jsx"),
    read("src/pages/seller/SellerStoreMediaPage.jsx"),
    read("src/components/seller/SellerStoreMediaPanel.jsx"),
  ]);

  assert.doesNotMatch(profile, /SellerStoreMediaPanel/);
  assert.match(mediaPage, /SellerStoreMediaPanel/);
  assert.match(mediaPage, /showHeading=\{false\}/);
  assert.match(mediaPage, /canPublish=\{canPublish\}/);
  assert.match(panel, /removeSellerStoreMedia/);
  assert.match(panel, /removeConfirm/);
  assert.match(panel, /status === "error"/);
  assert.match(panel, /copy\.retry/);
});
