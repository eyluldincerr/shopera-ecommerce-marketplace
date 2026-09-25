import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Buyer Cart and Product purchase surfaces use locale keys instead of hard-coded English", async () => {
  const files = await Promise.all([
    read("src/pages/buyer/CartPage.jsx"),
    read("src/components/cart/CartItem.jsx"),
    read("src/components/product/ProductPurchasePanel.jsx"),
    read("src/components/product/ProductCard.jsx"),
    read("src/pages/buyer/ProductDetailPage.jsx"),
  ]);
  const source = files.join("\n");

  for (const phrase of [
    ">Your Cart<",
    ">Your cart is empty<",
    ">Shop Now<",
    ">Quantity<",
    '"Buyer only"',
    '"Please sign in or create an account to add products to your cart."',
    ">Product not found<",
    ">Back to Home<",
  ]) {
    assert.equal(source.includes(phrase), false, `unexpected hard-coded Buyer phrase: ${phrase}`);
  }
});

test("Product availability exposes translation keys and unsupported Q&A placeholder is removed", async () => {
  const [variantService, productTabs, enRaw, trRaw] = await Promise.all([
    read("src/services/productVariantService.js"),
    read("src/components/product/ProductTabs.jsx"),
    read("src/locales/en.json"),
    read("src/locales/tr.json"),
  ]);

  assert.match(variantService, /buyer\.product\.availability\.outOfStock/);
  assert.match(variantService, /buyer\.product\.availability\.lowStock/);
  assert.equal(productTabs.includes('id: "qa"'), false);

  const en = JSON.parse(enRaw);
  const tr = JSON.parse(trRaw);
  assert.deepEqual(Object.keys(en.cart.page).sort(), Object.keys(tr.cart.page).sort());
  assert.deepEqual(
    Object.keys(en.buyer.product.availability).sort(),
    Object.keys(tr.buyer.product.availability).sort()
  );
});
