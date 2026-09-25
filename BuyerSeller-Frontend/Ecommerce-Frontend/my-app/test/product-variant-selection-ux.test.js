import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("product variant selection remains explicit and accessible", async () => {
  const [component, css, en, tr] = await Promise.all([
    readFile(new URL("../src/components/product/ProductInfo.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/product/productDetail.css", import.meta.url), "utf8"),
    readFile(new URL("../src/locales/en.json", import.meta.url), "utf8"),
    readFile(new URL("../src/locales/tr.json", import.meta.url), "utf8"),
  ]);

  assert.match(component, /aria-pressed=\{option\.selected\}/);
  assert.match(component, /buyer\.product\.selectedOption/);
  assert.match(component, /product-info-box__variant-check/);
  assert.match(css, /product-info-box__variant-option--active/);
  assert.match(css, /border:\s*2px solid var\(--color-primary-light\)/);
  assert.equal(JSON.parse(en).buyer.product.selectedOption, "Selected: {{value}}");
  assert.equal(JSON.parse(tr).buyer.product.selectedOption, "Seçili: {{value}}");
});

test("address postal placeholder is translated instead of showing a raw key", async () => {
  const [en, tr] = await Promise.all([
    readFile(new URL("../src/locales/en.json", import.meta.url), "utf8"),
    readFile(new URL("../src/locales/tr.json", import.meta.url), "utf8"),
  ]);

  assert.equal(JSON.parse(en).buyer.address.postalCodePlaceholder, "99450");
  assert.equal(JSON.parse(tr).buyer.address.postalCodePlaceholder, "99450");
});
