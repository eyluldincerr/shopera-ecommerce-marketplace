import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadStoreStories } from "../src/services/storeStoryService.js";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("Store Stories returns only the real backend response", async () => {
  const backendStories = [
    {
      storeMediaId: 900,
      storeId: 901,
      storeName: "Backend Store",
      placement: "HOME_STORY",
      platform: "YOUTUBE",
    },
  ];

  const stories = await loadStoreStories({
    requestStories: async () => backendStories,
  });

  assert.strictEqual(stories, backendStories);
});

test("Store Stories never falls back to demo data", async () => {
  const expectedError = Object.assign(new Error("Network request failed."), {
    code: "NETWORK_ERROR",
    isNetworkError: true,
  });

  await assert.rejects(
    loadStoreStories({
      requestStories: async () => {
        throw expectedError;
      },
    }),
    (error) => error === expectedError
  );
});

test("malformed Store Stories responses fail safely", async () => {
  await assert.rejects(
    loadStoreStories({
      requestStories: async () => ({ stories: "invalid" }),
    }),
    (error) => error.code === "STORE_STORIES_RESPONSE_INVALID"
  );
});

test("Store Stories runtime is backend-authoritative and has no demo/localStorage business database", async () => {
  const component = await read("src/components/home/StoreStories.jsx");
  const storyService = await read("src/services/storeStoryService.js");
  const mediaService = await read("src/services/storeMediaService.js");

  assert.doesNotMatch(component, /storeStoriesData/);
  assert.doesNotMatch(storyService, /getDemoStoreStories|DEMO_FEATURES/);
  assert.doesNotMatch(mediaService, /localStorage/);
  assert.match(mediaService, /\/api\/stores\/stories/);
  assert.match(mediaService, /\/api\/seller\/store\/media/);
});
