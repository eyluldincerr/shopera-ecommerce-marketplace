import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("catalogue cards use compact quick actions and no Choose Options CTA", async () => {
  const [cardSource, cardCss] = await Promise.all([
    readFile(new URL("../src/components/product/ProductCard.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/product/productCard.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(cardSource, /cart\.chooseOptions/);
  assert.doesNotMatch(cardSource, /className="product-card__button"/);
  assert.match(cardSource, /product-card__quick-add/);
  assert.match(cardSource, /product-card__open/);
  assert.match(cardSource, /aria-label=\{t\("cart\.viewProduct"\)\}/);
  assert.match(cardCss, /\.product-card__footer/);
  assert.match(cardCss, /\.product-card__quick-add/);
  assert.match(cardCss, /\.product-card::before/);
});
