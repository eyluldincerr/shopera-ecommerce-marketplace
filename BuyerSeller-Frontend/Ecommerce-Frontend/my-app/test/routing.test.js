import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import en from "../src/locales/en.json" with { type: "json" };
import tr from "../src/locales/tr.json" with { type: "json" };
import { getNotificationDestination } from "../src/services/notificationRouteService.js";
import {
  APP_ROUTE_POLICIES,
  getAccountActionRoute,
  getExpiredSessionRoute,
  getRoleLandingRoute,
  getNotFoundAction,
  getPostLogoutRoute,
  getRouteDecision,
  getRoutePolicy,
  getSafePostLoginRoute,
  ROUTE_ACCESS,
  ROUTES,
} from "../src/routes/routePolicy.js";

const getTranslation = (translations, key) =>
  key.split(".").reduce((value, part) => value?.[part], translations);

const routeExamples = {
  [ROUTES.CATEGORY]: "/categories/mobiles",
  [ROUTES.COLLECTION]: "/collections/top-brands",
  [ROUTES.PRODUCT]: "/products/101",
  [ROUTES.STORE]: "/stores/1",
  [ROUTES.ORDER_DETAIL]: "/orders/25",
};

const getExamplePath = (route) => routeExamples[route.path] || route.path;

const identities = [
  { name: "Guest", role: "", isAuthenticated: false },
  { name: "Buyer", role: "Buyer", isAuthenticated: true },
  { name: "Seller", role: "Seller", isAuthenticated: true },
  { name: "unsupported session role", role: "Admin", isAuthenticated: true },
];

const expectedDecision = (access, identity) => {
  if (access === ROUTE_ACCESS.PUBLIC) {
    return { outcome: "render", destination: null };
  }

  if (access === ROUTE_ACCESS.GUEST_ONLY) {
    if (!identity.isAuthenticated) {
      return { outcome: "render", destination: null };
    }

    return {
      outcome: "redirect",
      destination:
        identity.role === "Seller" ? ROUTES.SELLER_DASHBOARD : ROUTES.HOME,
    };
  }

  if (access === ROUTE_ACCESS.AUTHENTICATED) {
    if (!identity.isAuthenticated) {
      return { outcome: "redirect", destination: ROUTES.LOGIN };
    }

    return ["Buyer", "Seller"].includes(identity.role)
      ? { outcome: "render", destination: null }
      : { outcome: "redirect", destination: ROUTES.HOME };
  }

  if (!identity.isAuthenticated) {
    return { outcome: "redirect", destination: ROUTES.LOGIN };
  }

  if (access === identity.role) {
    return { outcome: "render", destination: null };
  }

  return {
    outcome: "redirect",
    destination:
      identity.role === "Seller" ? ROUTES.SELLER_DASHBOARD : ROUTES.HOME,
  };
};

test("the route manifest is unique, complete, and has no fake Admin surface", () => {
  const configuredPaths = APP_ROUTE_POLICIES.map(({ path }) => path);

  assert.equal(new Set(configuredPaths).size, configuredPaths.length);
  assert.deepEqual(
    configuredPaths.slice().sort(),
    Object.values(ROUTES).slice().sort()
  );
  assert.equal(
    APP_ROUTE_POLICIES.some(({ access }) => access === "Admin"),
    false
  );
});

test("every configured route has a stable Guest, Buyer, Seller, and unsupported-role decision", () => {
  for (const route of APP_ROUTE_POLICIES) {
    const path = getExamplePath(route);

    for (const identity of identities) {
      const actual = getRouteDecision({ path, ...identity });
      const expected = expectedDecision(route.access, identity);

      assert.equal(
        actual.outcome,
        expected.outcome,
        `${identity.name} outcome for ${path}`
      );
      assert.equal(
        actual.destination,
        expected.destination,
        `${identity.name} destination for ${path}`
      );
      assert.notEqual(
        actual.destination?.toLowerCase(),
        path.toLowerCase(),
        `${identity.name} must not redirect ${path} to itself`
      );
    }
  }
});

test("unknown URLs remain 404s for every identity, including role-looking typos", () => {
  for (const path of [
    "/buyerr/dashboard",
    "/buyer/dashboard",
    "/seller/dashbord",
    "/unknown",
    "/account/unknown",
    "/seller/unknown",
    "/categories",
    "/collections",
    "/products",
  ]) {
    for (const identity of identities) {
      assert.deepEqual(
        getRouteDecision({ path, ...identity }),
        { outcome: "not-found", destination: null, policy: null },
        `${identity.name} should see 404 for ${path}`
      );
    }
  }
});

test("route matching handles deep links, query/hash, case, trailing slash, and malformed entity IDs", () => {
  for (const path of [
    "/categories/mobiles/?sort=newest#products",
    "/COLLECTIONS/TOP-BRANDS",
    "/search?q=watch#results",
    "/products/not-a-number",
    "/stores/1?sort=newest#products",
    "/orders/not-a-number?source=notification",
    "/SELLER/DASHBOARD/?tab=orders#today",
  ]) {
    assert.ok(getRoutePolicy(path), `expected configured route for ${path}`);
  }

  assert.equal(getRoutePolicy("/products/"), null);
  assert.equal(getRoutePolicy("/orders/"), getRoutePolicy("/orders"));
});

test("post-login intended destinations are internal, configured, and role-appropriate", () => {
  assert.equal(
    getSafePostLoginRoute("/orders/25?source=bell#details", "Buyer"),
    "/orders/25?source=bell#details"
  );
  assert.equal(
    getSafePostLoginRoute("/seller/analytics?period=week", "Seller"),
    "/seller/analytics?period=week"
  );
  assert.equal(
    getSafePostLoginRoute("/seller/orders", "Buyer"),
    ROUTES.HOME
  );
  assert.equal(
    getSafePostLoginRoute("/account/profile", "Seller"),
    ROUTES.ACCOUNT_PROFILE
  );

  for (const unsafePath of [
    "https://example.com",
    "//example.com/path",
    "\\\\example.com",
    "/buyerr/dashboard",
    "/seller/dashbord",
    "/login",
    "/register",
  ]) {
    assert.equal(
      getSafePostLoginRoute(unsafePath, "Buyer"),
      ROUTES.HOME,
      unsafePath
    );
  }
});

test("role-aware account, 404, expiry, and logout destinations stay centralized", () => {
  assert.equal(getRoleLandingRoute("Seller"), ROUTES.SELLER_DASHBOARD);
  assert.equal(getAccountActionRoute("Buyer"), ROUTES.ACCOUNT_PROFILE);
  assert.equal(getAccountActionRoute("Seller"), ROUTES.SELLER_DASHBOARD);
  assert.equal(getAccountActionRoute("Admin"), ROUTES.LOGIN);
  assert.equal(getExpiredSessionRoute(), ROUTES.LOGIN);
  assert.equal(getPostLogoutRoute(), ROUTES.HOME);
  assert.equal(getNotFoundAction("Guest").to, ROUTES.HOME);
  assert.equal(getNotFoundAction("Buyer").to, ROUTES.HOME);
  assert.equal(
    getNotFoundAction("Seller").to,
    ROUTES.SELLER_DASHBOARD
  );
});

test("Seller shell navigation uses the configured Seller destinations", async () => {
  const [navbar, sidebar, dashboard, profile] = await Promise.all(
    [
      "src/components/layout/Navbar.jsx",
      "src/components/seller/SellerSidebar.jsx",
      "src/pages/seller/SellerDashboardPage.jsx",
      "src/pages/buyer/ProfilePage.jsx",
    ].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8"))
  );

  assert.match(
    navbar,
    /to=\{isSeller \? ROUTES\.SELLER_DASHBOARD : ROUTES\.HOME\}/
  );

  for (const routeName of [
    "SELLER_DASHBOARD",
    "SELLER_PRODUCTS",
    "SELLER_INVENTORY",
    "SELLER_ORDERS",
    "SELLER_ANALYTICS",
    "SELLER_STORE_PROFILE",
    "SELLER_NOTIFICATIONS",
    "ACCOUNT_PROFILE",
  ]) {
    assert.match(sidebar, new RegExp(`ROUTES\\.${routeName}`));
  }

  assert.doesNotMatch(dashboard, /common\.goToShop/);
  assert.doesNotMatch(dashboard, /seller-dashboard-page__shop-link/);
  assert.match(profile, /session\?\.role === "Seller"/);
  assert.match(profile, /<SellerPageShell>/);
});

test("404 and sign-in routing labels resolve in English and Turkish", () => {
  for (const translations of [en, tr]) {
    for (const key of [
      "notFound.title",
      "notFound.description",
      "notFound.actions.guest",
      "notFound.actions.buyer",
      "notFound.actions.seller",
      "auth.signInRequired",
      "buyer.catalog.collectionNotFound",
      "buyer.catalog.collectionUnavailable",
      "storePreview.manageProducts",
    ]) {
      const value = getTranslation(translations, key);

      assert.equal(typeof value, "string", key);
      assert.ok(value.length > 0, key);
      assert.notEqual(value, key, key);
    }
  }
});

test("notification Product destinations keep the configured Product route", () => {
  const destination = getNotificationDestination({
    relatedEntityType: "Product",
    relatedEntityId: 101,
  });

  assert.equal(destination, "/products/101");
});

test("verified navigation defects do not reappear in source entry points", async () => {
  const sources = await Promise.all(
    [
      "src/pages/auth/SignInPage.jsx",
      "src/pages/auth/RegisterPage.jsx",
      "src/components/home/StoryViewer.jsx",
      "src/pages/seller/SellerStorePreviewPage.jsx",
      "src/components/layout/Navbar.jsx",
      "src/routes/AppRoutes.jsx",
    ].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8"))
  );
  const combinedSource = sources.join("\n");

  for (const invalidTarget of [
    'to="/terms"',
    'to="/privacy"',
    "to={`/stores/",
    "to={`/products/${product.productId}`}",
  ]) {
    assert.doesNotMatch(combinedSource, new RegExp(invalidTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(sources[4], /!isSeller/);
  assert.match(sources[5], /<GuestRoute>/);
  assert.match(sources[5], /path=\{ROUTES\./);
  assert.match(sources[0], /to="\/forgot-password"/);
});
