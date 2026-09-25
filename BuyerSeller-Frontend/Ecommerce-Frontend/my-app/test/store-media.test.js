import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  STORE_MEDIA_PLACEMENTS,
  STORE_MEDIA_PLATFORMS,
  createStoreVideoPreview,
  detectStoreVideoPlatform,
} from "../src/services/storeMediaService.js";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("Store Media detects supported YouTube and TikTok share URLs", () => {
  assert.equal(
    detectStoreVideoPlatform("https://youtu.be/dQw4w9WgXcQ"),
    STORE_MEDIA_PLATFORMS.YOUTUBE
  );
  assert.equal(
    detectStoreVideoPlatform("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    STORE_MEDIA_PLATFORMS.YOUTUBE
  );
  assert.equal(
    detectStoreVideoPlatform("https://www.tiktok.com/@shop/video/123456789"),
    STORE_MEDIA_PLATFORMS.TIKTOK
  );
  assert.equal(detectStoreVideoPlatform("https://example.com/video"), null);
});

test("YouTube preview uses a provider thumbnail and TikTok uses the Store fallback", () => {
  assert.match(
    createStoreVideoPreview("https://youtu.be/dQw4w9WgXcQ").thumbnailUrl,
    /i\.ytimg\.com\/vi\/dQw4w9WgXcQ\/hqdefault\.jpg/
  );

  assert.equal(
    createStoreVideoPreview(
      "https://www.tiktok.com/@shop/video/123456789",
      "https://cdn.example.com/store-banner.jpg"
    ).thumbnailUrl,
    "https://cdn.example.com/store-banner.jpg"
  );
});

test("Store Media keeps the two requested placements explicit", () => {
  assert.deepEqual(STORE_MEDIA_PLACEMENTS, {
    HOME_STORY: "HOME_STORY",
    STORE_SHOWCASE: "STORE_SHOWCASE",
  });
});

test("Store Media UI uses backend routes and no browser business database", async () => {
  const service = await read("src/services/storeMediaService.js");
  const sellerPanel = await read("src/components/seller/SellerStoreMediaPanel.jsx");

  assert.match(service, /\/api\/stores\/stories/);
  assert.match(service, /\/api\/stores\/\$\{encodeURIComponent\(storeId\)\}\/showcase/);
  assert.match(service, /\/api\/seller\/store\/media/);
  assert.doesNotMatch(service, /localStorage/);
  assert.match(sellerPanel, /activeHomeCount\/2|\{activeHomeCount\}\/2/);
});
