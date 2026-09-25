import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Product detail replaces generic delivery/trust cards with real Store policies", async () => {
  const page = await read("src/pages/buyer/ProductDetailPage.jsx");

  assert.match(page, /buyer\.store\.supportPolicy/);
  assert.match(page, /product\.store\?\.supportPolicy/);
  assert.match(page, /buyer\.store\.returnPolicy/);
  assert.match(page, /product\.store\?\.returnPolicy/);
  assert.doesNotMatch(page, /sideInfo\.deliveryReturns/);
  assert.doesNotMatch(page, /sideInfo\.trustedByCustomers/);
});
