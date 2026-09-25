import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import en from "../src/locales/en.json" with { type: "json" };
import tr from "../src/locales/tr.json" with { type: "json" };
import { STORE_ENDPOINTS } from "../src/config/apiEndpoints.js";
import {
  STORE_MEDIA_URL_MAX_LENGTH,
  createStoreMediaEditor,
  isValidStoreMediaUrl,
  resolveStoreMediaEdit,
} from "../src/utils/storeMediaEditor.js";
import {
  getStoreDecisionFeedback,
  getStoreStatusAction,
  getStoreStatusModifier,
} from "../src/utils/storeProfileStatus.js";

const getTranslation = (translations, key) =>
  key
    .split(".")
    .reduce(
      (value, part) => value?.[part],
      translations
    );

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
};
globalThis.window = { dispatchEvent: () => {} };

const users = [
  {
    userId: "2001",
    fullName: "Demo Seller",
    email: "seller@shopera.demo",
    role: "Seller",
    password: "Seller123!",
    status: "Active",
  },
  {
    userId: "3001",
    fullName: "New Seller",
    email: "new@seller.test",
    role: "Seller",
    password: "Password1",
    status: "Active",
  },
];

const setAuthenticatedSeller = (userId) => {
  const user = users.find((item) => item.userId === userId);
  const issuedAt = Date.now();
  localStorage.setItem(
    "token",
    `eyJoZWFkZXIiOiJ0ZXN0In0.dXNlci0${userId}.c2lnbmF0dXJl`
  );
  localStorage.setItem("role", "Seller");
  localStorage.setItem("userId", userId);
  localStorage.setItem("email", user.email);
  localStorage.setItem("fullName", user.fullName);
  localStorage.setItem("sessionIssuedAt", issuedAt);
  localStorage.setItem("sessionExpiresAt", issuedAt + 8 * 60 * 60 * 1000);
};

setAuthenticatedSeller("2001");

const {
  addSellerProduct,
  getSellerNotificationPresentation,
  getSellerProducts,
  getSellerStoreProfile,
  getSellerStorePreview,
  getSellerUnreadNotificationCount,
  markAllSellerNotificationsAsRead,
  markSellerNotificationAsRead,
  updateSellerStoreProfile,
  updateSellerStoreStatus,
  validateSellerProduct,
} = await import("../src/services/sellerService.js");
const { mapProductDto } = await import(
  "../src/services/mappers/productMapper.js"
);

test("seller Product and Store calls do not fall back to browser storage", async () => {
  setAuthenticatedSeller("2001");
  globalThis.fetch = async (url) => {
    if (url.startsWith("/api/seller/products")) {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    assert.equal(url, "/api/seller/store");

    return new Response(
      JSON.stringify({
        code: "SELLER_STORE_NOT_FOUND",
        message: "Seller Store was not found.",
      }),
      {
        status: 404,
        headers: { "content-type": "application/json" },
      }
    );
  };

  const profile = await getSellerStoreProfile();
  assert.equal(profile.hasStore, false);
  assert.deepEqual(profile.overview, []);
  assert.deepEqual((await getSellerProducts()).items, []);
  assert.equal(
    [...values.keys()].some((key) => /:(products|profile)$/.test(key)),
    false
  );
});

test("existing Seller Store overview exposes only the confirmed visible product count", async () => {
  setAuthenticatedSeller("2001");
  globalThis.fetch = async (url) => {
    assert.equal(url, "/api/seller/store");

    return new Response(
      JSON.stringify({
        storeId: 20,
        storeName: "Seller Store",
        visibleProductCount: 12,
        approvalStatus: "APPROVED",
        storeStatus: "ACTIVE",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  };

  const profile = await getSellerStoreProfile();

  assert.equal(profile.hasStore, true);
  assert.deepEqual(profile.overview, [
    {
      id: "visible-products",
      icon: "products",
      color: "purple",
      titleKey: "storeProfile.visibleProducts",
      value: 12,
      descriptionKey:
        "storeProfile.viewAllProducts",
      route: "/seller/products",
    },
  ]);

  const overviewFields = Object.keys(
    profile.overview[0]
  ).join(" ");
  assert.doesNotMatch(
    overviewFields,
    /sales|orders|revenue|reviews|rating/i
  );
});

test("Seller Store overview displays zero for zero or missing visible product counts", async () => {
  setAuthenticatedSeller("2001");

  for (const store of [
    { visibleProductCount: 0 },
    {},
  ]) {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          storeId: 20,
          storeName: "Seller Store",
          ...store,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }
      );

    const profile = await getSellerStoreProfile();
    assert.equal(profile.overview.length, 1);
    assert.equal(profile.overview[0].value, 0);
  }
});

test("Store Overview product action navigates with its seller products route", async () => {
  const source = await readFile(
    new URL(
      "../src/pages/seller/SellerStoreProfilePage.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    source,
    /onClick=\{\(\) =>\s*navigate\(item\.route\)\s*\}/
  );
});

test("Store Overview renders one full-width readable KPI with a defined color treatment", async () => {
  const [pageSource, styleSource] =
    await Promise.all([
      readFile(
        new URL(
          "../src/pages/seller/SellerStoreProfilePage.jsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../src/styles/seller/sellerStoreProfile.css",
          import.meta.url
        ),
        "utf8"
      ),
    ]);

  assert.match(
    pageSource,
    /seller-store-overview__content/
  );
  assert.match(
    styleSource,
    /\.seller-store-overview__items\s*\{[^}]*grid-template-columns:\s*1fr;/s
  );
  assert.doesNotMatch(
    styleSource,
    /\.seller-store-overview__items\s*\{[^}]*repeat\((?:2|4),/s
  );
  assert.match(
    styleSource,
    /\.seller-store-overview__icon--purple\s*\{/
  );
  assert.match(
    styleSource,
    /\.seller-store-overview__content\s*>\s*strong\s*\{[^}]*font-size:\s*30px;/s
  );
  assert.match(
    styleSource,
    /\.seller-store-overview__item button\s*\{[^}]*min-height:\s*42px;[^}]*font-size:\s*12px;/s
  );
  assert.match(
    styleSource,
    /\.seller-store-overview__item button:hover\s*\{/
  );
  assert.match(
    styleSource,
    /\.seller-store-overview__item button:focus-visible\s*\{/
  );
  assert.match(
    styleSource,
    /grid-column:\s*1\s*\/\s*-1;/
  );
});

test("Seller Store statuses resolve in English and Turkish without raw i18n keys", async () => {
  const expected = {
    pending: ["Pending", "Beklemede"],
    approved: ["Approved", "Onaylandı"],
    rejected: ["Rejected", "Reddedildi"],
    suspended: ["Suspended", "Askıya Alındı"],
    active: ["Active", "Aktif"],
    inactive: ["Inactive", "Pasif"],
    closed: ["Closed", "Kapalı"],
    notSubmitted: ["Not submitted", "Gönderilmedi"],
  };

  for (const [status, labels] of Object.entries(
    expected
  )) {
    const key = `storeProfile.status.${status}`;
    assert.equal(getTranslation(en, key), labels[0]);
    assert.equal(getTranslation(tr, key), labels[1]);
  }

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        storeId: 20,
        storeName: "Seller Store",
        approvalStatus: "FUTURE_REVIEW_STATE",
        storeStatus: "FUTURE_STORE_STATE",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );

  const profile = await getSellerStoreProfile();

  for (const key of [
    profile.store.approvalStatusKey,
    profile.store.storeStatusKey,
  ]) {
    assert.equal(key, "storeProfile.status.unknown");
    assert.notEqual(getTranslation(en, key), key);
    assert.notEqual(getTranslation(tr, key), key);
  }
});

test("Seller Store statuses receive safe semantic modifier classes", async () => {
  const expectedModifiers = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    SUSPENDED: "suspended",
    ACTIVE: "active",
    INACTIVE: "inactive",
    CLOSED: "closed",
    NOT_SUBMITTED: "neutral",
  };

  for (const [status, modifier] of Object.entries(
    expectedModifiers
  )) {
    assert.equal(
      getStoreStatusModifier(status),
      modifier
    );
  }

  for (const unknownStatus of [
    null,
    "",
    "FUTURE_BACKEND_STATUS",
    "../../unsafe-class",
  ]) {
    assert.equal(
      getStoreStatusModifier(unknownStatus),
      "neutral"
    );
  }

  const pageSource = await readFile(
    new URL(
      "../src/pages/seller/SellerStoreProfilePage.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    pageSource,
    /seller-store-business__status--\$\{getStoreStatusModifier\(/
  );
});

test("Store decision feedback is visible only for rejected and suspended approval states", () => {
  const note =
    "Approved for local Shopera integration testing.";

  assert.equal(
    getStoreDecisionFeedback("REJECTED", note),
    note
  );
  assert.equal(
    getStoreDecisionFeedback("SUSPENDED", note),
    note
  );

  for (const status of [
    "APPROVED",
    "PENDING",
    "FUTURE_STATE",
    null,
  ]) {
    assert.equal(
      getStoreDecisionFeedback(status, note),
      ""
    );
  }

  assert.equal(
    getStoreDecisionFeedback("REJECTED", "  "),
    ""
  );
});

test("Store status actions are limited to approved active and inactive Stores", () => {
  assert.equal(
    getStoreStatusAction("APPROVED", "ACTIVE"),
    "INACTIVE"
  );
  assert.equal(
    getStoreStatusAction("APPROVED", "INACTIVE"),
    "ACTIVE"
  );

  for (const approvalStatus of [
    "PENDING",
    "REJECTED",
    "SUSPENDED",
    "FUTURE_STATE",
  ]) {
    assert.equal(
      getStoreStatusAction(
        approvalStatus,
        "ACTIVE"
      ),
      null
    );
  }

  assert.equal(
    getStoreStatusAction("APPROVED", "CLOSED"),
    null
  );
});

test("Store status flow is translated, accessible, confirmed, and guarded from duplicate submissions", async () => {
  const requiredKeys = [
    "activate",
    "deactivate",
    "activating",
    "deactivating",
    "activatedSuccessfully",
    "deactivatedSuccessfully",
    "unableToUpdateStatus",
    "confirmDeactivation",
    "deactivationWarning",
    "cancel",
    "confirm",
    "adminFeedback",
    "resubmit",
    "resubmitted",
  ];

  for (const key of requiredKeys) {
    for (const locale of [en, tr]) {
      const translation = getTranslation(
        locale,
        `storeProfile.${key}`
      );
      assert.equal(typeof translation, "string");
      assert.notEqual(
        translation,
        `storeProfile.${key}`
      );
    }
  }

  const flattenKeys = (value, prefix = "") =>
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return child && typeof child === "object"
        ? flattenKeys(child, path)
        : [path];
    });

  assert.deepEqual(
    flattenKeys(en.storeProfile).sort(),
    flattenKeys(tr.storeProfile).sort()
  );

  const [pageSource, dialogSource] =
    await Promise.all([
      readFile(
        new URL(
          "../src/pages/seller/SellerStoreProfilePage.jsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../src/components/seller/StoreStatusConfirmationDialog.jsx",
          import.meta.url
        ),
        "utf8"
      ),
    ]);

  assert.match(pageSource, /getStoreDecisionFeedback\(/);
  assert.match(pageSource, /role="note"/);
  assert.match(pageSource, /storeProfile\.adminFeedback/);
  assert.match(
    pageSource,
    /setIsDeactivationDialogOpen\(\s*true\s*\)/
  );
  assert.match(
    pageSource,
    /statusSubmissionRef\.current/
  );
  assert.match(
    pageSource,
    /await updateSellerStoreStatus\([\s\S]*?await loadStoreProfile\(\)/
  );
  assert.match(dialogSource, /useOverlayAccessibility/);
  assert.match(dialogSource, /role="dialog"/);
  assert.match(dialogSource, /aria-modal="true"/);
  assert.match(dialogSource, /disabled=\{isSubmitting\}/);

  const source = `${pageSource}\n${dialogSource}`;
  const usedKeys = [
    ...source.matchAll(
      /t\(\s*["'](storeProfile\.[^"']+)["']/g
    ),
  ].map((match) => match[1]);

  for (const key of usedKeys) {
    assert.equal(
      typeof getTranslation(en, key),
      "string",
      `Missing English translation for ${key}`
    );
    assert.equal(
      typeof getTranslation(tr, key),
      "string",
      `Missing Turkish translation for ${key}`
    );
  }
});

test("Seller Store status and profile updates keep decision notes read-only", async () => {
  setAuthenticatedSeller("2001");
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    if (
      url === "/api/seller/store" &&
      (!options.method || options.method === "GET")
    ) {
      return new Response(
        JSON.stringify({
          storeId: 20,
          storeName: "Seller Store",
          latestDecisionNote: "Admin history",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        storeId: 20,
        storeName: "Seller Store",
        storeStatus: "INACTIVE",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  };

  await updateSellerStoreProfile({
    storeName: "Seller Store",
    latestDecisionNote: "Must remain server-owned",
  });
  await updateSellerStoreStatus("INACTIVE");

  const profileUpdate = requests.find(
    ({ url, options }) =>
      url === "/api/seller/store" &&
      options.method === "PATCH"
  );
  const statusUpdate = requests.find(
    ({ url }) => url === "/api/seller/store/status"
  );

  assert.equal(
    "latestDecisionNote" in
      JSON.parse(profileUpdate.options.body),
    false
  );
  assert.deepEqual(
    JSON.parse(statusUpdate.options.body),
    { storeStatus: "INACTIVE" }
  );

  const headers = new Headers(
    statusUpdate.options.headers
  );
  assert.equal(headers.has("Seller-User-ID"), false);
  assert.equal(headers.has("Store-ID"), false);
  assert.match(
    headers.get("Authorization") || "",
    /^Bearer /i
  );
});

test("Store media editor applies, cancels, and removes banner and logo URLs honestly", () => {
  const formData = {
    bannerUrl:
      "https://images.example.test/banner-old.jpg",
    logoUrl:
      "https://images.example.test/logo-old.jpg",
  };

  const bannerEditor = {
    ...createStoreMediaEditor(
      "banner",
      formData
    ),
    draftUrl:
      "https://images.example.test/banner-new.jpg",
  };
  const logoEditor = {
    ...createStoreMediaEditor("logo", formData),
    draftUrl:
      "https://images.example.test/logo-new.jpg",
  };

  assert.strictEqual(
    resolveStoreMediaEdit(
      formData,
      bannerEditor,
      "cancel"
    ),
    formData
  );
  assert.equal(
    resolveStoreMediaEdit(
      formData,
      bannerEditor,
      "apply"
    ).bannerUrl,
    bannerEditor.draftUrl
  );
  assert.equal(
    resolveStoreMediaEdit(
      formData,
      logoEditor,
      "apply"
    ).logoUrl,
    logoEditor.draftUrl
  );
  assert.equal(
    resolveStoreMediaEdit(
      formData,
      bannerEditor,
      "remove"
    ).bannerUrl,
    ""
  );
  assert.equal(
    resolveStoreMediaEdit(
      formData,
      logoEditor,
      "remove"
    ).logoUrl,
    ""
  );
});

test("Store media URLs accept absolute HTTP sources and reject unsafe or local sources", () => {
  assert.equal(
    isValidStoreMediaUrl(
      "https://cdn.example.test/store/banner.jpg"
    ),
    true
  );
  assert.equal(
    isValidStoreMediaUrl(
      "http://cdn.example.test/store/logo.png"
    ),
    true
  );

  for (const invalidUrl of [
    "not a URL",
    "/images/store.jpg",
    "images/store.jpg",
    "//cdn.example.test/store.jpg",
    "https:cdn.example.test/store.jpg",
    "data:image/png;base64,AAAA",
    "blob:https://shopera.test/image-id",
    "file:///C:/store/logo.png",
    "C:\\store\\logo.png",
  ]) {
    assert.equal(
      isValidStoreMediaUrl(invalidUrl),
      false,
      invalidUrl
    );
  }

  const maxLengthUrl = `https://example.test/${"a".repeat(
    STORE_MEDIA_URL_MAX_LENGTH -
      "https://example.test/".length
  )}`;
  assert.equal(maxLengthUrl.length, 1000);
  assert.equal(
    isValidStoreMediaUrl(maxLengthUrl),
    true
  );
  assert.equal(
    isValidStoreMediaUrl(`${maxLengthUrl}a`),
    false
  );
});

test("valid Store media URLs are persisted through the existing Store update payload", async () => {
  setAuthenticatedSeller("2001");
  let updatePayload = null;

  globalThis.fetch = async (
    url,
    options = {}
  ) => {
    assert.equal(url, "/api/seller/store");

    if ((options.method || "GET") === "GET") {
      return new Response(
        JSON.stringify({
          storeId: 20,
          storeName: "Seller Store",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    assert.equal(options.method, "PATCH");
    updatePayload = JSON.parse(options.body);

    return new Response(
      JSON.stringify({
        storeId: 20,
        ...updatePayload,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  };

  await updateSellerStoreProfile({
    storeName: "Seller Store",
    logoUrl:
      "https://cdn.example.test/store/logo.png",
    bannerUrl:
      "https://cdn.example.test/store/banner.jpg",
  });

  assert.equal(
    updatePayload.storeLogoUrl,
    "https://cdn.example.test/store/logo.png"
  );
  assert.equal(
    updatePayload.storeBannerUrl,
    "https://cdn.example.test/store/banner.jpg"
  );
});

test("invalid Store media URLs are rejected before any backend request", async () => {
  setAuthenticatedSeller("2001");
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    throw new Error(
      "Invalid Store media must not reach fetch"
    );
  };

  for (const invalidUrl of [
    "invalid",
    "/relative/banner.jpg",
    "data:image/png;base64,AAAA",
    "blob:https://shopera.test/image-id",
    "file:///C:/store/banner.jpg",
  ]) {
    await assert.rejects(
      updateSellerStoreProfile({
        storeName: "Seller Store",
        bannerUrl: invalidUrl,
        logoUrl: "",
      }),
      /INVALID_STORE/
    );
  }

  assert.equal(requestCount, 0);
});

test("Store media controls open the accessible URL editor and retain safe fallbacks", async () => {
  const [pageSource, dialogSource] =
    await Promise.all([
      readFile(
        new URL(
          "../src/pages/seller/SellerStoreProfilePage.jsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../src/components/seller/StoreMediaUrlDialog.jsx",
          import.meta.url
        ),
        "utf8"
      ),
    ]);

  assert.match(
    pageSource,
    /openMediaEditor\("banner"\)/
  );
  assert.match(
    pageSource,
    /openMediaEditor\("logo"\)/
  );
  assert.match(pageSource, /!brokenBanner/);
  assert.match(pageSource, /!brokenLogo/);
  assert.match(
    pageSource,
    /storeProfile\.bannerLoadError/
  );
  assert.match(
    pageSource,
    /storeProfile\.logoLoadError/
  );
  assert.match(
    dialogSource,
    /useOverlayAccessibility/
  );
  assert.match(dialogSource, /role="dialog"/);
  assert.match(dialogSource, /aria-modal="true"/);
  assert.match(dialogSource, /disabled=\{!isValid\}/);
});

test("Store media editor introduces no file upload, browser storage, or fake progress", async () => {
  const sources = await Promise.all(
    [
      "src/pages/seller/SellerStoreProfilePage.jsx",
      "src/components/seller/StoreMediaUrlDialog.jsx",
      "src/utils/storeMediaEditor.js",
    ].map((path) =>
      readFile(
        new URL(`../${path}`, import.meta.url),
        "utf8"
      )
    )
  );

  const source = sources.join("\n");
  assert.doesNotMatch(
    source,
    /type=["']file["']|new\s+FormData|createObjectURL|localStorage|uploadProgress/
  );
  assert.equal(
    Object.keys(STORE_ENDPOINTS).some((key) =>
      /upload|image|logo|banner/i.test(key)
    ),
    false
  );
});

test("Store media editor labels resolve in English and Turkish", () => {
  for (const key of [
    "bannerEditorTitle",
    "logoEditorTitle",
    "mediaEditorDescription",
    "bannerImageUrl",
    "logoImageUrl",
    "mediaUrlRequirements",
    "mediaUrlInvalid",
    "mediaEditorApply",
    "mediaEditorCancel",
    "removeBanner",
    "removeLogo",
    "closeMediaEditor",
    "bannerLoadError",
    "logoLoadError",
  ]) {
    assert.equal(
      typeof getTranslation(
        en,
        `storeProfile.${key}`
      ),
      "string"
    );
    assert.equal(
      typeof getTranslation(
        tr,
        `storeProfile.${key}`
      ),
      "string"
    );
  }
});

test("Seller Store Preview uses summary products and the authenticated seller name", async () => {
  setAuthenticatedSeller("2001");
  globalThis.fetch = async (url) => {
    if (url === "/api/seller/store") {
      return new Response(
        JSON.stringify({
          storeId: 20,
          storeName: "Seller Store",
          approvalStatus: "APPROVED",
          storeStatus: "ACTIVE",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }

    assert.equal(
      url,
      "/api/seller/products?page=1&pageSize=12"
    );
    return new Response(
      JSON.stringify({
        page: 1,
        pageSize: 12,
        totalCount: 1,
        totalPages: 1,
        items: [
          {
            productId: 30,
            productName: "Preview Product",
            productCondition: "NEW",
            primaryImageId: 40,
            minimumPrice: 99,
            totalStock: 7,
            variantCount: 2,
          },
        ],
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  };

  const preview = await getSellerStorePreview();

  assert.equal(preview.sellerUser.fullName, "Demo Seller");
  assert.equal(preview.products.length, 1);
  assert.deepEqual(
    {
      productId: preview.products[0].productId,
      name: preview.products[0].name,
      price: preview.products[0].price,
      stockQuantity: preview.products[0].stockQuantity,
    },
    {
      productId: 30,
      name: "Preview Product",
      price: 99,
      stockQuantity: 7,
    }
  );
});

test("multiple mapped variants keep Product and Variant identity independent", () => {
  const input = validateSellerProduct({
    productName: "Variant product",
    productCondition: "NEW",
    categoryId: 1,
    status: "ACTIVE",
    images: [],
    variants: [
      {
        sku: "VAR-BLACK",
        color: "Black",
        price: 10,
        costPrice: 4,
        stockQuantity: 3,
        status: "ACTIVE",
      },
      {
        sku: "VAR-WHITE",
        color: "White",
        price: 11,
        costPrice: 5,
        stockQuantity: 7,
        status: "ACTIVE",
      },
    ],
  });
  assert.equal(input.variants.every((variant) => !("variantId" in variant)), true);

  const product = mapProductDto({
    ProductID: 1,
    ProductName: input.productName,
    Variants: [
      { ProductID: 1, VariantID: 11, Price: 0, StockQuantity: 0 },
      { ProductID: 1, VariantID: 12, Price: 11, StockQuantity: 7 },
    ],
  });
  assert.equal(product.variants.length, 2);
  assert.equal(product.variants[0].productId, 1);
  assert.notEqual(product.productId, product.variants[0].variantId);
  assert.notEqual(product.variants[0].variantId, product.variants[1].variantId);
});

test("duplicate and invalid variant values are rejected by the service", async () => {
  setAuthenticatedSeller("2001");
  await assert.rejects(
    addSellerProduct({
      productName: "Duplicate",
      productCondition: "NEW",
      categoryId: 1,
      status: "ACTIVE",
      images: [],
      variants: [
        { sku: "SAME", color: "Black", price: 1, costPrice: 1, stockQuantity: 1, status: "ACTIVE" },
        { sku: "same", color: "White", price: 2, costPrice: 1, stockQuantity: 1, status: "ACTIVE" },
      ],
    }),
    /DUPLICATE_VARIANT_SKU/
  );
  await assert.rejects(
    addSellerProduct({
      productName: "Invalid",
      productCondition: "NEW",
      categoryId: 1,
      status: "ACTIVE",
      images: [],
      variants: [{ sku: "", price: -1, costPrice: -1, stockQuantity: -1, status: "ACTIVE" }],
    }),
    /INVALID_VARIANT/
  );
});

test("seller notifications use backend unread/read APIs and unknown fallback is safe", async () => {
  setAuthenticatedSeller("2001");
  let notifications = [
    {
      notificationId: 1,
      notificationType: "NEW_ORDER",
      title: "New order received",
      message: "You received order ORD-1.",
      relatedEntityType: "ORDER",
      relatedEntityId: 1,
      isRead: false,
      createdDate: "2026-08-12T10:00:00Z",
    },
    {
      notificationId: 2,
      notificationType: "FUTURE_TYPE",
      title: "Future",
      message: "Future notification",
      isRead: false,
      createdDate: "2026-08-12T09:00:00Z",
    },
  ];

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input), "http://shopera.test");
    const method = options.method || "GET";

    if (url.pathname === "/api/notifications" && method === "GET") {
      return new Response(JSON.stringify(notifications), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.pathname === "/api/notifications/unread-count") {
      return new Response(
        JSON.stringify(notifications.filter((item) => !item.isRead).length),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    const match = url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
    if (match && method === "PATCH") {
      notifications = notifications.map((item) =>
        item.notificationId === Number(match[1])
          ? { ...item, isRead: true }
          : item
      );
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/api/notifications/read-all" && method === "PATCH") {
      notifications = notifications.map((item) => ({ ...item, isRead: true }));
      return new Response(JSON.stringify({ updatedCount: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new TypeError(`Unhandled seller notification request: ${method} ${url.pathname}`);
  };

  assert.equal(await getSellerUnreadNotificationCount(), 2);
  await markSellerNotificationAsRead(1);
  assert.equal(await getSellerUnreadNotificationCount(), 1);
  await markAllSellerNotificationsAsRead();
  assert.equal(await getSellerUnreadNotificationCount(), 0);

  assert.deepEqual(
    getSellerNotificationPresentation({ notificationType: "FUTURE_TYPE" }),
    {
      icon: "N",
      category: "other",
      route: null,
      actionLabelKey: "notifications.actions.dismiss",
    }
  );
});
