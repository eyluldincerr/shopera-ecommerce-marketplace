import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readSource = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

test("notification bell is an unread-only inbox and read items disappear immediately", () => {
  const context = readSource("src/context/NotificationContext.jsx");
  const panel = readSource("src/components/notifications/NotificationPanel.jsx");

  assert.match(context, /unreadOnly:\s*true/);
  assert.match(context, /filter\(\s*\(notification\) =>\s*!notification\.isRead/);
  assert.match(
    context,
    /String\(notification\.notificationId\) !== String\(notificationId\)/
  );
  assert.match(context, /notifications:\s*\[\],\s*unreadCount:\s*0/);
  assert.match(panel, /buyer\.notifications\.dropdownEmpty/);
});
