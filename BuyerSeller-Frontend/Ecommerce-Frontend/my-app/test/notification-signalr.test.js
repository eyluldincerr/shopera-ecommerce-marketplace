import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readSource = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

test("notifications connect to the authenticated SignalR hub with reconnect and REST fallback", () => {
  const realtimeService = readSource(
    "src/services/notificationRealtimeService.js"
  );
  const context = readSource("src/context/NotificationContext.jsx");
  const viteConfig = readSource("vite.config.js");
  const packageJson = JSON.parse(readSource("package.json"));

  assert.equal(packageJson.dependencies["@microsoft/signalr"], "10.0.0");
  assert.match(realtimeService, /accessTokenFactory/);
  assert.match(realtimeService, /withAutomaticReconnect/);
  assert.match(realtimeService, /ReceiveNotification/);
  assert.match(realtimeService, /NotificationRead/);
  assert.match(realtimeService, /AllNotificationsRead/);
  assert.match(context, /refreshNotifications\(\{ silent: true \}\)/);
  assert.match(context, /REFRESH_INTERVAL_MS = 30000/);
  assert.match(viteConfig, /['"]\/hubs['"]/);
  assert.match(viteConfig, /ws:\s*true/);
});

test("Buyer and Seller notification pages react to live revisions", () => {
  const buyerPage = readSource("src/pages/buyer/NotificationsPage.jsx");
  const sellerPage = readSource("src/pages/seller/SellerNotificationsPage.jsx");

  assert.match(buyerPage, /realtimeRevision/);
  assert.match(sellerPage, /realtimeRevision/);
  assert.doesNotMatch(
    readSource("src/services/notificationRealtimeService.js"),
    /localStorage\.setItem/
  );
});
