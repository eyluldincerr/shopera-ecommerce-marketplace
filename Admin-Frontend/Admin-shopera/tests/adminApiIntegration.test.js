import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
globalThis.window = {
  sessionStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
};

const auth = await import("../src/auth/authSession.js");
const { api, ApiError } = await import("../src/api/apiClient.js");
const { login, logout } = await import("../src/api/authService.js");
const { getProtectedDestination, getPostLoginDestination } = await import("../src/auth/authRouting.js");
const { getAdminPage } = await import("../src/api/adminPageService.js");
const { getAdminSalesAnalytics, getSalesDateRange } = await import("../src/api/adminSalesAnalyticsService.js");
const { createAdminCategoryPayload, createAdminCategoryUpdatePayload } = await import("../src/api/adminCategoryPayload.js");

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json" },
});

test.beforeEach(() => {
  values.clear();
  auth.clearAuthenticatedSession();
});

test("API client attaches bearer token, parses JSON and handles 204", async () => {
  auth.setAuthenticatedSession({ token: "jwt-token", userId: 1, email: "a@b.test", role: "ADMIN" });
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return requests.length === 1 ? jsonResponse({ ok: true }) : new Response(null, { status: 204 });
  };
  assert.deepEqual(await api.get("/api/Admin/users"), { ok: true });
  assert.equal(await api.put("/api/Admin/users/2/status", { status: "ACTIVE" }), null);
  assert.equal(requests[0].options.headers.Authorization, "Bearer jwt-token");
});

test("ProblemDetails is preserved; 401 clears session and 403 does not", async () => {
  auth.setAuthenticatedSession({ token: "jwt", userId: 1, email: "a@b.test", role: "ADMIN" });
  globalThis.fetch = async () => jsonResponse({
    title: "Conflict",
    detail: "Referenced category",
    code: "CATEGORY_IN_USE",
    traceId: "trace-123",
  }, 409);
  await assert.rejects(api.delete("/api/Admin/categories/1"),
    (error) => error instanceof ApiError &&
      error.status === 409 &&
      error.detail === "Referenced category" &&
      error.code === "CATEGORY_IN_USE" &&
      error.traceId === "trace-123");

  globalThis.fetch = async () => jsonResponse({ title: "Unauthorized" }, 401);
  await assert.rejects(api.get("/api/Admin/users"), (error) => error.status === 401);
  assert.equal(auth.getAccessToken(), null);

  auth.setAuthenticatedSession({ token: "jwt2", userId: 1, email: "a@b.test", role: "ADMIN" });
  globalThis.fetch = async () => jsonResponse({ title: "Forbidden" }, 403);
  await assert.rejects(api.get("/api/Admin/users"), (error) => error.status === 403);
  assert.equal(auth.getAccessToken(), "jwt2");
});

test("backend login creates, restores and clears the minimal session", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { email: "admin@test", password: "secret" });
    return jsonResponse({ token: "jwt", userId: 7, email: "admin@test", role: "ADMIN" });
  };
  const session = await login({ email: "admin@test", password: "secret" });
  assert.deepEqual({ token: session.token, userId: session.userId, role: session.role },
    { token: "jwt", userId: 7, role: "ADMIN" });
  assert.equal(auth.restoreAuthenticatedSession().userId, 7);
  logout();
  assert.equal(auth.getAuthenticatedUser(), null);
});

test("non-admin backend login is rejected without persisting an Admin frontend session", async () => {
  globalThis.fetch = async () => jsonResponse({
    token: "buyer-jwt",
    userId: 22,
    email: "buyer@test",
    role: "BUYER",
  });

  await assert.rejects(
    login({ email: "buyer@test", password: "secret" }),
    (error) => error instanceof ApiError &&
      error.status === 403 &&
      error.code === "ADMIN_ROLE_REQUIRED",
  );

  assert.equal(auth.getAuthenticatedUser(), null);
  assert.equal(values.get("shopera.auth.session.v1"), undefined);
});

test("status, approval and notification requests use authoritative routes and payloads", async () => {
  auth.setAuthenticatedSession({ token: "jwt", userId: 1, email: "a@b.test", role: "ADMIN" });
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (options.method === "PUT") return new Response(null, { status: 204 });
    return jsonResponse({ userId: 2, role: "BUYER", accountStatus: "ACTIVE", fullName: "Buyer", email: "b@test", registrationDate: "2026-01-01" });
  };
  await api.put("/api/Admin/users/2/status", { status: "SUSPENDED" });
  assert.deepEqual(JSON.parse(requests[0].options.body), { status: "SUSPENDED" });
  assert.equal(JSON.parse(requests[0].options.body).adminUserId, undefined);

  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (options.method === "PUT") return jsonResponse({ storeId: 9 });
    return jsonResponse({ storeId: 9 });
  };
  await api.put("/api/Admin/stores/9/approval", { decision: "APPROVED", decisionNote: "Verified" });
  const approval = requests.find((item) => item.url.endsWith("/api/Admin/stores/9/approval"));
  assert.deepEqual(JSON.parse(approval.options.body), { decision: "APPROVED", decisionNote: "Verified" });
  await api.put("/api/Admin/notifications/4/read");
  assert.equal(requests.at(-1).url.includes("recipientUserId"), false);
  await api.patch("/api/Admin/categories/2", { parentCategoryId: null });
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), { parentCategoryId: null });
});

test("category payloads exclude browser-supplied Admin identity", () => {
  const createPayload = createAdminCategoryPayload({
    categoryName: "Phones", description: "Mobile devices", parentCategoryId: null,
    managingAdminUserId: 99, adminUserId: 99, actingAdminUserId: 99,
  });
  const updatePayload = createAdminCategoryUpdatePayload({
    categoryName: "Smartphones", description: "Updated", parentCategoryId: null,
    managingAdminUserId: 99, adminUserId: 99, actingAdminUserId: 99,
  });

  assert.deepEqual(createPayload, {
    categoryName: "Phones", description: "Mobile devices", parentCategoryId: null,
  });
  assert.deepEqual(updatePayload, {
    categoryName: "Smartphones", description: "Updated", parentCategoryId: null,
  });
  assert.equal(JSON.stringify([createPayload, updatePayload]).includes("99"), false);
});

test("Admin routing, restoration and logout enforce the real session", () => {
  assert.equal(getProtectedDestination(null, ["ADMIN"]), "/login");
  assert.equal(getProtectedDestination({ role: "BUYER", accountStatus: "ACTIVE" }, ["ADMIN"]), "/");
  assert.equal(getProtectedDestination({ role: "ADMIN", accountStatus: "ACTIVE" }, ["ADMIN"]), null);
  assert.equal(getPostLoginDestination({ role: "ADMIN" }), "/admin");
  assert.equal(getPostLoginDestination({ role: "SELLER" }), null);
  auth.setAuthenticatedSession({ token: "jwt", userId: 8, email: "admin@test", role: "ADMIN", password: "never-store" });
  assert.equal(JSON.parse(values.get("shopera.auth.session.v1")).password, undefined);
  assert.equal(auth.restoreAuthenticatedSession().userId, 8);
  logout();
  assert.equal(getProtectedDestination(auth.getAuthenticatedUser(), ["ADMIN"]), "/login");
});

test("product and order page requests use real page parameters and filters", async () => {
  auth.setAuthenticatedSession({ token: "jwt", userId: 1, email: "a@b.test", role: "ADMIN" });
  const urls = [];
  globalThis.fetch = async (url) => { urls.push(new URL(url)); return jsonResponse({ items: [], totalCount: 51, page: 2, pageSize: 25 }); };
  const products = await getAdminPage("products", { page: 2, pageSize: 25, search: "phone", status: "ACTIVE" });
  await getAdminPage("orders", { page: 3, pageSize: 25, orderStatus: "PAID" });
  assert.equal(products.totalCount, 51);
  assert.equal(urls[0].searchParams.get("page"), "2");
  assert.equal(urls[0].searchParams.get("pageSize"), "25");
  assert.equal(urls[0].searchParams.get("search"), "phone");
  assert.equal(urls[0].searchParams.get("shipmentStatus"), null);
  assert.equal(urls[1].searchParams.get("page"), "3");
});

test("sales ranges are calendar-defined and analytics refetch uses currency/from/to", async () => {
  auth.setAuthenticatedSession({ token: "jwt", userId: 1, email: "a@b.test", role: "ADMIN" });
  assert.deepEqual(getSalesDateRange("week", new Date("2026-08-09T12:00:00Z")), { from: "2026-08-03", to: "2026-08-09" });
  assert.deepEqual(getSalesDateRange("month", new Date("2026-08-09T12:00:00Z")), { from: "2026-08-01", to: "2026-08-09" });
  assert.deepEqual(getSalesDateRange("year", new Date("2026-08-09T12:00:00Z")), { from: "2026-01-01", to: "2026-08-09" });
  let requested;
  globalThis.fetch = async (url) => { requested = new URL(url); return jsonResponse({ currencyCode: "EUR", points: [] }); };
  await getAdminSalesAnalytics({ currencyCode: "EUR", from: "2026-08-01", to: "2026-08-09" });
  assert.equal(requested.searchParams.get("currencyCode"), "EUR");
  assert.equal(requested.searchParams.get("from"), "2026-08-01");
  assert.equal(requested.searchParams.get("to"), "2026-08-09");
});
