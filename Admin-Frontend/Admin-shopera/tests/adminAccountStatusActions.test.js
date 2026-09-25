import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("inactive and suspended accounts expose reactivation and route it to the ACTIVE backend action", () => {
  const modal = read("src/components/admin/UserDetailsModal.jsx");
  const page = read("src/pages/admin/ManageUsersPage.jsx");

  assert.match(modal, /normalizedAccountStatus === "INACTIVE"/);
  assert.match(modal, /normalizedAccountStatus === "SUSPENDED"/);
  assert.match(modal, /Reactivate Account/);
  assert.match(modal, /onRequestAction\("activate", user\)/);
  assert.match(page, /confirmation\.action ===\s*"activate"/);
  assert.match(page, /await activateAdminUser\(/);
});
