import assert from "node:assert/strict";
import test from "node:test";

import axiosClient, {
  configureHttpClientSession,
} from "../src/services/axiosClient.js";

const jsonResponse = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

test("shared buyer HTTP client does not leak bearer token to an untrusted absolute URL", async () => {
  const originalFetch = globalThis.fetch;
  let receivedAuthorization = null;

  configureHttpClientSession({
    getAccessToken: () => "secret-shopera-token",
  });

  globalThis.fetch = async (_url, options = {}) => {
    receivedAuthorization = new Headers(options.headers).get("Authorization");
    return jsonResponse();
  };

  try {
    await axiosClient.get("https://example.invalid/collect");
    assert.equal(receivedAuthorization, null);
  } finally {
    globalThis.fetch = originalFetch;
    configureHttpClientSession();
  }
});

test("shared buyer HTTP client still sends bearer token to Shopera relative API routes", async () => {
  const originalFetch = globalThis.fetch;
  let receivedAuthorization = null;

  configureHttpClientSession({
    getAccessToken: () => "secret-shopera-token",
  });

  globalThis.fetch = async (_url, options = {}) => {
    receivedAuthorization = new Headers(options.headers).get("Authorization");
    return jsonResponse();
  };

  try {
    await axiosClient.get("/api/auth/me");
    assert.equal(receivedAuthorization, "Bearer secret-shopera-token");
  } finally {
    globalThis.fetch = originalFetch;
    configureHttpClientSession();
  }
});
