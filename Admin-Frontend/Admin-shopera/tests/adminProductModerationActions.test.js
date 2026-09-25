import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Admin Product oversight exposes safe status moderation rather than hard delete", () => {
  const service = read("src/api/adminProductService.js");
  const manage = read("src/pages/admin/ManageProductsPage.jsx");
  const modal = read("src/components/admin/ProductDetailsModal.jsx");

  assert.match(service, /updateAdminProductStatus/);
  assert.match(service, /\/api\/Admin\/products\/\$\{Number\(productId\)\}\/status/);
  assert.match(manage, /targetStatus: "ACTIVE"/);
  assert.match(manage, /targetStatus: "INACTIVE"/);
  assert.match(manage, /targetStatus: "DELETED"/);
  assert.match(manage, /Soft-delete Product/);
  assert.match(modal, /Deactivate Product/);
  assert.match(modal, /Soft Delete Product/);
  assert.match(modal, /Restore Product/);
  assert.doesNotMatch(service, /api\.delete\([^\n]*products/i);
});
