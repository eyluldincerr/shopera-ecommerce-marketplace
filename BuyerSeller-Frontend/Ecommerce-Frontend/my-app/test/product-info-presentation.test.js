import test from "node:test";
import assert from "node:assert/strict";

import {
  formatProductInfoItem,
  toProductInfoText,
} from "../src/utils/productInfoText.js";

test("Product information renders label and value without object coercion", () => {
  assert.equal(
    formatProductInfoItem({ label: "Material", value: "Steel" }),
    "Material: Steel"
  );
  assert.equal(
    formatProductInfoItem({ label: "", value: "Steel" }),
    "Steel"
  );
  assert.equal(formatProductInfoItem("Steel"), "Steel");
  assert.equal(formatProductInfoItem({ unexpected: true }), "");
  assert.notEqual(formatProductInfoItem({ unexpected: true }), "[object Object]");
});

test("Product information converts only safe display values", () => {
  assert.equal(toProductInfoText(0), "0");
  assert.equal(toProductInfoText(["USB cable", "Manual"]), "USB cable, Manual");
  assert.equal(toProductInfoText({ value: "hidden" }), "");
});
