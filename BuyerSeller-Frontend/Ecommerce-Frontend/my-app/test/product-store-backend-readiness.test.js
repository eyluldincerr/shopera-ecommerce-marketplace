import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  mapCategoryDto,
  mapPaginationDto,
  mapProductDto,
  mapProductPageDto,
  mapProductWriteRequest,
  mapSellerProductDto,
} from "../src/services/mappers/productMapper.js";
import {
  mapStoreDto,
  mapStoreWriteRequest,
} from "../src/services/mappers/storeMapper.js";
import {
  mapProductQueryParams,
  productHttpAdapter,
} from "../src/services/adapters/productHttpAdapter.js";
import { storeHttpAdapter } from "../src/services/adapters/storeHttpAdapter.js";
import { validateSellerProduct } from "../src/services/sellerService.js";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const sourceFiles = async (relativeDirectory) => {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      return entry.isDirectory()
        ? sourceFiles(relativePath)
        : /\.(jsx?|mjs)$/.test(entry.name)
          ? [relativePath]
          : [];
    })
  );
  return nested.flat();
};

const createTestImageFile = (name = "product.jpg") =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], name, {
    type: "image/jpeg",
  });

const sellerProduct = (overrides = {}) => ({
  productName: "Schema Product",
  shortDescription: "Short",
  description: "Long description",
  brand: "Text brand",
  modelNumber: "MODEL-1",
  productCondition: "NEW",
  conditionDescription: "",
  status: "ACTIVE",
  categoryId: 9,
  productInfo: {
    productDetails: { items: [{ label: "Material", value: "Steel" }] },
    specifications: {
      groups: [{ name: "General", items: [{ label: "Power", value: "10W" }] }],
    },
    whatsInTheBox: { items: [{ label: "Cable", value: "1" }] },
    warrantyInformation: "Two years",
    returnPolicy: "Thirty days",
    careInstructions: "Keep dry",
    additionalInformation: null,
  },
  images: [
    {
      file: createTestImageFile(),
      altText: "Product",
      displayOrder: 1,
      isPrimary: true,
    },
  ],
  variants: [
    {
      sku: "SKU-1",
      variantName: "Standard",
      size: null,
      color: "Black",
      storageCapacity: null,
      price: 0,
      costPrice: 0,
      stockQuantity: 0,
      status: "ACTIVE",
    },
  ],
  ...overrides,
});

test("public Product mapping uses exact SQL names, preserves zero, and hides cost", () => {
  const product = mapProductDto({
    ProductID: 1,
    ProductName: "Mapped Product",
    ProductCondition: "NEW",
    StoreID: 2,
    CategoryID: 3,
    ProductInfo: {
      ProductInfoID: 4,
      ProductID: 1,
      ProductDetails: { items: [] },
      Specifications: { groups: [{ items: [] }] },
      WhatsInTheBox: { items: [] },
    },
    Images: [
      {
        ImageID: 5,
        ProductID: 1,
        ImageURL: "https://example.test/image.jpg",
        DisplayOrder: 1,
        IsPrimary: true,
      },
    ],
    Variants: [
      {
        VariantID: 6,
        ProductID: 1,
        SKU: "SKU-0",
        Price: 0,
        CostPrice: 0,
        StockQuantity: 0,
        RowVersion: "AAAAAAAAB9E=",
      },
    ],
  });

  assert.equal(product.productId, 1);
  assert.equal(product.productName, "Mapped Product");
  assert.equal(product.productInfo.productInfoId, 4);
  assert.equal(product.images[0].displayOrder, 1);
  assert.equal(product.variants[0].variantId, 6);
  assert.equal(product.variants[0].price, 0);
  assert.equal(product.variants[0].stockQuantity, 0);
  assert.equal(product.variants[0].rowVersion, "AAAAAAAAB9E=");
  assert.equal("costPrice" in product.variants[0], false);
  assert.notEqual(product.productId, product.variants[0].variantId);
});

test("public Product detail mapping preserves Buyer-safe Store policies", () => {
  const product = mapProductDto({
    ProductID: 21,
    ProductName: "Policy Product",
    Store: {
      StoreID: 7,
      StoreName: "Policy Store",
      StoreDescription: "Seller storefront",
      StoreLogoURL: "https://example.test/logo.png",
      SupportPolicy: "Contact us for product support.",
      ReturnPolicy: "Returns are accepted under the seller policy.",
      VisibleProductCount: 3,
    },
  });

  assert.equal(product.store.storeId, 7);
  assert.equal(product.store.storeName, "Policy Store");
  assert.equal(product.store.supportPolicy, "Contact us for product support.");
  assert.equal(product.store.returnPolicy, "Returns are accepted under the seller policy.");
  assert.equal(product.store.visibleProductCount, 3);
});

test("authorized Seller mapping includes confidential cost price without IDs mixing", () => {
  const product = mapSellerProductDto({
    ProductID: 10,
    ProductName: "Seller Product",
    Variants: [
      {
        ProductID: 10,
        VariantID: 11,
        SKU: "SELLER-SKU",
        Price: 0,
        CostPrice: 0,
        StockQuantity: 0,
      },
    ],
  });
  assert.equal(product.variants[0].costPrice, 0);
  assert.equal(product.variants[0].productId, 10);
  assert.equal(product.variants[0].variantId, 11);
});

test("Category mapping is hierarchical and omits Admin ownership", () => {
  assert.deepEqual(
    mapCategoryDto({
      CategoryID: 7,
      CategoryName: "Audio",
      Description: "Sound",
      ParentCategoryID: 2,
      ManagedByAdminUserID: 99,
    }),
    {
      categoryId: 7,
      categoryName: "Audio",
      description: "Sound",
      parentCategoryId: 2,
    }
  );
});

test("Store mapping is canonical and Seller writes contain editable fields only", () => {
  const store = mapStoreDto({
    StoreID: 7,
    SellerUserID: 3,
    StoreName: "Canonical Store",
    StoreSlug: "canonical-store",
    ApprovalStatus: "APPROVED",
    ApprovedByAdminUserID: 8,
    StoreStatus: "ACTIVE",
  });

  assert.equal(store.storeId, 7);
  assert.equal(store.sellerUserId, 3);
  assert.notEqual(store.storeId, store.sellerUserId);
  assert.deepEqual(mapStoreWriteRequest(store), {
    storeName: "Canonical Store",
    storeSlug: "canonical-store",
    storeDescription: null,
    storeLogoUrl: null,
    storeBannerUrl: null,
    supportEmail: null,
    supportPhone: null,
    returnPolicy: null,
    supportPolicy: null,
  });
});

test("Product writes contain confirmed fields, preserve zero, and do not generate IDs", () => {
  const request = mapProductWriteRequest(sellerProduct());
  assert.equal(request.productName, "Schema Product");
  assert.equal(request.brand, "Text brand");
  assert.equal(request.variants[0].price, 0);
  assert.equal(request.variants[0].costPrice, 0);
  assert.equal(request.variants[0].stockQuantity, 0);
  assert.deepEqual(request.information.productDetails, {
    items: [{ label: "Material", value: "Steel" }],
  });
  assert.equal("productInfo" in request, false);
  assert.equal("status" in request, false);
  assert.equal("storeId" in request, false);
  assert.equal("productId" in request, false);
  assert.equal("variantId" in request.variants[0], false);
  assert.equal("images" in request, false);
  assert.equal("createdDate" in request, false);
  assert.equal("rowVersion" in request.variants[0], false);
});

test("Seller Product validation enforces schema limits and uniqueness", () => {
  const valid = validateSellerProduct(sellerProduct());
  assert.equal(valid.variants[0].price, 0);
  assert.equal(valid.images[0].displayOrder, 1);

  assert.throws(
    () =>
      validateSellerProduct(
        sellerProduct({
          productCondition: "USED_GOOD",
          conditionDescription: "",
        })
      ),
    /CONDITION_DESCRIPTION_REQUIRED/
  );
  assert.throws(
    () =>
      validateSellerProduct(
        sellerProduct({
          variants: [
            sellerProduct().variants[0],
            { ...sellerProduct().variants[0], sku: "SKU-2" },
          ],
        })
      ),
    /DUPLICATE_VARIANT_COMBINATION/
  );
  assert.throws(
    () =>
      validateSellerProduct(
        sellerProduct({
          images: [
            sellerProduct().images[0],
            {
              ...sellerProduct().images[0],
              imageUrl: "https://example.test/second.jpg",
            },
          ],
        })
      ),
    /INVALID_IMAGES/
  );
});

test("pagination and confirmed filters remain backend-owned", () => {
  const page = mapProductPageDto({
    Page: 2,
    PageSize: 25,
    TotalCount: 1001,
    TotalPages: 41,
    Products: [],
  });
  assert.deepEqual(mapPaginationDto(page, []), {
    page: 2,
    pageSize: 25,
    totalCount: 1001,
    totalPages: 41,
    hasMore: true,
    nextCursor: null,
  });

  assert.deepEqual(
    mapProductQueryParams({
      page: 3,
      pageSize: 20,
      search: "watch",
      categoryId: 1,
      storeId: 4,
      minPrice: 0,
      maxPrice: 100,
      sortBy: "price-low",
    }),
    {
      page: 3,
      pageSize: 20,
      search: "watch",
      categoryId: 1,
      storeId: 4,
      minimumPrice: 0,
      maximumPrice: 100,
      sort: "price_asc",
    }
  );

  assert.deepEqual(
    mapProductQueryParams({
      page: 1,
      filters: {
        searchTerm: "laptop",
        categoryId: "2",
        brand: "Shopera",
        conditions: "NEW",
        minPrice: "10",
        maxPrice: "100",
        inStock: true,
      },
      sortBy: "name-asc",
    }),
    {
      page: 1,
      search: "laptop",
      categoryId: "2",
      brand: "Shopera",
      condition: "NEW",
      minimumPrice: "10",
      maximumPrice: "100",
      inStockOnly: true,
      sort: "name_asc",
    }
  );
});

test("unconfigured Store Stories exposes a typed error and no silent API fallback", async () => {
  await assert.rejects(
    () => storeHttpAdapter.listStoreStories(),
    (error) =>
      error.code === "BACKEND_NOT_CONFIGURED" &&
      error.name === "BackendNotConfiguredError"
  );
});

test("confirmed Product routes and methods match the ASP.NET controllers", async () => {
  const requests = [];
  const productResponse = {
    productId: 7,
    productName: "Backend Product",
    productCondition: "NEW",
    categoryId: 3,
    information: {
      productDetails: { items: [] },
      specifications: { groups: [] },
      whatsInTheBox: { items: [] },
    },
    images: [],
    variants: [
      {
        variantId: 11,
        sku: "BACKEND-11",
        price: 10,
        costPrice: 5,
        stockQuantity: 4,
        status: "ACTIVE",
        rowVersion: "AQ==",
      },
    ],
  };

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    const jsonResponse = (body) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    if (url.startsWith("/api/products/7/related")) {
      return jsonResponse({ items: [] });
    }
    if (url === "/api/products/7") {
      return jsonResponse(productResponse);
    }
    if (url.startsWith("/api/products")) {
      return jsonResponse({ items: [] });
    }
    if (url === "/api/categories") {
      return jsonResponse([]);
    }
    if (url.startsWith("/api/seller/products?")) {
      return jsonResponse({ items: [] });
    }
    if (url === "/api/seller/products/7" && options.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    if (url === "/api/seller/products/7" && options.method === "PATCH") {
      return jsonResponse(productResponse);
    }
    if (url === "/api/seller/products/7" && options.method === "GET") {
      return jsonResponse(productResponse);
    }
    if (url === "/api/seller/products" && options.method === "POST") {
      return jsonResponse(productResponse);
    }
    if (
      url === "/api/seller/products/7/variants/11" &&
      options.method === "PATCH"
    ) {
      return jsonResponse(productResponse);
    }

    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  await productHttpAdapter.listProducts({ page: 1, pageSize: 20 });
  await productHttpAdapter.getProduct(7);
  await productHttpAdapter.getRelatedProducts(7);
  await productHttpAdapter.listCategories();
  await productHttpAdapter.listSellerProducts({
    page: 1,
    pageSize: 20,
    status: "ACTIVE",
  });
  await productHttpAdapter.getSellerProduct(7);
  await productHttpAdapter.createSellerProduct(sellerProduct());
  await productHttpAdapter.updateSellerProduct(7, sellerProduct());
  await productHttpAdapter.archiveSellerProduct(7);
  const updatedVariant = await productHttpAdapter.updateSellerInventory(
    7,
    11,
    4,
    "AQ=="
  );

  assert.equal(updatedVariant.variantId, 11);
  assert.deepEqual(
    requests.map(({ url, options }) => [options.method, url]),
    [
      ["GET", "/api/products?page=1&pageSize=20&sort=newest"],
      ["GET", "/api/products/7"],
      ["GET", "/api/products/7/related?sort=newest"],
      ["GET", "/api/categories"],
      ["GET", "/api/seller/products?page=1&pageSize=20&status=ACTIVE"],
      ["GET", "/api/seller/products/7"],
      ["POST", "/api/seller/products"],
      ["PATCH", "/api/seller/products/7"],
      ["DELETE", "/api/seller/products/7"],
      ["PATCH", "/api/seller/products/7/variants/11"],
    ]
  );
  assert.deepEqual(JSON.parse(requests[9].options.body), {
    stockQuantity: 4,
    rowVersion: "AQ==",
  });
});

test("confirmed Store routes preserve their backend contracts", async () => {
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    const jsonResponse = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });

    if (url === "/api/seller/store" && options.method === "GET") {
      return jsonResponse(
        {
          code: "SELLER_STORE_NOT_FOUND",
          message: "Seller Store was not found.",
        },
        404
      );
    }

    if (url === "/api/seller/store" && options.method === "POST") {
      return jsonResponse({
        submissionId: 41,
        store: {
          StoreID: 7,
          StoreName: "Created Store",
        },
      });
    }

    if (
      url === "/api/seller/store/resubmit" &&
      options.method === "POST"
    ) {
      return jsonResponse({
        submissionId: 42,
        store: {
          StoreID: 7,
          StoreName: "Resubmitted Store",
        },
      });
    }

    if (url === "/api/seller/store" && options.method === "PATCH") {
      return jsonResponse({
        StoreID: 7,
        StoreName: "Updated Store",
      });
    }

    if (
      url === "/api/seller/store/status" &&
      options.method === "PATCH"
    ) {
      return jsonResponse({
        StoreID: 7,
        StoreName: "Created Store",
        StoreStatus: JSON.parse(options.body).storeStatus,
      });
    }

    if (url.startsWith("/api/stores/7/products")) {
      return jsonResponse({ items: [] });
    }

    if (url === "/api/stores/7") {
      return jsonResponse({ StoreID: 7, StoreName: "Public Store" });
    }

    if (url === "/api/stores/by-slug/public-store") {
      return jsonResponse({ StoreID: 7, StoreName: "Public Store" });
    }

    if (url.startsWith("/api/stores")) {
      return jsonResponse({ items: [] });
    }

    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  assert.equal(await storeHttpAdapter.getSellerStore(), null);

  assert.equal(
    (await storeHttpAdapter.createSellerStore({ storeName: "Created Store" }))
      .storeId,
    7
  );
  assert.equal(
    (await storeHttpAdapter.resubmitSellerStore()).storeName,
    "Resubmitted Store"
  );
  assert.equal(
    (await storeHttpAdapter.updateSellerStore({ storeName: "Updated Store" }))
      .storeName,
    "Updated Store"
  );
  assert.equal(
    (await storeHttpAdapter.updateSellerStoreStatus("INACTIVE")).storeStatus,
    "INACTIVE"
  );

  await storeHttpAdapter.listPublicStores();
  await storeHttpAdapter.getPublicStore(7);
  await storeHttpAdapter.getPublicStoreBySlug("public-store");
  await storeHttpAdapter.listPublicStoreProducts(7);

  const requestContracts = requests.map(({ url, options }) => [
    options.method,
    url,
  ]);

  assert.deepEqual(requestContracts, [
    ["GET", "/api/seller/store"],
    ["POST", "/api/seller/store"],
    ["POST", "/api/seller/store/resubmit"],
    ["PATCH", "/api/seller/store"],
    ["PATCH", "/api/seller/store/status"],
    ["GET", "/api/stores"],
    ["GET", "/api/stores/7"],
    ["GET", "/api/stores/by-slug/public-store"],
    ["GET", "/api/stores/7/products?sort=newest"],
  ]);

  assert.deepEqual(JSON.parse(requests[4].options.body), {
    storeStatus: "INACTIVE",
  });
});

test("Seller Store status service allows only ACTIVE and INACTIVE", async () => {
  const sellerService = await read("src/services/sellerService.js");
  const statusContract = sellerService.slice(
    sellerService.indexOf("export const updateSellerStoreStatus"),
    sellerService.indexOf("export const getSellerStorePreview")
  );

  assert.match(statusContract, /"ACTIVE"/);
  assert.match(statusContract, /"INACTIVE"/);
  assert.doesNotMatch(statusContract, /"CLOSED"/);
});

test("runtime Product/Store seeds and browser database ownership remain absent", async () => {
  const removedFiles = [
    "src/data/collectionData.js",
    "src/data/seller/sellerProductsData.js",
    "src/data/seller/sellerInventoryData.js",
    "src/data/seller/sellerStoreProfileData.js",
    "src/data/seller/sellerDashboardData.js",
  ];
  for (const relativePath of removedFiles) {
    await assert.rejects(access(path.join(root, relativePath)));
  }

  const sellerStoreSource = await read("src/services/sellerStoreService.js");
  assert.doesNotMatch(sellerStoreSource, /read\("products"|write\("products"/);
  assert.doesNotMatch(sellerStoreSource, /read\("profile"|write\("profile"/);
  assert.doesNotMatch(sellerStoreSource, /crypto\.randomUUID/);
});

test("collection route is retained as an honest unsupported state", async () => {
  const collectionService = await read("src/services/collectionService.js");
  const productService = await read("src/services/productService.js");
  const endpoints = await read("src/config/apiEndpoints.js");
  assert.match(collectionService, /no Collection table/i);
  assert.match(productService, /COLLECTIONS_NOT_SUPPORTED_BY_SCHEMA/);
  assert.doesNotMatch(endpoints, /VITE_PRODUCT_COLLECTIONS_ENDPOINT/);
  assert.match(endpoints, /VITE_PRODUCT_BRANDS_ENDPOINT/);
  assert.match(endpoints, /\/api\/products\/brands/);
});

test("inventory concurrency sends opaque rowVersion and presents HTTP 409", async () => {
  const adapter = await read("src/services/adapters/productHttpAdapter.js");
  const inventoryPage = await read("src/pages/seller/SellerInventoryPage.jsx");
  assert.match(adapter, /\{ stockQuantity, rowVersion \}/);
  assert.doesNotMatch(adapter, /rowVersion\s*[+]{2}|rowVersion\s*\+\s*1/);
  assert.match(inventoryPage, /error\?\.status === 409/);
  assert.match(inventoryPage, /inventory\.staleStockConflict/);
});

test("Buyer product surfaces cannot reference confidential cost", async () => {
  const relativeFiles = [
    ...(await sourceFiles("src/pages/buyer")),
    ...(await sourceFiles("src/components/product")),
    "src/services/productService.js",
    "src/services/wishlistService.js",
  ];
  const combined = (await Promise.all(relativeFiles.map(read))).join("\n");
  assert.doesNotMatch(combined, /costPrice|CostPrice/);
});

test("Product and Store UI owns no HTTP calls or DTO mapping", async () => {
  const relativeFiles = [
    ...(await sourceFiles("src/pages/buyer")),
    ...(await sourceFiles("src/pages/seller")),
    ...(await sourceFiles("src/components/product")),
    ...(await sourceFiles("src/components/seller")),
  ];
  const combined = (await Promise.all(relativeFiles.map(read))).join("\n");
  assert.doesNotMatch(combined, /\bfetch\s*\(|\baxiosClient\b|https?:\/\/localhost/);
  assert.doesNotMatch(combined, /\bmapProductDto\b|\bmapStoreDto\b/);
});

test("seller inventory and granular Product edit routes match the backend", async () => {
  const requests = [];
  const productResponse = {
    productId: 7,
    productName: "Backend Product",
    productCondition: "NEW",
    status: "DRAFT",
    categoryId: 3,
    information: {
      productDetails: { items: [] },
      specifications: { groups: [] },
      whatsInTheBox: { items: [] },
    },
    images: [
      {
        imageId: 21,
        imageUrl: "https://example.test/product.jpg",
        displayOrder: 1,
        isPrimary: true,
      },
    ],
    variants: [
      {
        variantId: 11,
        sku: "BACKEND-11",
        price: 10,
        costPrice: 5,
        stockQuantity: 4,
        status: "ACTIVE",
        rowVersion: "AQ==",
      },
    ],
  };

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    const body = url.startsWith("/api/seller/products/inventory")
      ? {
          page: 2,
          pageSize: 5,
          totalCount: 6,
          totalPages: 2,
          items: [
            {
              productId: 7,
              productName: "Backend Product",
              categoryId: 3,
              categoryName: "Category",
              primaryImageUrl: "https://example.test/product.jpg",
              variantId: 11,
              sku: "BACKEND-11",
              stockQuantity: 4,
              status: "ACTIVE",
              rowVersion: "AQ==",
            },
          ],
        }
      : productResponse;

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const inventory = await productHttpAdapter.listSellerInventory({
    page: 2,
    pageSize: 5,
    search: "backend",
    categoryId: 3,
    stockStatus: "LOW_STOCK",
  });
  await productHttpAdapter.upsertSellerProductInfo(7, {
    productDetails: { items: [] },
    specifications: { groups: [] },
    whatsInTheBox: { items: [] },
  });
  await productHttpAdapter.addSellerProductImage(7, {
    file: createTestImageFile("new.jpg"),
    altText: "New image",
    displayOrder: 2,
    isPrimary: false,
  });
  await productHttpAdapter.updateSellerProductImage(7, 21, {
    altText: "",
    displayOrder: 1,
    isPrimary: true,
  });
  await productHttpAdapter.deleteSellerProductImage(7, 21);
  await productHttpAdapter.addSellerProductVariant(7, {
    sku: "BACKEND-12",
    price: 12,
    costPrice: 6,
    stockQuantity: 2,
    status: "ACTIVE",
  });
  await productHttpAdapter.updateSellerProductVariant(7, 11, {
    sku: "BACKEND-11",
    variantName: "",
    size: "",
    color: "Black",
    storageCapacity: "",
    price: 10,
    costPrice: 5,
    stockQuantity: 4,
    status: "ACTIVE",
    rowVersion: "AQ==",
  });
  await productHttpAdapter.deleteSellerProductVariant(7, 11, "AQ==");
  await productHttpAdapter.updateSellerProductStatus(7, "ACTIVE");

  assert.equal(inventory.items[0].variantId, 11);
  assert.deepEqual(
    requests.map(({ url, options }) => [options.method, url]),
    [
      [
        "GET",
        "/api/seller/products/inventory?page=2&pageSize=5&search=backend&categoryId=3&stockStatus=LOW_STOCK",
      ],
      ["PUT", "/api/seller/products/7/info"],
      ["POST", "/api/seller/products/7/images"],
      ["PATCH", "/api/seller/products/7/images/21"],
      ["DELETE", "/api/seller/products/7/images/21"],
      ["POST", "/api/seller/products/7/variants"],
      ["PATCH", "/api/seller/products/7/variants/11"],
      ["DELETE", "/api/seller/products/7/variants/11"],
      ["PATCH", "/api/seller/products/7/status"],
    ]
  );
  assert.ok(requests[2].options.body instanceof FormData);
  assert.equal(requests[2].options.body.get("File").name, "new.jpg");
  assert.equal(requests[2].options.body.get("AltText"), "New image");
  assert.equal(requests[2].options.body.get("DisplayOrder"), "2");
  assert.equal(requests[2].options.body.get("IsPrimary"), "false");
  assert.ok(requests[3].options.body instanceof FormData);
  assert.equal(requests[3].options.body.has("File"), false);
  assert.equal(requests[3].options.body.get("DisplayOrder"), "1");
  assert.deepEqual(JSON.parse(requests[7].options.body), {
    rowVersion: "AQ==",
  });
  assert.deepEqual(JSON.parse(requests[8].options.body), {
    status: "ACTIVE",
  });
});
