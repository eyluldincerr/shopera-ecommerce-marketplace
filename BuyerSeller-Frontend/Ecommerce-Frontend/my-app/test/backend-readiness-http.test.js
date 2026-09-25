import test from "node:test";
import assert from "node:assert/strict";

const {
  default: http,
  configureHttpClientSession,
  HttpClientError,
  shouldInvalidateSessionOnUnauthorized,
} = await import("../src/services/axiosClient.js");

test("401 always invalidates a JWT session", () => {
  assert.equal(shouldInvalidateSessionOnUnauthorized({ DEV: true }), true);
  assert.equal(shouldInvalidateSessionOnUnauthorized({ DEV: false }), true);
  assert.equal(shouldInvalidateSessionOnUnauthorized({}), true);
});

test("HTTP client sends verbs, query, JSON, token, and AbortSignal", async () => {
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  configureHttpClientSession({ getAccessToken: () => "access-token" });
  const controller = new AbortController();
  await http.patch("/products", { name: "New" }, {
    params: { page: 2, tag: ["a", "b"] },
    signal: controller.signal,
  });

  assert.equal(captured.options.method, "PATCH");
  assert.match(captured.url, /page=2/);
  assert.match(captured.url, /tag=a/);
  assert.equal(captured.options.headers.get("Authorization"), "Bearer access-token");
  assert.equal(captured.options.headers.has("X-Seller-User-Id"), false);
  assert.equal(captured.options.headers.has("X-Buyer-User-Id"), false);
  assert.equal(captured.options.headers.has("X-Admin-User-Id"), false);
  assert.equal(captured.options.signal, controller.signal);
  assert.deepEqual(JSON.parse(captured.options.body), { name: "New" });
});

test("HTTP errors and network failures are standardized", async () => {
  for (const status of [400, 401, 403, 404, 409, 422]) {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ message: "Invalid", errors: { Email: ["Required"] } }),
        { status, headers: { "content-type": "application/json" } }
      );
    await assert.rejects(http.get("/bad"), (error) => {
      assert.ok(error instanceof HttpClientError);
      assert.equal(error.status, status);
      assert.deepEqual(error.validationErrors, { Email: ["Required"] });
      return true;
    });
  }

  globalThis.fetch = async () => {
    throw new TypeError("offline");
  };
  await assert.rejects(
    http.delete("/offline"),
    (error) => error.code === "NETWORK_ERROR" && error.isNetworkError
  );
});

test("HTTP client parses RFC 7807 application/problem+json conflicts", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        title: "Request conflict",
        status: 409,
        detail: "The requested quantity is no longer available.",
        code: "INSUFFICIENT_STOCK",
        variantId: 123,
        requestedQuantity: 2,
        availableStock: 1,
      }),
      {
        status: 409,
        headers: { "content-type": "application/problem+json; charset=utf-8" },
      }
    );

  await assert.rejects(http.post("/api/cart/items", { variantId: 123, quantity: 1 }), (error) => {
    assert.ok(error instanceof HttpClientError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "INSUFFICIENT_STOCK");
    assert.equal(error.data.availableStock, 1);
    assert.equal(error.data.requestedQuantity, 2);
    return true;
  });
});

test("401 refresh hook retries once without inventing refresh behavior", async () => {
  let calls = 0;
  let refreshes = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? new Response(JSON.stringify({ message: "Expired" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      : new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
  };
  configureHttpClientSession({
    getAccessToken: () => "token",
    refreshAccessToken: async () => {
      refreshes += 1;
      return true;
    },
  });

  assert.deepEqual((await http.get("/retry")).data, { ok: true });
  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
});
