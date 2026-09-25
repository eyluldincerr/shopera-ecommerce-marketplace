import {
  PRODUCT_CONDITION_CODES,
  PRODUCT_STATUS,
  PRODUCT_STATUS_CODES,
  STOCK_STATUS,
  getStockStatus,
} from "../constants/marketplace.js";
import productHttpAdapter from "./adapters/productHttpAdapter.js";
import sellerAnalyticsHttpAdapter from "./adapters/sellerAnalyticsHttpAdapter.js";
import storeHttpAdapter from "./adapters/storeHttpAdapter.js";
import {
  removeDeprecatedSellerProductStoreKeys,
  sellerStoreService,
  subscribeSellerData as subscribeProtectedSellerData,
} from "./sellerStoreService.js";
import {
  listSellerOrders,
  updateOrderStatus,
} from "./sellerOrderService.js";
import { getCurrentSession } from "./authService.js";
import {
  getNotifications as getBackendNotifications,
  getUnreadCount as getBackendUnreadNotificationCount,
  markAllAsRead as markAllBackendNotificationsAsRead,
  markAsRead as markBackendNotificationAsRead,
} from "./notificationService.js";
import {
  STORE_MEDIA_URL_MAX_LENGTH,
  isValidStoreMediaUrlOrEmpty,
} from "../utils/storeMediaEditor.js";
import {
  buildSellerDashboardStatistics,
  buildSellerWeeklySales,
  getSellerDashboardApprovalState,
  getSellerDashboardOrders,
  validateSellerDashboardLayout,
} from "../utils/sellerDashboard.js";

const backendListeners = new Set();

const VARIANT_STATUS_CODES = new Set([
  PRODUCT_STATUS.ACTIVE,
  PRODUCT_STATUS.INACTIVE,
  PRODUCT_STATUS.OUT_OF_STOCK,
  PRODUCT_STATUS.DELETED,
]);

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const STORE_PROFILE_STATUS_KEYS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  ACTIVE: "active",
  INACTIVE: "inactive",
  CLOSED: "closed",
  NOT_SUBMITTED: "notSubmitted",
  NOTSUBMITTED: "notSubmitted",
};

const getStoreProfileStatusKey = (
  status,
  fallbackStatus
) => {
  const normalizedStatus = String(
    status || fallbackStatus
  )
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();

  const statusKey =
    STORE_PROFILE_STATUS_KEYS[normalizedStatus] ||
    "unknown";

  return `storeProfile.status.${statusKey}`;
};

const prepareBackendSellerData = () => {
  removeDeprecatedSellerProductStoreKeys();
};

const notifyBackendDataChanged = () => {
  backendListeners.forEach((listener) => listener());
};

export const subscribeSellerData = (listener) => {
  backendListeners.add(listener);

  const unsubscribeProtected =
    subscribeProtectedSellerData(listener);

  return () => {
    backendListeners.delete(listener);
    unsubscribeProtected();
  };
};

const toPageOptions = (options = {}) => ({
  page: options.page || 1,
  pageSize: options.pageSize || 10,
  cursor: options.cursor,
  search: options.search,
  filters: options.filters,
  status: options.status,
  sortBy: options.sortBy,
  sortField: options.sortField,
  sortDirection: options.sortDirection,
  signal: options.signal,
});

const toSellerProduct = (product) => {
  const variants = product.variants || [];
  const images = product.images || [];
  const productName = String(product.productName || "");
  const stockFromVariants = variants.reduce(
    (total, variant) =>
      total + Number(variant.stockQuantity ?? 0),
    0
  );
  const prices = variants
    .map((variant) => variant.price)
    .filter((price) => price !== null && Number.isFinite(Number(price)));
  const variantCount = Number(
    product.variantCount ?? variants.length
  );

  return {
    ...product,
    id: product.productId,
    name: productName,
    condition: product.productCondition,
    category:
      product.categoryName ||
      (product.categoryId == null
        ? ""
        : String(product.categoryId)),
    image:
      product.primaryImage ||
      images.find((image) => image.isPrimary)
        ?.imageUrl ||
      images[0]?.imageUrl ||
      "",
    symbol:
      productName.charAt(0).toUpperCase() || "P",
    stock: Number(product.totalStock ?? stockFromVariants),
    price:
      product.minPrice ??
      (prices.length ? Math.min(...prices.map(Number)) : null),
    sku:
      variants.length === 1
        ? variants[0].sku
        : `${variantCount} variants`,
    variantCount,
    rating: product.rating ?? null,
    reviewCount: Number(product.reviewCount ?? 0),
  };
};

export const getSellerProductOptions = async (
  options = {}
) => {
  prepareBackendSellerData();

  const categories =
    await productHttpAdapter.listCategories(options);

  return {
    categories,
  };
};

export const getSellerStories = async (
  options = {}
) => {
  prepareBackendSellerData();

  const store =
    await storeHttpAdapter.getSellerStore(options);

  return store
    ? [
        {
          id: store.storeId,
          sellerName: store.storeName,
          sellerImage: store.storeLogoUrl || "",
          description: store.storeDescription || "",
        },
      ]
    : [];
};

export const getSellerProducts = async (
  options = {}
) => {
  prepareBackendSellerData();

  const page =
    await productHttpAdapter.listSellerProducts(
      toPageOptions(options)
    );

  return {
    ...page,
    items: page.items.map(toSellerProduct),
  };
};

export const getSellerProduct = async (
  productId,
  options = {}
) => {
  prepareBackendSellerData();

  const product =
    await productHttpAdapter.getSellerProduct(
      productId,
      options
    );

  return toSellerProduct(product);
};

export const getSellerInventory = async (
  options = {}
) => {
  prepareBackendSellerData();

  const [store, page, categories] = await Promise.all([
    storeHttpAdapter.getSellerStore(options),
    productHttpAdapter.listSellerInventory({
      page: options.page || 1,
      pageSize: options.pageSize || 10,
      search: options.search,
      categoryId:
        options.categoryId === "ALL"
          ? undefined
          : options.categoryId,
      stockStatus: options.stockStatus,
      signal: options.signal,
    }),
    productHttpAdapter.listCategories(options),
  ]);

  const products = page.items.map(
    toSellerInventoryProduct
  );

  return {
    hasStore: Boolean(store),
    products,
    categories,
    pagination: {
      page: page.page,
      pageSize: page.pageSize,
      totalCount: page.totalCount,
      totalPages:
        page.totalPages ||
        Math.max(
          1,
          Math.ceil(
            page.totalCount / Math.max(1, page.pageSize)
          )
        ),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    },
    statistics: [],
    lowStockProducts: products
      .filter(
        (product) =>
          product.stockStatus ===
          STOCK_STATUS.LOW_STOCK
      )
      .slice(0, 3),
    topRatedProducts: [],
  };
};

function toSellerInventoryProduct(item = {}) {
  const stockStatus = getStockStatus(
    item.stockQuantity
  );
  const productName = String(
    item.productName || ""
  );

  return {
    id: item.variantId,
    productId: item.productId,
    variantId: item.variantId,
    name: item.variantName
      ? `${productName} — ${item.variantName}`
      : productName,
    sku: item.sku || "",
    categoryId: item.categoryId,
    category: item.categoryName || "",
    stock: Number(item.stockQuantity ?? 0),
    stockStatus,
    status: item.status,
    statusKey:
      stockStatus === STOCK_STATUS.OUT_OF_STOCK
        ? "inventory.status.outOfStock"
        : stockStatus === STOCK_STATUS.LOW_STOCK
          ? "inventory.status.lowStock"
          : "inventory.status.inStock",
    symbol:
      productName.charAt(0).toUpperCase() || "P",
    image: item.primaryImage || "",
    rowVersion: item.rowVersion,
  };
}

export const getSellerDashboardData = async (
  options = {}
) => {
  prepareBackendSellerData();

  const store =
    await storeHttpAdapter.getSellerStore(options);

  if (!store) {
    return {
      seller: {
        storeName: "",
        approvalStatus: null,
        storeStatus: null,
      },
      hasStore: false,
      statistics: [],
      weeklySales: [],
      recentOrders: [],
      lowStockProducts: [],
      topRatedProducts: [],
      approvalState: null,
    };
  }

  const [productPage, inventoryPage, orderResult] =
    await Promise.all([
      getSellerProducts({
        ...options,
        page: 1,
        pageSize: 100,
      }),
      productHttpAdapter.listSellerInventory({
        page: 1,
        pageSize: 100,
        signal: options.signal,
      }),
      listSellerOrders(options),
    ]);
  const products = Array.isArray(productPage?.items)
    ? productPage.items
    : [];
  const inventoryItems = Array.isArray(
    inventoryPage?.items
  )
    ? inventoryPage.items.map(toSellerInventoryProduct)
    : [];
  const orders = getSellerDashboardOrders(orderResult);
  const approvalStatus = String(
    store.approvalStatus || ""
  ).toUpperCase();
  const metricOrders =
    approvalStatus === "APPROVED" ? orders : [];
  const statistics = buildSellerDashboardStatistics({
    totalProducts: Number(productPage?.totalCount ?? 0),
    orders: metricOrders,
    currencyCode: "EUR",
  });

  return {
    seller: {
      storeName: store?.storeName || "",
      approvalStatus: store.approvalStatus || null,
      storeStatus: store.storeStatus || null,
    },
    hasStore: true,
    statistics,
    recentOrders: metricOrders.slice(0, 5),
    lowStockProducts: inventoryItems
      .filter(
        (product) =>
          product.stockStatus ===
          STOCK_STATUS.LOW_STOCK
      )
      .slice(0, 3),
    topRatedProducts: products
      .filter(
        (product) =>
          product.reviewCount > 0 &&
          product.rating !== null &&
          Number.isFinite(Number(product.rating))
      )
      .sort((left, right) => {
        const ratingDifference =
          Number(right.rating) - Number(left.rating);

        if (ratingDifference !== 0) {
          return ratingDifference;
        }

        return (
          Number(right.reviewCount || 0) -
          Number(left.reviewCount || 0)
        );
      })
      .slice(0, 5),
    weeklySales: buildSellerWeeklySales(
      metricOrders,
      options.now || new Date(),
      statistics.find(
        (statistic) => statistic.id === "revenue"
      )?.currencyCode || "EUR"
    ),
    approvalState:
      getSellerDashboardApprovalState(store),
  };
};

export const getSellerDashboardLayout = async () => {
  const key = sellerStoreService.getPreferenceKey(
    "dashboard-layout"
  );

  const saved = localStorage.getItem(key);

  if (!saved) {
    return validateSellerDashboardLayout(null);
  }

  try {
    return validateSellerDashboardLayout(
      JSON.parse(saved)
    );
  } catch {
    return validateSellerDashboardLayout(null);
  }
};

export const saveSellerDashboardLayout = async (
  layout
) => {
  const validLayout =
    validateSellerDashboardLayout(layout);

  localStorage.setItem(
    sellerStoreService.getPreferenceKey(
      "dashboard-layout"
    ),
    JSON.stringify(validLayout)
  );

  return validLayout;
};

export const resetSellerDashboardLayout =
  async () => {
    localStorage.removeItem(
      sellerStoreService.getPreferenceKey(
        "dashboard-layout"
      )
    );

    return validateSellerDashboardLayout(null);
  };

export const getSellerOrders = async () =>
  listSellerOrders();

export const getSellerAnalytics = async (
  options = {}
) => {
  prepareBackendSellerData();
  return sellerAnalyticsHttpAdapter.getAnalytics(options);
};

export const getSellerStoreProfile = async (
  options = {}
) => {
  prepareBackendSellerData();

  const sellerFullName =
    getCurrentSession()?.fullName || "";

  const store =
    await storeHttpAdapter.getSellerStore(options);

  if (!store) {
    return {
      hasStore: false,

      sellerUser: {
        fullName: sellerFullName,
      },

      store: {
        id: null,
        storeId: null,
        storeName: "",
        storeSlug: "",
        logoUrl: "",
        bannerUrl: "",
        description: "",
        supportEmail: "",
        supportPhone: "",
        approvalStatus: null,
        storeStatus: null,
        latestDecisionNote: null,
        approvalStatusKey:
          "storeProfile.status.notSubmitted",
        storeStatusKey:
          "storeProfile.status.inactive",
      },

      policies: {
        support: "",
        return: "",
      },

      overview: [],
    };
  }

  return {
    hasStore: true,

    sellerUser: {
      fullName: sellerFullName,
    },

    store: {
      ...store,
      id: store.storeId,
      storeId: store.storeId,
      storeName: store.storeName || "",
      storeSlug: store.storeSlug || "",
      logoUrl: store.storeLogoUrl || "",
      bannerUrl: store.storeBannerUrl || "",
      description: store.storeDescription || "",
      supportEmail: store.supportEmail || "",
      supportPhone: store.supportPhone || "",
      latestDecisionNote:
        store.latestDecisionNote || null,

      approvalStatusKey: getStoreProfileStatusKey(
        store.approvalStatus,
        "NOT_SUBMITTED"
      ),

      storeStatusKey: getStoreProfileStatusKey(
        store.storeStatus,
        "INACTIVE"
      ),
    },

    policies: {
      support: store.supportPolicy || "",
      return: store.returnPolicy || "",
    },

    overview: [
      {
        id: "visible-products",
        icon: "products",
        color: "purple",
        titleKey:
          "storeProfile.visibleProducts",
        value: store.visibleProductCount ?? 0,
        descriptionKey:
          "storeProfile.viewAllProducts",
        route: "/seller/products",
      },
    ],
  };
};

const normalizeVariantInput = (variant) => {
  const sku = String(variant.sku || "").trim();
  const price = Number(variant.price);
  const costPrice = Number(variant.costPrice);
  const stockQuantity = Number(
    variant.stockQuantity
  );

  if (
    !sku ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(costPrice) ||
    costPrice < 0 ||
    !Number.isInteger(stockQuantity) ||
    stockQuantity < 0
  ) {
    throw new Error("INVALID_VARIANT");
  }

  return {
    ...(variant.variantId
      ? {
          variantId: Number(variant.variantId),
        }
      : {}),
    sku,
    variantName:
      String(variant.variantName || "").trim() ||
      null,
    size:
      String(variant.size || "").trim() || null,
    color:
      String(variant.color || "").trim() || null,
    storageCapacity:
      String(
        variant.storageCapacity || ""
      ).trim() || null,
    price,
    costPrice,
    stockQuantity,
    status:
      variant.status || PRODUCT_STATUS.ACTIVE,
  };
};

export const validateSellerProduct = (product) => {
  const productName = String(
    product.productName || ""
  ).trim();

  const variants = (product.variants || []).map(
    normalizeVariantInput
  );

  const skus = variants.map((variant) =>
    variant.sku.toUpperCase()
  );

  const combinations = variants.map((variant) =>
    [
      variant.size,
      variant.color,
      variant.storageCapacity,
    ]
      .map((value) =>
        String(value || "").toUpperCase()
      )
      .join("|")
  );

  const images = (product.images || []).map(
    (image) => ({
      ...(image.imageId
        ? {
            imageId: Number(image.imageId),
          }
        : {}),
      imageUrl: String(image.imageUrl || "").trim(),
      contentType: String(image.contentType || "").trim() || null,
      originalFileName:
        String(image.originalFileName || image.file?.name || "").trim() || null,
      file: image.file || null,
      altText:
        String(image.altText || "").trim() ||
        null,
      displayOrder: Number(image.displayOrder),
      isPrimary: Boolean(image.isPrimary),
    })
  );

  if (!productName || productName.length > 200) {
    throw new Error("PRODUCT_NAME_REQUIRED");
  }

  if (!product.categoryId) {
    throw new Error("CATEGORY_REQUIRED");
  }

  if (
    !PRODUCT_CONDITION_CODES.includes(
      product.productCondition
    ) ||
    !PRODUCT_STATUS_CODES.includes(
      product.status
    ) ||
    String(
      product.shortDescription || ""
    ).length > 500 ||
    String(product.brand || "").length > 100 ||
    String(
      product.modelNumber || ""
    ).length > 100 ||
    String(
      product.conditionDescription || ""
    ).length > 500
  ) {
    throw new Error("PRODUCT_FIELD_TOO_LONG");
  }

  const productInfo = product.productInfo;

  if (
    productInfo &&
    (!Array.isArray(
      productInfo.productDetails?.items
    ) ||
      !Array.isArray(
        productInfo.whatsInTheBox?.items
      ) ||
      !Array.isArray(
        productInfo.specifications?.groups
      ) ||
      productInfo.specifications.groups.some(
        (group) => !Array.isArray(group.items)
      ))
  ) {
    throw new Error("INVALID_PRODUCT_INFO");
  }

  if (
    product.productCondition !== "NEW" &&
    !String(
      product.conditionDescription || ""
    ).trim()
  ) {
    throw new Error(
      "CONDITION_DESCRIPTION_REQUIRED"
    );
  }

  if (!variants.length) {
    throw new Error("VARIANT_REQUIRED");
  }

  if (
    variants.some(
      (variant) =>
        variant.sku.length > 100 ||
        !VARIANT_STATUS_CODES.has(
          variant.status
        ) ||
        String(
          variant.variantName || ""
        ).length > 150 ||
        [
          variant.size,
          variant.color,
          variant.storageCapacity,
        ].some(
          (value) =>
            String(value || "").length > 50
        )
    )
  ) {
    throw new Error("INVALID_VARIANT");
  }

  if (new Set(skus).size !== skus.length) {
    throw new Error("DUPLICATE_VARIANT_SKU");
  }

  if (
    new Set(combinations).size !==
    combinations.length
  ) {
    throw new Error(
      "DUPLICATE_VARIANT_COMBINATION"
    );
  }

  if (
    images.some(
      (image) =>
        (!image.imageId && !image.file) ||
        String(image.altText || "").length > 255 ||
        !Number.isInteger(image.displayOrder) ||
        image.displayOrder < 1
    ) ||
    new Set(
      images.map((image) => image.displayOrder)
    ).size !== images.length ||
    (images.length > 0 &&
      images.filter((image) => image.isPrimary)
        .length !== 1)
  ) {
    throw new Error("INVALID_IMAGES");
  }

  if (
    images.some(
      (image) =>
        image.file &&
        (!PRODUCT_IMAGE_TYPES.has(String(image.file.type || "").toLowerCase()) ||
          Number(image.file.size || 0) <= 0)
    )
  ) {
    throw new Error("IMAGE_TYPE_NOT_SUPPORTED");
  }

  if (
    images.some(
      (image) => image.file && Number(image.file.size) > MAX_PRODUCT_IMAGE_BYTES
    )
  ) {
    throw new Error("IMAGE_FILE_TOO_LARGE");
  }

  if (
    product.status === PRODUCT_STATUS.ACTIVE &&
    !variants.some(
      (variant) =>
        variant.status === PRODUCT_STATUS.ACTIVE ||
        variant.status === PRODUCT_STATUS.OUT_OF_STOCK
    )
  ) {
    throw new Error(
      "SELLABLE_VARIANT_REQUIRED"
    );
  }

  return {
    ...product,
    productName,
    categoryId: Number(product.categoryId),
    storeId:
      product.storeId == null
        ? null
        : Number(product.storeId),
    brand:
      String(product.brand || "").trim() ||
      null,
    modelNumber:
      String(
        product.modelNumber || ""
      ).trim() || null,
    shortDescription:
      String(
        product.shortDescription || ""
      ).trim() || null,
    description:
      String(
        product.description || ""
      ).trim() || null,
    conditionDescription:
      String(
        product.conditionDescription || ""
      ).trim() || null,
    images,
    variants,
  };
};

export const addSellerProduct = async (
  product,
  options = {}
) => {
  prepareBackendSellerData();

  const desired = validateSellerProduct(product);

  if (desired.productId) {
    return updateSellerProduct(desired.productId, desired, options);
  }

  let created =
    await productHttpAdapter.createSellerProduct(
      desired,
      options
    );

  try {
    for (const image of desired.images || []) {
      await productHttpAdapter.addSellerProductImage(
        created.productId,
        image,
        options
      );
    }

    created = await productHttpAdapter.getSellerProduct(
      created.productId,
      options
    );

    if (
      [
        PRODUCT_STATUS.ACTIVE,
        PRODUCT_STATUS.INACTIVE,
      ].includes(desired.status)
    ) {
      created =
        await productHttpAdapter.updateSellerProductStatus(
          created.productId,
          desired.status,
          options
        );
    }
  } catch (error) {
    error.partialProductId = created.productId;
    throw error;
  }

  notifyBackendDataChanged();

  return toSellerProduct(created);
};

const syncSellerProductImages = async (
  productId,
  currentImages,
  desiredImages,
  options
) => {
  const desiredIds = new Set(
    desiredImages
      .map((image) => image.imageId)
      .filter(Boolean)
      .map(Number)
  );

  for (const image of currentImages) {
    if (!desiredIds.has(Number(image.imageId))) {
      await productHttpAdapter.deleteSellerProductImage(
        productId,
        image.imageId,
        options
      );
    }
  }

  const currentById = new Map(
    currentImages.map((image) => [
      Number(image.imageId),
      image,
    ])
  );
  const retained = desiredImages.filter(
    (image) =>
      image.imageId &&
      currentById.has(Number(image.imageId))
  );
  const maximumOrder = Math.max(
    0,
    ...currentImages.map((image) =>
      Number(image.displayOrder || 0)
    ),
    ...desiredImages.map((image) =>
      Number(image.displayOrder || 0)
    )
  );

  // Move retained images out of the final order range first so swaps such as
  // 1 <-> 2 do not violate the unique ProductID/DisplayOrder constraint.
  for (const [index, image] of retained.entries()) {
    const current = currentById.get(
      Number(image.imageId)
    );

    await productHttpAdapter.updateSellerProductImage(
      productId,
      image.imageId,
      {
        ...current,
        displayOrder:
          maximumOrder + 1000 + index + 1,
      },
      options
    );
  }

  for (const image of retained) {
    await productHttpAdapter.updateSellerProductImage(
      productId,
      image.imageId,
      image,
      options
    );
  }

  for (const image of desiredImages.filter(
    (item) => !item.imageId
  )) {
    await productHttpAdapter.addSellerProductImage(
      productId,
      image,
      options
    );
  }
};

const syncSellerProductVariants = async (
  productId,
  currentVariants,
  desiredVariants,
  options
) => {
  const desiredIds = new Set(
    desiredVariants
      .map((variant) => variant.variantId)
      .filter(Boolean)
      .map(Number)
  );

  for (const variant of currentVariants) {
    if (!desiredIds.has(Number(variant.variantId))) {
      await productHttpAdapter.deleteSellerProductVariant(
        productId,
        variant.variantId,
        variant.rowVersion,
        options
      );
    }
  }

  const currentById = new Map(
    currentVariants.map((variant) => [
      Number(variant.variantId),
      variant,
    ])
  );
  const retained = desiredVariants.filter(
    (variant) =>
      variant.variantId &&
      currentById.has(Number(variant.variantId))
  );
  const latestRowVersions = new Map();

  // Free current SKU/option combinations before applying final values. This
  // makes legitimate swaps between two existing variants deterministic.
  for (const [index, desired] of retained.entries()) {
    const current = currentById.get(
      Number(desired.variantId)
    );
    const identityChanged =
      String(current.sku || "") !==
        String(desired.sku || "") ||
      String(current.size || "") !==
        String(desired.size || "") ||
      String(current.color || "") !==
        String(desired.color || "") ||
      String(current.storageCapacity || "") !==
        String(desired.storageCapacity || "");

    if (!identityChanged) {
      latestRowVersions.set(
        Number(desired.variantId),
        current.rowVersion
      );
      continue;
    }

    const temporarySku = [
      "TMP",
      productId,
      desired.variantId,
      Date.now(),
      index,
    ].join("-");

    const response =
      await productHttpAdapter.updateSellerProductVariant(
        productId,
        desired.variantId,
        {
          ...current,
          sku: temporarySku.slice(0, 100),
          size: `TMP-${desired.variantId}-${index}`.slice(
            0,
            50
          ),
          color: "",
          storageCapacity: "",
          rowVersion: current.rowVersion,
        },
        options
      );
    const updated = response.variants.find(
      (variant) =>
        Number(variant.variantId) ===
        Number(desired.variantId)
    );

    latestRowVersions.set(
      Number(desired.variantId),
      updated?.rowVersion || current.rowVersion
    );
  }

  for (const desired of retained) {
    await productHttpAdapter.updateSellerProductVariant(
      productId,
      desired.variantId,
      {
        ...desired,
        rowVersion:
          latestRowVersions.get(
            Number(desired.variantId)
          ) || desired.rowVersion,
      },
      options
    );
  }

  for (const variant of desiredVariants.filter(
    (item) => !item.variantId
  )) {
    await productHttpAdapter.addSellerProductVariant(
      productId,
      variant,
      options
    );
  }
};

export const updateSellerProduct = async (
  productId,
  updatedFields,
  options = {}
) => {
  prepareBackendSellerData();

  const desired = validateSellerProduct(
    updatedFields
  );
  const current =
    await productHttpAdapter.getSellerProduct(
      productId,
      options
    );

  if (desired.status === PRODUCT_STATUS.DELETED) {
    await productHttpAdapter.archiveSellerProduct(
      productId,
      options
    );
    notifyBackendDataChanged();
    return {
      ...toSellerProduct(current),
      status: PRODUCT_STATUS.DELETED,
    };
  }

  await productHttpAdapter.updateSellerProduct(
    productId,
    desired,
    options
  );

  await productHttpAdapter.upsertSellerProductInfo(
    productId,
    desired.productInfo,
    options
  );

  await syncSellerProductImages(
    productId,
    current.images || [],
    desired.images || [],
    options
  );

  await syncSellerProductVariants(
    productId,
    current.variants || [],
    desired.variants || [],
    options
  );

  if (
    [
      PRODUCT_STATUS.DRAFT,
      PRODUCT_STATUS.ACTIVE,
      PRODUCT_STATUS.INACTIVE,
    ].includes(desired.status)
  ) {
    await productHttpAdapter.updateSellerProductStatus(
      productId,
      desired.status,
      options
    );
  }

  const updated =
    await productHttpAdapter.getSellerProduct(
      productId,
      options
    );

  notifyBackendDataChanged();

  return toSellerProduct(updated);
};

export const updateSellerVariantStock = async (
  productId,
  variantId,
  stockQuantity,
  rowVersion,
  options = {}
) => {
  prepareBackendSellerData();

  const quantity = Number(stockQuantity);

  if (
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    throw new Error("INVALID_STOCK");
  }

  const updated =
    await productHttpAdapter.updateSellerInventory(
      productId,
      variantId,
      quantity,
      rowVersion,
      options
    );

  notifyBackendDataChanged();

  return updated;
};

export const deleteSellerProduct = async (
  productId,
  options = {}
) => {
  prepareBackendSellerData();

  const result =
    await productHttpAdapter.archiveSellerProduct(
      productId,
      options
    );

  notifyBackendDataChanged();

  return result;
};

export const updateSellerStoreProfile = async (
  updatedFields,
  options = {}
) => {
  prepareBackendSellerData();

  const input = {
    storeName: updatedFields.storeName,
    storeSlug: updatedFields.storeSlug,

    storeDescription:
      updatedFields.storeDescription ??
      updatedFields.description,

    storeLogoUrl:
      updatedFields.storeLogoUrl ??
      updatedFields.logoUrl,

    storeBannerUrl:
      updatedFields.storeBannerUrl ??
      updatedFields.bannerUrl,

    supportEmail: updatedFields.supportEmail,
    supportPhone: updatedFields.supportPhone,

    returnPolicy:
      updatedFields.returnPolicy ??
      updatedFields.policies?.return,

    supportPolicy:
      updatedFields.supportPolicy ??
      updatedFields.policies?.support,
  };

  if (
    !String(input.storeName || "").trim() ||
    String(input.storeName).length > 150 ||
    String(input.storeSlug || "").length > 150 ||
    String(
      input.storeDescription || ""
    ).length > 1000 ||
    String(input.storeLogoUrl || "").length >
      STORE_MEDIA_URL_MAX_LENGTH ||
    String(
      input.storeBannerUrl || ""
    ).length > STORE_MEDIA_URL_MAX_LENGTH ||
    !isValidStoreMediaUrlOrEmpty(
      input.storeLogoUrl
    ) ||
    !isValidStoreMediaUrlOrEmpty(
      input.storeBannerUrl
    ) ||
    String(input.supportEmail || "").length >
      255 ||
    String(input.supportPhone || "").length >
      30
  ) {
    throw new Error("INVALID_STORE");
  }

  const existing =
    await storeHttpAdapter.getSellerStore(options);

  const store = existing
    ? await storeHttpAdapter.updateSellerStore(
        input,
        options
      )
    : await storeHttpAdapter.createSellerStore(
        input,
        options
      );

  notifyBackendDataChanged();

  return store;
};

export const resubmitSellerStore = async (
  options = {}
) => {
  prepareBackendSellerData();

  const store =
    await storeHttpAdapter.resubmitSellerStore(
      options
    );

  notifyBackendDataChanged();

  return store;
};

export const updateSellerStoreStatus = async (
  storeStatus,
  options = {}
) => {
  prepareBackendSellerData();

  const normalizedStatus = String(
    storeStatus || ""
  )
    .trim()
    .toUpperCase();

  const allowedStatuses = [
    "ACTIVE",
    "INACTIVE",
  ];

  if (
    !allowedStatuses.includes(
      normalizedStatus
    )
  ) {
    throw new Error(
      "INVALID_STORE_STATUS"
    );
  }

  const store =
    await storeHttpAdapter.updateSellerStoreStatus(
      normalizedStatus,
      options
    );

  notifyBackendDataChanged();

  return store;
};

export const getSellerStorePreview = async (
  options = {}
) => {
  const profile =
    await getSellerStoreProfile(options);

  if (!profile.hasStore) {
    return {
      ...profile,
      store: null,
      products: [],
    };
  }

  const page = await getSellerProducts({
    ...options,
    page: 1,
    pageSize: 12,
  });

  return {
    ...profile,

    products: page.items.map((product) => ({
      productId: product.productId,
      variantId: null,
      name: product.name,
      imageUrl: product.image,
      price: product.price,
      condition: product.condition || "NEW",
      rating: product.rating,
      stockQuantity: product.stock,
    })),
  };
};

export const updateSellerOrder = async (
  orderId,
  updatedFields
) =>
  updateOrderStatus(
    orderId,
    updatedFields.status
  );

export const getSellerNotificationsData = async () => {
  const notifications = await getBackendNotifications({ asArray: true });

  return notifications.map((notification) => ({
    ...notification,
    id: notification.notificationId,
    type: getSellerNotificationType(notification.notificationType),
  }));
};

export const markAllSellerNotificationsAsRead = async () => {
  const notifications = await markAllBackendNotificationsAsRead();
  return notifications.map((notification) => ({
    ...notification,
    id: notification.notificationId,
    type: getSellerNotificationType(notification.notificationType),
  }));
};

export const getSellerNotificationFilters = async () => [
  { id: "all", labelKey: "notifications.filters.all" },
  { id: "order", labelKey: "notifications.filters.orders" },
  { id: "review", labelKey: "notifications.filters.reviews" },
  { id: "inventory", labelKey: "notifications.filters.inventory" },
  { id: "other", labelKey: "notifications.filters.other" },
];

export const getSellerUnreadNotificationCount = async () =>
  getBackendUnreadNotificationCount();

export const markSellerNotificationAsRead = async (notificationId) =>
  markBackendNotificationAsRead(notificationId);

const getSellerNotificationType = (notificationType) => {
  const normalized = String(notificationType || "").trim().toUpperCase();

  if (normalized === "NEW_ORDER" || normalized === "ORDER_CANCELLED") {
    return "order";
  }

  if (normalized === "NEW_REVIEW") {
    return "review";
  }

  if (normalized.includes("STOCK") || normalized.includes("INVENTORY")) {
    return "inventory";
  }

  return "other";
};

const NOTIFICATION_PRESENTATION = Object.freeze({
  order: {
    icon: "O",
    category: "order",
    route: "/seller/orders",
    actionLabelKey: "notifications.actions.viewOrder",
  },
  review: {
    icon: "R",
    category: "review",
    route: "/seller/analytics",
    actionLabelKey: "notifications.actions.viewReview",
  },
  inventory: {
    icon: "I",
    category: "inventory",
    route: "/seller/inventory",
    actionLabelKey: "notifications.actions.viewInventory",
  },
  other: {
    icon: "N",
    category: "other",
    route: null,
    actionLabelKey: "notifications.actions.dismiss",
  },
});

export const getSellerNotificationPresentation = (notification) => {
  const type = notification?.type ||
    getSellerNotificationType(notification?.notificationType);

  return NOTIFICATION_PRESENTATION[type] || NOTIFICATION_PRESENTATION.other;
};

