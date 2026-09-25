import test from "node:test";
import assert from "node:assert/strict";
import {
  parseStructuredProductInfo,
  hasMeaningfulProductInfo,
  humanizeProductInfoKey,
} from "../src/utils/productInfoFormatting.js";

test("PRODUCT_INFO JSON strings are parsed into structured objects", () => {
  const value = JSON.stringify({
    items: [
      { label: "Processor", value: "Intel Core i7" },
      { label: "Memory", value: "16GB DDR5 RAM" },
    ],
  });

  assert.deepEqual(parseStructuredProductInfo(value), {
    items: [
      { label: "Processor", value: "Intel Core i7" },
      { label: "Memory", value: "16GB DDR5 RAM" },
    ],
  });
});

test("plain text PRODUCT_INFO remains plain text and malformed JSON is not destroyed", () => {
  assert.equal(
    parseStructuredProductInfo("1-year manufacturer warranty"),
    "1-year manufacturer warranty",
  );
  assert.equal(
    parseStructuredProductInfo('{"items":['),
    '{"items":[',
  );
});

test("blank structured sections are detected and can be hidden", () => {
  const blankSpecifications = JSON.stringify({
    groups: [
      { name: "", items: [{ label: "", value: "" }] },
    ],
  });

  assert.equal(hasMeaningfulProductInfo(blankSpecifications), false);
  assert.equal(
    hasMeaningfulProductInfo(JSON.stringify({
      groups: [
        {
          name: "Display",
          items: [{ label: "Resolution", value: "2560x1600" }],
        },
      ],
    })),
    true,
  );
});

test("generic structured keys are converted to readable labels", () => {
  assert.equal(humanizeProductInfoKey("storageCapacity"), "Storage Capacity");
  assert.equal(humanizeProductInfoKey("battery_type"), "Battery Type");
});
