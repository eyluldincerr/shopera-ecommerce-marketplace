import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { WISHLIST_ENDPOINTS } from "../src/config/apiEndpoints.js";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const sampleWishlist = () => ({
  wishlistId: 7,
  buyerUserId: 20,
  itemCount: 1,
  items: [
    {
      wishlistItemId: 15,
      productId: 100,
      variantId: 1000,
      storeId: 30,
      storeName: "Laptop Store",
      productName: "Laptop",
      sku: "SKU-1000",
      variantName: "Default",
      price: 213,
      currencyCode: "EUR",
      imageUrl: "/api/product-images/500/content",
      productStatus: "ACTIVE",
      variantStatus: "ACTIVE",
      availableStock: 5,
      isProductVisible: true,
      isAvailable: true,
    },
  ],
});

test("wishlist service uses backend endpoints and maps current product data", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push([options.method || "GET", url, options.body]);
    return jsonResponse(sampleWishlist());
  };

  const service = await import(
    `../src/services/wishlistService.js?wishlist=${Date.now()}`
  );

  const result = await service.getWishlist();
  assert.equal(result.itemCount, 1);
  assert.equal(result.items[0].productId, "100");
  assert.equal(result.items[0].variantId, "1000");
  assert.equal(result.items[0].currencyCode, "EUR");
  assert.equal(result.items[0].isAvailable, true);

  await service.addWishlistVariant(1000);
  await service.removeWishlistVariant(1000);
  await service.clearWishlistItems();

  assert.deepEqual(
    requests.map(([method, url]) => [method, url]),
    [
      ["GET", WISHLIST_ENDPOINTS.wishlist],
      ["POST", WISHLIST_ENDPOINTS.items],
      ["DELETE", WISHLIST_ENDPOINTS.item.replace(":variantId", "1000")],
      ["DELETE", WISHLIST_ENDPOINTS.items],
    ]
  );
});

test("wishlist is backend-authoritative and legacy browser storage is cleanup-only", async () => {
  const [service, context] = await Promise.all([
    readFile(new URL("../src/services/wishlistService.js", import.meta.url), "utf8"),
    readFile(new URL("../src/context/WishlistContext.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(service, /axiosClient\.get\(WISHLIST_ENDPOINTS\.wishlist\)/);
  assert.match(service, /clearLegacyWishlistStorage/);
  assert.doesNotMatch(service, /localStorage\.setItem/);
  assert.doesNotMatch(context, /localStorage|saveWishlist|getStoredWishlist/);
});


test("catalogue cards can resolve a backend-projected default variant for favourites", async () => {
  const [{ mapProductDto }, wishlistService] = await Promise.all([
    import(`../src/services/mappers/productMapper.js?card=${Date.now()}`),
    import(`../src/services/wishlistService.js?card=${Date.now()}`),
  ]);

  const product = mapProductDto({
    productId: 100,
    productName: "Laptop",
    defaultVariantId: 1000,
    minimumPrice: 12,
    variants: [],
  });

  const variant = wishlistService.resolveWishlistVariant(product);
  assert.equal(product.defaultVariantId, 1000);
  assert.equal(wishlistService.getWishlistVariantId(variant), "1000");
});
