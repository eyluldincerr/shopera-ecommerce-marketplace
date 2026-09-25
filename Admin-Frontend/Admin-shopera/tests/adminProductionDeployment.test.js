import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Admin keeps local Vite proxy while production API origin is configurable", async () => {
  const [client, env, vite] = await Promise.all([
    source("../src/api/apiClient.js"),
    source("../.env.development"),
    source("../vite.config.js"),
  ]);

  assert.match(client, /VITE_API_BASE_URL/);
  assert.match(client, /const requestBase = API_BASE_URL/);
  assert.doesNotMatch(env, /^VITE_API_BASE_URL=/m);
  assert.match(vite, /target:\s*"https:\/\/localhost:7169"/);
});

test("Admin Vercel deployment supports direct refresh of React Router routes", async () => {
  const config = JSON.parse(await source("../vercel.json"));
  assert.deepEqual(config.rewrites, [
    { source: "/(.*)", destination: "/index.html" },
  ]);
});
