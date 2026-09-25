import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import en from "../src/locales/en.json" with { type: "json" };
import tr from "../src/locales/tr.json" with { type: "json" };
import { CART_ENDPOINTS } from "../src/config/apiEndpoints.js";
import { mapCartDto } from "../src/services/mappers/cartMapper.js";
import { getCommerceConflictMessage } from "../src/services/commerceErrorMessages.js";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
};
globalThis.sessionStorage = { removeItem: () => {} };
globalThis.window = { dispatchEvent: () => {} };

const setAuthenticatedBuyer = () => {
  const issuedAt = Date.now();
  localStorage.setItem(
    "token",
    "eyJoZWFkZXIiOiJ0ZXN0In0.dXNlci0xMDAx.c2lnbmF0dXJl"
  );
  localStorage.setItem("role", "Buyer");
  localStorage.setItem("userId", "1001");
  localStorage.setItem("email", "buyer@shopera.test");
  localStorage.setItem("fullName", "Demo Buyer");
  localStorage.setItem("sessionIssuedAt", String(issuedAt));
  localStorage.setItem("sessionExpiresAt", String(issuedAt + 28_800_000));
};

const {
  addCartItem,
  clearBuyerCart,
  getBuyerCart,
  removeCartItem,
  updateCartItemQuantity,
} = await import("../src/services/cartService.js");

const cartResponse = (storeStatus = "ACTIVE") => ({
  cartId: 31,
  buyerUserId: 1001,
  createdDate: "2026-08-11T10:00:00Z",
  status: storeStatus,
  totalQuantity: 2,
  totalAmount: 0,
  currencyCode: "EUR",
  items: [
    {
      cartItemId: 71,
      productId: 99,
      variantId: 44,
      storeId: 4,
      productName: "Mapped Product",
      sku: "MAP-44",
      variantName: null,
      size: null,
      color: "Blue",
      storageCapacity: null,
      imageUrl: "/api/product-images/500/content",
      quantity: 2,
      unitPriceAtAdd: 0,
      currentUnitPrice: 0,
      priceChanged: false,
      subtotal: 0,
      availableStock: 0,
    },
  ],
});

test("Cart mapper accepts camelCase and PascalCase without crossing identities or losing zeroes", () => {
  const cart = mapCartDto(cartResponse());
  const pascal = mapCartDto({
    CartID: 32,
    BuyerUserID: 1002,
    CreatedDate: "2026-08-11T10:00:00Z",
    Status: "ACTIVE",
    TotalQuantity: 0,
    TotalAmount: 0,
    Items: [
      {
        CartItemID: 72,
        ProductID: 100,
        VariantID: 45,
        StoreID: 5,
        ProductName: "Pascal Product",
        SKU: "PAS-45",
        ImageUrl: "/api/product-images/501/content",
        Quantity: 0,
        UnitPriceAtAdd: 0,
        CurrentUnitPrice: 0,
        PriceChanged: false,
        Subtotal: 0,
        AvailableStock: 0,
      },
    ],
  });

  assert.equal(cart.cartId, 31);
  assert.equal(cart.items[0].cartItemId, 71);
  assert.equal(cart.items[0].variantId, 44);
  assert.equal(cart.items[0].productId, 99);
  assert.equal(cart.items[0].storeId, 4);
  assert.equal(cart.items[0].image, "/api/product-images/500/content");
  assert.equal(cart.items[0].unitPriceAtAdd, 0);
  assert.equal(cart.items[0].currentUnitPrice, 0);
  assert.equal(cart.items[0].unitPrice, 0);
  assert.equal(cart.currencyCode, "EUR");
  assert.equal(cart.items[0].availableStock, 0);
  assert.equal(pascal.cartId, 32);
  assert.equal(pascal.totalQuantity, 0);
  assert.equal(pascal.items[0].productId, 100);
  assert.equal(pascal.items[0].variantId, 45);
  assert.equal(pascal.items[0].storeId, 5);
  assert.equal(pascal.items[0].image, "/api/product-images/501/content");
  assert.equal(pascal.items[0].subtotal, 0);
});

test("Cart mapper uses the authoritative current unit price and leaves an absent unit price empty", () => {
  const pricedCart = mapCartDto({
    Items: [{
      CartItemID: 73,
      VariantID: 46,
      Quantity: 1,
      UnitPriceAtAdd: 10,
      CurrentUnitPrice: 12,
      Subtotal: 12,
    }],
  });
  const lineOnlyCart = mapCartDto({
    items: [{
      cartItemId: 74,
      variantId: 47,
      quantity: 1,
      subtotal: 12,
    }],
  });

  assert.equal(pricedCart.items[0].unitPriceAtAdd, 10);
  assert.equal(pricedCart.items[0].currentUnitPrice, 12);
  assert.equal(pricedCart.items[0].unitPrice, 12);
  assert.equal(pricedCart.items[0].subtotal, 12);
  assert.equal(lineOnlyCart.items[0].unitPrice, null);
  assert.equal(lineOnlyCart.items[0].subtotal, 12);
});


test("typed commerce conflicts map stock and store errors without exposing backend details", () => {
  const t = (key, options = {}) =>
    key.endsWith("limitedStock")
      ? `Only ${options.count} items are available.`
      : key;

  assert.equal(
    getCommerceConflictMessage({
      status: 409,
      code: "INSUFFICIENT_STOCK",
      data: {
        availableStock: 0,
        detail: "System.InvalidOperationException: internal stock failure",
      },
    }, t, "cart"),
    "cart.errors.outOfStock"
  );
  assert.equal(
    getCommerceConflictMessage({
      status: 409,
      code: "INSUFFICIENT_STOCK",
      data: { availableStock: 3 },
    }, t, "cart"),
    "Only 3 items are available."
  );
  assert.equal(
    getCommerceConflictMessage({
      status: 409,
      code: "INSUFFICIENT_STOCK",
      data: {},
    }, t, "checkout"),
    "checkout.errors.quantityUnavailable"
  );
  assert.equal(
    getCommerceConflictMessage({
      status: 409,
      code: "CART_STORE_CONFLICT",
      data: { detail: "raw backend text must not render" },
    }, t, "cart"),
    "cart.errors.storeConflict"
  );
  assert.equal(
    getCommerceConflictMessage({
      status: 409,
      code: "CART_CONCURRENCY_CONFLICT",
      data: { detail: "raw backend text must not render" },
    }, t, "cart"),
    "cart.errors.conflict"
  );
});

test("Cart service uses confirmed routes, methods, JWT, and request bodies", async () => {
  values.clear();
  setAuthenticatedBuyer();
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    const body = options.method === "DELETE" ? null : cartResponse();
    return new Response(body === null ? null : JSON.stringify(body), {
      status: options.method === "DELETE" ? 204 : 200,
      headers: body === null ? {} : { "content-type": "application/json" },
    });
  };

  await getBuyerCart();
  await addCartItem(44, 2);
  await updateCartItemQuantity(44, 3);
  await removeCartItem(44);

  assert.deepEqual(
    requests.map(({ url, options }) => [options.method || "GET", url]),
    [
      ["GET", CART_ENDPOINTS.cart],
      ["POST", CART_ENDPOINTS.items],
      ["PUT", "/api/cart/items/44"],
      ["DELETE", "/api/cart/items/44"],
    ]
  );
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    variantId: 44,
    quantity: 2,
  });
  assert.deepEqual(JSON.parse(requests[2].options.body), { quantity: 3 });
  for (const { options } of requests) {
    assert.match(
      new Headers(options.headers).get("Authorization") || "",
      /^Bearer /
    );
  }
});

test("Cart service does not use a browser Cart database or invent success after an error", async () => {
  values.clear();
  setAuthenticatedBuyer();
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Variant unavailable" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });

  await assert.rejects(addCartItem(44, 1), (error) => error.status === 404);
  assert.equal(localStorage.getItem("carts"), null);
  assert.equal(localStorage.getItem("cartItems"), null);

  const source = await readFile(
    new URL("../src/services/cartService.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /localStorage|createID|CartItemID:\s*create/);
  assert.doesNotMatch(source, /ProductID.*VariantID|VariantID.*ProductID/);
});

test("Guest and Seller sessions do not call Buyer Cart endpoints", async () => {
  values.clear();
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    throw new Error("Cart endpoint must not be called");
  };

  assert.equal(await getBuyerCart(), null);
  setAuthenticatedBuyer();
  values.set("role", "Seller");
  assert.equal(await getBuyerCart(), null);
  assert.equal(requestCount, 0);
  await assert.rejects(addCartItem(44, 1), (error) => error.status === 403);
});

test("Clearing the Cart uses the backend clear endpoint then refetches authoritative state", async () => {
  values.clear();
  setAuthenticatedBuyer();
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push([options.method || "GET", url]);
    const isDelete = options.method === "DELETE";
    return new Response(
      isDelete ? null : JSON.stringify({ ...cartResponse(), items: [] }),
      {
        status: isDelete ? 204 : 200,
        headers: isDelete ? {} : { "content-type": "application/json" },
      }
    );
  };

  const cart = cartResponse();
  await clearBuyerCart(cart);

  assert.deepEqual(requests, [
    ["DELETE", CART_ENDPOINTS.items],
    ["GET", CART_ENDPOINTS.cart],
  ]);
});

test("Cart product surfaces use real Variant IDs and route cards without one to Product Details", async () => {
  const [cardSource, detailSource, contextSource] = await Promise.all([
    readFile(
      new URL("../src/components/product/ProductCard.jsx", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../src/components/product/ProductPurchasePanel.jsx", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../src/context/CartContext.jsx", import.meta.url),
      "utf8"
    ),
  ]);

  assert.match(cardSource, /getWishlistVariantId\(wishlistVariant\)/);
  assert.match(cardSource, /to=\{`\/products\/\$\{productId\}`\}/);
  assert.match(cardSource, /cart\.viewProduct/);
  assert.doesNotMatch(cardSource, /variantId\s*=\s*productId|id:\s*productId/);
  assert.match(detailSource, /addToCart\(\{ variantId, quantity \}\)/);
  assert.doesNotMatch(detailSource, /productId,\s*variantId/);
  assert.match(contextSource, /mutationInFlight\.current/);
  assert.match(contextSource, /window\.addEventListener\("authChanged"/);
  assert.match(contextSource, /getBuyerCart\(\)/);
  assert.doesNotMatch(contextSource, /localStorage|cartChanged/);
});

test("Cart locale keys remain synchronized", () => {
  const keys = [
    "addProduct",
    "adding",
    "viewProduct",
    "chooseOptions",
    "loading",
    "errors.validation",
    "errors.sessionExpired",
    "errors.buyerRequired",
    "errors.itemUnavailable",
    "errors.outOfStock",
    "errors.limitedStock",
    "errors.quantityUnavailable",
    "errors.storeConflict",
    "errors.stockChanged",
    "errors.conflict",
    "errors.network",
    "errors.updateFailed",
    "priceChanged",
    "summary.orderSummary",
    "summary.subtotal",
    "summary.shipping",
    "summary.free",
    "summary.total",
    "summary.items_one",
    "summary.items_other",
    "summary.proceed",
    "summary.checkout",
  ];

  for (const key of keys) {
    const get = (locale) => key.split(".").reduce(
      (value, part) => value?.[part],
      locale.cart
    );
    assert.equal(typeof get(en), "string");
    assert.equal(typeof get(tr), "string");
  }
});


test("Product Add to Cart exposes controlled Cart errors and opens feedback immediately", async () => {
  const panelSource = await readFile(
    new URL("../src/components/product/ProductPurchasePanel.jsx", import.meta.url),
    "utf8"
  );
  const contextSource = await readFile(
    new URL("../src/context/CartContext.jsx", import.meta.url),
    "utf8"
  );

  assert.match(panelSource, /cartError/);
  assert.match(panelSource, /role="alert"/);
  assert.match(panelSource, /aria-live="assertive"/);

  const addStart = contextSource.indexOf("const addToCart = useCallback");
  const openIndex = contextSource.indexOf("setIsCartOpen(true)", addStart);
  const mutationIndex = contextSource.indexOf("return runMutation", addStart);
  assert.ok(addStart >= 0 && openIndex > addStart && mutationIndex > openIndex);
});
