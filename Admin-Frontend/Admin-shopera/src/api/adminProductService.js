import { getAdminCategoryRecordById } from "./adminCategoryService";
import { getAdminStoreById } from "./adminStoreService";

import {
  operationalProductImages as adminProductImages,
  operationalProductInfo as adminProductInfo,
  operationalProducts as adminProducts,
  operationalProductVariants as adminProductVariants,
} from "../data/operationalProductStore";
import { requireAuthenticatedAdmin } from "../auth/authSession";
import { API_BASE_URL, api } from "./apiClient.js";
import { getAdminPage } from "./adminPageService.js";

const productConditions = [
  "NEW",
  "USED_LIKE_NEW",
  "USED_GOOD",
  "USED_FAIR",
  "REFURBISHED",
];

const variantStatuses = [
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_STOCK",
  "DELETED",
];

const toBackendAssetUrl = (value) => {
  if (!value) return null;
  try {
    return new URL(String(value), `${API_BASE_URL}/`).toString();
  } catch {
    return value;
  }
};

const mapApiProduct = (product) => {
  if (!product) return product;
  const images = Array.isArray(product.images)
    ? product.images.map((image) => ({
        ...image,
        imageUrl: toBackendAssetUrl(image.imageUrl),
      }))
    : product.images;

  return {
    ...product,
    primaryImageUrl: toBackendAssetUrl(product.primaryImageUrl),
    images,
  };
};

const cloneValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(
      cloneValue
    );
  }

  if (
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, nestedValue]) => [
          key,
          cloneValue(nestedValue),
        ]
      )
    );
  }

  return value;
};

const normalizeEnum = (value) => {
  return String(value || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
};

const normalizeProductRecord = (
  product
) => {
  const productCondition =
    normalizeEnum(
      product.productCondition ||
        "NEW"
    );

  if (
    !productConditions.includes(
      productCondition
    )
  ) {
    throw new Error(
      "Invalid product condition."
    );
  }

  const conditionDescription =
    String(
      product.conditionDescription ||
        ""
    ).trim() || null;

  if (
    productCondition !== "NEW" &&
    !conditionDescription
  ) {
    throw new Error(
      "A condition description is required for non-new products."
    );
  }

  return {
    ...cloneValue(product),
    productCondition,
    conditionDescription,
  };
};

const normalizeVariantRecord = (
  variant
) => {
  const status = normalizeEnum(
    variant.status ||
      "ACTIVE"
  );

  const price =
    Number(variant.price);

  const costPrice =
    Number(variant.costPrice);

  const stockQuantity =
    Number(
      variant.stockQuantity
    );

  const rowVersion =
    String(
      variant.rowVersion || ""
    ).trim();

  if (
    !variantStatuses.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid product variant status."
    );
  }

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new Error(
      "Variant price must be zero or greater."
    );
  }

  if (
    !Number.isFinite(
      costPrice
    ) ||
    costPrice < 0
  ) {
    throw new Error(
      "Variant cost price must be zero or greater."
    );
  }

  if (
    !Number.isInteger(
      stockQuantity
    ) ||
    stockQuantity < 0
  ) {
    throw new Error(
      "Variant stock quantity must be a non-negative whole number."
    );
  }

  if (!rowVersion) {
    throw new Error(
      "Variant row version is required."
    );
  }

  return {
    ...cloneValue(variant),
    price,
    costPrice,
    stockQuantity,
    status,
    rowVersion,
  };
};

const getProductRecord = (
  productId
) => {
  return (
    adminProducts.find(
      (product) =>
        Number(
          product.productId
        ) ===
        Number(productId)
    ) || null
  );
};

const getProductInfoRecord = (
  productId
) => {
  return (
    adminProductInfo.find(
      (info) =>
        Number(info.productId) ===
        Number(productId)
    ) || null
  );
};

const getProductImages = (
  productId
) => {
  return adminProductImages
    .filter(
      (image) =>
        Number(image.productId) ===
        Number(productId)
    )
    .sort(
      (
        firstImage,
        secondImage
      ) =>
        Number(
          firstImage.displayOrder
        ) -
        Number(
          secondImage.displayOrder
        )
    )
    .map(cloneValue);
};

const getProductVariants = (
  productId
) => {
  return adminProductVariants
    .filter(
      (variant) =>
        Number(
          variant.productId
        ) ===
        Number(productId)
    )
    .map(
      normalizeVariantRecord
    );
};

const getPrimaryImage = (
  productId
) => {
  const images =
    getProductImages(
      productId
    );

  return (
    images.find(
      (image) =>
        image.isPrimary
    ) ||
    images[0] ||
    null
  );
};

const calculateVariantSummary = (
  variants
) => {
  const prices =
    variants.map(
      (variant) =>
        variant.price
    );

  return {
    variantCount:
      variants.length,

    totalStock:
      variants.reduce(
        (total, variant) =>
          total +
          variant.stockQuantity,
        0
      ),

    minimumPrice:
      prices.length > 0
        ? Math.min(...prices)
        : null,

    maximumPrice:
      prices.length > 0
        ? Math.max(...prices)
        : null,
  };
};

const formatProductDetails = (
  data
) => {
  return (
    (data?.items || [])
      .slice()
      .sort(
        (firstItem, secondItem) =>
          Number(
            firstItem.displayOrder
          ) -
          Number(
            secondItem.displayOrder
          )
      )
      .map((item) =>
        [
          item.title,
          item.description,
        ]
          .filter(Boolean)
          .join(": ")
      )
      .filter(Boolean)
      .join(" ") ||
    "Product details are not available."
  );
};

const formatSpecifications = (
  data
) => {
  return (
    (data?.groups || [])
      .map((group) => {
        const items =
          (group.items || [])
            .slice()
            .sort(
              (
                firstItem,
                secondItem
              ) =>
                Number(
                  firstItem.displayOrder
                ) -
                Number(
                  secondItem.displayOrder
                )
            )
            .map((item) => {
              const value =
                item.unit
                  ? `${item.value} ${item.unit}`
                  : item.value;

              return [
                item.name,
                value,
              ]
                .filter(Boolean)
                .join(": ");
            })
            .filter(Boolean)
            .join(", ");

        return [
          group.groupName,
          items,
        ]
          .filter(Boolean)
          .join(" — ");
      })
      .filter(Boolean)
      .join(" | ") ||
    "Specifications are not available."
  );
};

const formatWhatsInTheBox = (
  data
) => {
  return (
    (data?.items || [])
      .slice()
      .sort(
        (firstItem, secondItem) =>
          Number(
            firstItem.displayOrder
          ) -
          Number(
            secondItem.displayOrder
          )
      )
      .map((item) => {
        const quantity =
          Number(
            item.quantity
          ) > 0
            ? `${item.quantity} × `
            : "";

        const description =
          item.description
            ? ` (${item.description})`
            : "";

        return `${quantity}${
          item.itemName || "Item"
        }${description}`;
      })
      .join(", ") ||
    "Package contents are not available."
  );
};

const createProductInfoView = (
  record
) => {
  if (!record) {
    return null;
  }

  return {
    productInfoId:
      record.productInfoId,

    productId:
      record.productId,

    productDetails:
      formatProductDetails(
        record.productDetails
      ),

    specifications:
      formatSpecifications(
        record.specifications
      ),

    whatsInTheBox:
      formatWhatsInTheBox(
        record.whatsInTheBox
      ),

    productDetailsData:
      cloneValue(
        record.productDetails
      ),

    specificationsData:
      cloneValue(
        record.specifications
      ),

    whatsInTheBoxData:
      cloneValue(
        record.whatsInTheBox
      ),

    warrantyInformation:
      record.warrantyInformation,

    returnPolicy:
      record.returnPolicy,

    careInstructions:
      record.careInstructions,

    additionalInformation:
      record.additionalInformation,

    createdDate:
      record.createdDate,

    updatedDate:
      record.updatedDate,
  };
};

const getProductRelations =
  async (product) => {
    const [store, category] =
      await Promise.all([
        getAdminStoreById(
          product.storeId
        ),
        getAdminCategoryRecordById(
          product.categoryId
        ),
      ]);

    return {
      store,
      category,
    };
  };

const createProductSummary =
  async (rawProduct) => {
    const product =
      normalizeProductRecord(
        rawProduct
      );

    const {
      store,
      category,
    } =
      await getProductRelations(
        product
      );

    const variants =
      getProductVariants(
        product.productId
      );

    const primaryImage =
      getPrimaryImage(
        product.productId
      );

    const variantSummary =
      calculateVariantSummary(
        variants
      );

    const storeCanOperate =
      store?.approvalStatus ===
        "APPROVED" &&
      store?.storeStatus ===
        "ACTIVE";

    const hasSellableVariant =
      variants.some(
        (variant) =>
          variant.status ===
            "ACTIVE" &&
          variant.stockQuantity >
            0
      );

    return {
      ...product,

      storeName:
        store?.storeName ||
        `Store #${product.storeId}`,

      sellerName:
        store?.storeName ||
        `Store #${product.storeId}`,

      sellerOwnerName:
        store?.fullName ||
        "Unknown seller",

      sellerUserId:
        store?.sellerUserId ||
        null,

      storeStatus:
        store?.storeStatus ||
        null,

      storeApprovalStatus:
        store?.approvalStatus ||
        null,

      storeCanOperate,

      isSaleEnabled:
        product.status ===
          "ACTIVE" &&
        storeCanOperate &&
        hasSellableVariant,

      categoryName:
        category?.categoryName ||
        "Uncategorized",

      primaryImageUrl:
        primaryImage?.imageUrl ||
        null,

      primaryImageAlt:
        primaryImage?.altText ||
        product.productName,

      ...variantSummary,
    };
  };

export const getOperationalProducts =
  async () => {
    return Promise.all(
      adminProducts.map(
        createProductSummary
      )
    );
  };

export const getOperationalProductById =
  async (productId) => {
    const product =
      getProductRecord(
        productId
      );

    if (!product) {
      throw new Error(
        "Product could not be found."
      );
    }

    const {
      store,
      category,
    } =
      await getProductRelations(
        product
      );

    const summary =
      await createProductSummary(
        product
      );

    const productInfoRecord =
      getProductInfoRecord(
        productId
      );

    return {
      ...summary,

      store: store
        ? {
            storeId:
              store.storeId,

            sellerUserId:
              store.sellerUserId,

            storeName:
              store.storeName,

            storeSlug:
              store.storeSlug,

            storeDescription:
              store.storeDescription,

            storeLogoUrl:
              store.storeLogoUrl,

            storeBannerUrl:
              store.storeBannerUrl,

            supportEmail:
              store.supportEmail,

            supportPhone:
              store.supportPhone,

            returnPolicy:
              store.returnPolicy,

            supportPolicy:
              store.supportPolicy,

            approvalStatus:
              store.approvalStatus,

            storeStatus:
              store.storeStatus,

            createdDate:
              store.createdDate,

            updatedDate:
              store.updatedDate,
          }
        : null,

      seller: store
        ? {
            userId:
              store.sellerUserId,

            fullName:
              store.fullName,

            email:
              store.email,

            accountStatus:
              store.accountStatus,

            storeId:
              store.storeId,

            storeName:
              store.storeName,

            approvalStatus:
              store.approvalStatus,

            storeStatus:
              store.storeStatus,
          }
        : null,

      category:
        cloneValue(category),

      productInfo:
        createProductInfoView(
          productInfoRecord
        ),

      images:
        getProductImages(
          productId
        ),

      variants:
        getProductVariants(
          productId
        ),
    };
  };

export const getAdminProducts = async (filters = {}) => {
  requireAuthenticatedAdmin();
  const response = await api.get("/api/Admin/products", {
    query: { page: 1, pageSize: 100, ...filters },
  });
  return (response.items || []).map(mapApiProduct);
};

export const getAdminProductsPage = async ({ page = 1, pageSize = 25, ...filters } = {}) => {
  const response = await getAdminPage("products", { ...filters, page, pageSize });
  return {
    ...response,
    items: (response.items || []).map(mapApiProduct),
  };
};

export const getAdminProductById = async (productId) => {
  requireAuthenticatedAdmin();
  const product = mapApiProduct(await api.get(`/api/Admin/products/${Number(productId)}`));
  return {
    ...product,
    store: { storeId: product.storeId, storeName: product.storeName, sellerUserId: product.sellerUserId },
    category: { categoryId: product.categoryId, categoryName: product.categoryName },
  };
};

export const updateAdminProductStatus = async (
  productId,
  status
) => {
  requireAuthenticatedAdmin();

  const normalizedStatus = normalizeEnum(status);
  const allowedStatuses = [
    "ACTIVE",
    "INACTIVE",
    "DELETED",
  ];

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new Error(
      "Admin product status must be ACTIVE, INACTIVE, or DELETED."
    );
  }

  return mapApiProduct(
    await api.put(
      `/api/Admin/products/${Number(productId)}/status`,
      { status: normalizedStatus }
    )
  );
};

