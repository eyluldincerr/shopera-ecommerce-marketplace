import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Admin Store management exposes reversible moderation actions", () => {
  const service = read("src/api/adminStoreService.js");
  const manage = read("src/pages/admin/ManageSellersPage.jsx");
  const modal = read("src/components/admin/SellerDetailsModal.jsx");

  assert.match(service, /\/api\/Admin\/stores\/\$\{Number\(storeId\)\}\/status/);
  assert.match(service, /updateAdminStoreStatus/);

  for (const action of ["activate", "deactivate", "suspend", "close", "restore"]) {
    assert.match(manage, new RegExp(`${action}:`));
  }

  assert.match(modal, /Activate Store/);
  assert.match(modal, /Deactivate Store/);
  assert.match(modal, /Suspend Store/);
  assert.match(modal, /Close Store/);
  assert.match(modal, /Restore Store/);
  assert.match(modal, /Historical[\s\S]*products, orders/);
});
