import { resolveApiUrl } from "../axiosClient.js";

const read = (dto, ...keys) => {
  for (const key of keys) {
    if (dto?.[key] !== undefined) {
      return dto[key];
    }
  }

  return undefined;
};

const nullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const integerOrNull = (value) => {
  const number = numberOrNull(value);
  return Number.isInteger(number) ? number : null;
};

const objectOr = (value, fallback) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? structuredClone(value)
    : structuredClone(fallback);

export const mapCategoryDto = (dto = {}) => {
  const rawImageUrl = nullableString(read(dto, "imageUrl", "ImageUrl"));
  const rawHasImage = read(dto, "hasImage", "HasImage");

  return {
    categoryId: integerOrNull(read(dto, "categoryId", "CategoryID")),
    categoryName:
      nullableString(read(dto, "categoryName", "CategoryName")) || "",
    description: nullableString(read(dto, "description", "Description")),
    parentCategoryId: integerOrNull(
      read(dto, "parentCategoryId", "ParentCategoryID")
    ),
    ...(rawHasImage !== undefined || rawImageUrl
      ? {
          hasImage: Boolean(rawHasImage || rawImageUrl),
          imageUrl: resolveApiUrl(rawImageUrl || ""),
        }
      : {}),
  };
};

export const mapPublicBrandDto = (dto = {}) => ({
  brand: nullableString(read(dto, "brand", "Brand")) || "",
  visibleProductCount:
    integerOrNull(
      read(dto, "visibleProductCount", "VisibleProductCount")
    ) ?? 0,
});

export const mapProductInfoDto = (dto = {}) => ({
  productInfoId: integerOrNull(
    read(dto, "productInfoId", "ProductInfoID")
  ),
  productId: integerOrNull(read(dto, "productId", "ProductID")),
  productDetails: objectOr(
    read(dto, "productDetails", "ProductDetails"),
    { items: [] }
  ),
  specifications: objectOr(
    read(dto, "specifications", "Specifications"),
    { groups: [] }
  ),
  whatsInTheBox: objectOr(
    read(dto, "whatsInTheBox", "WhatsInTheBox"),
    { items: [] }
  ),
  warrantyInformation: nullableString(
    read(dto, "warrantyInformation", "WarrantyInformation")
  ),
  returnPolicy: nullableString(read(dto, "returnPolicy", "ReturnPolicy")),
  careInstructions: nullableString(
    read(dto, "careInstructions", "CareInstructions")
  ),
  additionalInformation: nullableString(
    read(dto, "additionalInformation", "AdditionalInformation")
  ),
  createdDate: nullableString(read(dto, "createdDate", "CreatedDate")),
  updatedDate: nullableString(read(dto, "updatedDate", "UpdatedDate")),
});

export const mapProductImageDto = (dto = {}, options = {}) => {
  const imageId = integerOrNull(read(dto, "imageId", "ImageID"));
  const productId =
    integerOrNull(read(dto, "productId", "ProductID")) ??
    integerOrNull(options.productId);
  const providedUrl = nullableString(
    read(dto, "imageUrl", "ImageUrl", "contentUrl", "ContentUrl")
  );
  const generatedUrl =
    imageId && options.sellerOwned && productId
      ? `/api/seller/products/${productId}/images/${imageId}/content`
      : imageId
        ? `/api/product-images/${imageId}/content`
        : "";

  return {
    imageId,
    productId,
    imageUrl: resolveApiUrl(
      options.sellerOwned ? generatedUrl || providedUrl : providedUrl || generatedUrl
    ),
    altText: nullableString(read(dto, "altText", "AltText")),
    displayOrder: integerOrNull(read(dto, "displayOrder", "DisplayOrder")),
    isPrimary: Boolean(read(dto, "isPrimary", "IsPrimary")),
    contentType: nullableString(read(dto, "contentType", "ContentType")),
    originalFileName: nullableString(
      read(dto, "originalFileName", "OriginalFileName")
    ),
    createdDate: nullableString(read(dto, "createdDate", "CreatedDate")),
  };
};

const mapVariant = (dto = {}, includeCostPrice) => {
  const variant = {
    variantId: integerOrNull(read(dto, "variantId", "VariantID")),
    productId: integerOrNull(read(dto, "productId", "ProductID")),
    sku: nullableString(read(dto, "sku", "SKU")) || "",
    variantName: nullableString(read(dto, "variantName", "VariantName")),
    size: nullableString(read(dto, "size", "Size")),
    color: nullableString(read(dto, "color", "Color")),
    storageCapacity: nullableString(
      read(dto, "storageCapacity", "StorageCapacity")
    ),
    price: numberOrNull(read(dto, "price", "Price")),
    stockQuantity: integerOrNull(
      read(dto, "stockQuantity", "StockQuantity")
    ),
    status: nullableString(read(dto, "status", "Status")),
    createdDate: nullableString(read(dto, "createdDate", "CreatedDate")),
    rowVersion: nullableString(read(dto, "rowVersion", "RowVersion")),
  };

  if (includeCostPrice) {
    variant.costPrice = numberOrNull(read(dto, "costPrice", "CostPrice"));
  }

  return variant;
};

export const mapProductVariantDto = (dto = {}) => mapVariant(dto, false);
export const mapSellerProductVariantDto = (dto = {}) => mapVariant(dto, true);

const mapProduct = (dto = {}, includeCostPrice, sellerOwned = false) => {
  const rawVariants = read(dto, "variants", "Variants");
  const rawImages = read(dto, "images", "Images");
  const rawInfo = read(
    dto,
    "information",
    "Information",
    "productInfo",
    "ProductInfo"
  );
  const rawStore = read(dto, "store", "Store");
  const rawCategory = read(dto, "category", "Category");
  const productId = integerOrNull(read(dto, "productId", "ProductID"));
  const variants = Array.isArray(rawVariants)
    ? rawVariants.map((variant) => mapVariant(variant, includeCostPrice))
    : [];
  const images = Array.isArray(rawImages)
    ? rawImages.map((image) =>
        mapProductImageDto(image, { productId, sellerOwned })
      )
    : [];

  const product = {
    productId,
    productName:
      nullableString(read(dto, "productName", "ProductName")) || "",
    shortDescription: nullableString(
      read(dto, "shortDescription", "ShortDescription")
    ),
    description: nullableString(read(dto, "description", "Description")),
    brand: nullableString(read(dto, "brand", "Brand")),
    modelNumber: nullableString(read(dto, "modelNumber", "ModelNumber")),
    productCondition: nullableString(
      read(dto, "productCondition", "ProductCondition")
    ),
    conditionDescription: nullableString(
      read(dto, "conditionDescription", "ConditionDescription")
    ),
    status: nullableString(read(dto, "status", "Status")),
    createdDate: nullableString(read(dto, "createdDate", "CreatedDate")),
    storeId: integerOrNull(
      read(dto, "storeId", "StoreID") ??
        read(rawStore, "storeId", "StoreID")
    ),
    storeName: nullableString(
      read(dto, "storeName", "StoreName") ??
        read(rawStore, "storeName", "StoreName")
    ),
    storeSlug: nullableString(
      read(dto, "storeSlug", "StoreSlug") ??
        read(rawStore, "storeSlug", "StoreSlug")
    ),
    store: rawStore
      ? {
          storeId: integerOrNull(read(rawStore, "storeId", "StoreID")),
          storeName:
            nullableString(read(rawStore, "storeName", "StoreName")) || "",
          storeSlug: nullableString(read(rawStore, "storeSlug", "StoreSlug")),
          storeDescription: nullableString(
            read(rawStore, "storeDescription", "StoreDescription")
          ),
          storeLogoUrl: nullableString(
            read(rawStore, "storeLogoUrl", "StoreLogoURL")
          ),
          storeBannerUrl: nullableString(
            read(rawStore, "storeBannerUrl", "StoreBannerURL")
          ),
          supportEmail: nullableString(
            read(rawStore, "supportEmail", "SupportEmail")
          ),
          supportPhone: nullableString(
            read(rawStore, "supportPhone", "SupportPhone")
          ),
          returnPolicy: nullableString(
            read(rawStore, "returnPolicy", "ReturnPolicy")
          ),
          supportPolicy: nullableString(
            read(rawStore, "supportPolicy", "SupportPolicy")
          ),
          visibleProductCount:
            integerOrNull(
              read(rawStore, "visibleProductCount", "VisibleProductCount")
            ) ?? 0,
          createdDate: nullableString(
            read(rawStore, "createdDate", "CreatedDate")
          ),
        }
      : null,
    categoryId: integerOrNull(
      read(dto, "categoryId", "CategoryID") ??
        read(rawCategory, "categoryId", "CategoryID")
    ),
    categoryName: nullableString(
      read(dto, "categoryName", "CategoryName") ??
        read(rawCategory, "categoryName", "CategoryName")
    ),
    productInfo: rawInfo ? mapProductInfoDto(rawInfo) : null,
    images,
    variants,
    defaultVariantId: integerOrNull(
      read(dto, "defaultVariantId", "DefaultVariantId", "DefaultVariantID")
    ),
  };

  // Optional read-only backend projections; never written back.
  for (const [key, keys] of [
    ["rating", ["averageRating", "AverageRating", "rating", "Rating"]],
    ["reviewCount", ["reviewCount", "ReviewCount"]],
    ["minPrice", ["minimumPrice", "MinimumPrice", "minPrice", "MinPrice"]],
    ["maxPrice", ["maximumPrice", "MaximumPrice", "maxPrice", "MaxPrice"]],
    ["totalStock", ["totalStock", "TotalStock"]],
    ["variantCount", ["variantCount", "VariantCount"]],
  ]) {
    const value = numberOrNull(read(dto, ...keys));
    if (value !== null) {
      product[key] = value;
    }
  }

  const projectedImageId = integerOrNull(
    read(dto, "primaryImageId", "PrimaryImageId", "PrimaryImageID")
  );
  const projectedImage = nullableString(
    read(
      dto,
      "primaryImageUrl",
      "PrimaryImageUrl",
      "primaryImage",
      "PrimaryImage"
    )
  );
  const generatedPrimaryImage =
    projectedImageId && productId
      ? sellerOwned
        ? `/api/seller/products/${productId}/images/${projectedImageId}/content`
        : `/api/product-images/${projectedImageId}/content`
      : "";
  if (projectedImage || generatedPrimaryImage) {
    product.primaryImage = resolveApiUrl(
      sellerOwned
        ? generatedPrimaryImage || projectedImage
        : projectedImage || generatedPrimaryImage
    );
  }

  return product;
};

export const mapProductDto = (dto = {}) => mapProduct(dto, false);
export const mapSellerProductDto = (dto = {}) => mapProduct(dto, true, true);


export const mapSellerInventoryItemDto = (dto = {}) => ({
  productId: integerOrNull(read(dto, "productId", "ProductID")),
  productName:
    nullableString(read(dto, "productName", "ProductName")) || "",
  categoryId: integerOrNull(read(dto, "categoryId", "CategoryID")),
  categoryName:
    nullableString(read(dto, "categoryName", "CategoryName")) || "",
  primaryImage: resolveApiUrl(
    nullableString(
      read(dto, "primaryImageUrl", "PrimaryImageUrl", "primaryImage", "PrimaryImage")
    ) || ""
  ),
  variantId: integerOrNull(read(dto, "variantId", "VariantID")),
  sku: nullableString(read(dto, "sku", "SKU")) || "",
  variantName: nullableString(read(dto, "variantName", "VariantName")),
  stockQuantity:
    integerOrNull(read(dto, "stockQuantity", "StockQuantity")) ?? 0,
  status: nullableString(read(dto, "status", "Status")),
  rowVersion:
    nullableString(read(dto, "rowVersion", "RowVersion")) || "",
});

const withExistingId = (target, key, value) => {
  const id = integerOrNull(value);
  return id === null ? target : { [key]: id, ...target };
};

export const mapProductInfoWriteRequest = (info = {}) => ({
  productDetails: objectOr(info.productDetails, { items: [] }),
  specifications: objectOr(info.specifications, { groups: [] }),
  whatsInTheBox: objectOr(info.whatsInTheBox, { items: [] }),
  warrantyInformation: nullableString(info.warrantyInformation),
  returnPolicy: nullableString(info.returnPolicy),
  careInstructions: nullableString(info.careInstructions),
  additionalInformation: nullableString(info.additionalInformation),
});

const appendProductImageFormFields = (formData, image = {}, includeFile) => {
  if (includeFile && image.file) {
    formData.append("File", image.file, image.file.name || "product-image");
  }
  formData.append("AltText", String(image.altText || "").trim());
  formData.append("DisplayOrder", String(integerOrNull(image.displayOrder) ?? ""));
  formData.append("IsPrimary", String(Boolean(image.isPrimary)));
  return formData;
};

export const mapVariantWriteRequest = (variant = {}) =>
  withExistingId(
    {
      sku: String(variant.sku || "").trim(),
      variantName: nullableString(variant.variantName),
      size: nullableString(variant.size),
      color: nullableString(variant.color),
      storageCapacity: nullableString(variant.storageCapacity),
      price: numberOrNull(variant.price),
      costPrice: numberOrNull(variant.costPrice),
      stockQuantity: integerOrNull(variant.stockQuantity),
      status: nullableString(variant.status),
    },
    "variantId",
    variant.variantId
  );

export const mapProductWriteRequest = (product = {}) => {
  return {
    productName: String(product.productName || "").trim(),
    shortDescription: nullableString(product.shortDescription),
    description: nullableString(product.description),
    brand: nullableString(product.brand),
    modelNumber: nullableString(product.modelNumber),
    productCondition: nullableString(product.productCondition),
    conditionDescription: nullableString(product.conditionDescription),
    categoryId: integerOrNull(product.categoryId),
    information: product.productInfo
      ? mapProductInfoWriteRequest(product.productInfo)
      : null,
    variants: (product.variants || []).map(mapVariantWriteRequest),
  };
};

export const mapProductCoreUpdateRequest = (product = {}) => ({
  productName: String(product.productName || "").trim(),
  shortDescription: String(product.shortDescription || "").trim(),
  description: String(product.description || "").trim(),
  brand: String(product.brand || "").trim(),
  modelNumber: String(product.modelNumber || "").trim(),
  productCondition: String(product.productCondition || "").trim(),
  conditionDescription: String(product.conditionDescription || "").trim(),
  categoryId: integerOrNull(product.categoryId),
});


export const mapProductInfoUpsertRequest = (info = {}) =>
  mapProductInfoWriteRequest(info);

export const mapProductImageCreateRequest = (image = {}) => {
  if (!image.file) {
    throw new Error("IMAGE_FILE_REQUIRED");
  }
  return appendProductImageFormFields(new FormData(), image, true);
};

export const mapProductImageUpdateRequest = (image = {}) =>
  appendProductImageFormFields(new FormData(), image, Boolean(image.file));

export const mapProductVariantCreateRequest = (variant = {}) => {
  const request = mapVariantWriteRequest(variant);
  delete request.variantId;
  return request;
};

export const mapProductVariantUpdateRequest = (variant = {}) => {
  const request = {
    rowVersion: String(variant.rowVersion || "").trim(),
  };

  if (Object.hasOwn(variant, "sku")) {
    request.sku = String(variant.sku || "").trim();
  }
  if (Object.hasOwn(variant, "variantName")) {
    request.variantName = String(variant.variantName || "").trim();
  }
  if (Object.hasOwn(variant, "size")) {
    request.size = String(variant.size || "").trim();
  }
  if (Object.hasOwn(variant, "color")) {
    request.color = String(variant.color || "").trim();
  }
  if (Object.hasOwn(variant, "storageCapacity")) {
    request.storageCapacity = String(
      variant.storageCapacity || ""
    ).trim();
  }
  if (Object.hasOwn(variant, "price")) {
    request.price = numberOrNull(variant.price);
  }
  if (Object.hasOwn(variant, "costPrice")) {
    request.costPrice = numberOrNull(variant.costPrice);
  }
  if (Object.hasOwn(variant, "stockQuantity")) {
    request.stockQuantity = integerOrNull(variant.stockQuantity);
  }
  if (Object.hasOwn(variant, "status")) {
    request.status = String(variant.status || "").trim();
  }

  return request;
};

export const mapProductVariantDeleteRequest = (rowVersion) => ({
  rowVersion: String(rowVersion || "").trim(),
});

export const mapProductStatusUpdateRequest = (status) => ({
  status: nullableString(status),
});

export const mapPaginationDto = (dto = {}, items = []) => {
  const page = Number(read(dto, "page", "Page", "pageNumber", "PageNumber"));
  const pageSize = Number(read(dto, "pageSize", "PageSize"));
  const totalCount = Number(read(dto, "totalCount", "TotalCount"));
  const totalPages = Number(read(dto, "totalPages", "TotalPages"));
  const hasMore = read(dto, "hasMore", "HasMore");

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize:
      Number.isInteger(pageSize) && pageSize >= 0 ? pageSize : items.length,
    totalCount:
      Number.isFinite(totalCount) && totalCount >= 0
        ? totalCount
        : items.length,
    totalPages:
      Number.isInteger(totalPages) && totalPages >= 0 ? totalPages : null,
    hasMore:
      typeof hasMore === "boolean"
        ? hasMore
        : Number.isInteger(totalPages) && totalPages > 0
          ? page < totalPages
          : false,
    nextCursor:
      nullableString(read(dto, "nextCursor", "NextCursor")) || null,
  };
};

const mapPage = (dto, mapper) => {
  const rawItems =
    read(dto, "items", "Items", "products", "Products", "data", "Data") || [];
  const items = Array.isArray(rawItems) ? rawItems.map(mapper) : [];

  return {
    items,
    ...mapPaginationDto(dto, items),
    filterOptions:
      read(dto, "filterOptions", "FilterOptions", "facets", "Facets") || {},
  };
};

export const mapProductPageDto = (dto = {}) => mapPage(dto, mapProductDto);
export const mapSellerProductPageDto = (dto = {}) =>
  mapPage(dto, mapSellerProductDto);
export const mapSellerInventoryPageDto = (dto = {}) =>
  mapPage(dto, mapSellerInventoryItemDto);
