const read = (dto, ...keys) => {
  for (const key of keys) {
    if (dto?.[key] !== undefined) {
      return dto[key];
    }
  }

  return undefined;
};

const nullableString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized || null;
};

const integerOrNull = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isInteger(number)
    ? number
    : null;
};

export const mapStoreDto = (
  dto = {}
) => ({
  storeId: integerOrNull(
    read(dto, "storeId", "StoreID")
  ),

  sellerUserId: integerOrNull(
    read(
      dto,
      "sellerUserId",
      "SellerUserID"
    )
  ),

  storeName:
    nullableString(
      read(dto, "storeName", "StoreName")
    ) || "",

  storeSlug: nullableString(
    read(dto, "storeSlug", "StoreSlug")
  ),

  storeDescription: nullableString(
    read(
      dto,
      "storeDescription",
      "StoreDescription"
    )
  ),

  storeLogoUrl: nullableString(
    read(
      dto,
      "storeLogoUrl",
      "StoreLogoURL"
    )
  ),

  storeBannerUrl: nullableString(
    read(
      dto,
      "storeBannerUrl",
      "StoreBannerURL"
    )
  ),

  supportEmail: nullableString(
    read(
      dto,
      "supportEmail",
      "SupportEmail"
    )
  ),

  supportPhone: nullableString(
    read(
      dto,
      "supportPhone",
      "SupportPhone"
    )
  ),

  returnPolicy: nullableString(
    read(
      dto,
      "returnPolicy",
      "ReturnPolicy"
    )
  ),

  supportPolicy: nullableString(
    read(
      dto,
      "supportPolicy",
      "SupportPolicy"
    )
  ),

  approvalStatus: nullableString(
    read(
      dto,
      "approvalStatus",
      "ApprovalStatus"
    )
  ),

  approvedByAdminUserId: integerOrNull(
    read(
      dto,
      "approvedByAdminUserId",
      "ApprovedByAdminUserID"
    )
  ),

  createdDate: nullableString(
    read(
      dto,
      "createdDate",
      "CreatedDate"
    )
  ),

  updatedDate: nullableString(
    read(
      dto,
      "updatedDate",
      "UpdatedDate"
    )
  ),

  storeStatus: nullableString(
    read(
      dto,
      "storeStatus",
      "StoreStatus"
    )
  ),

  latestDecisionNote: nullableString(
    read(
      dto,
      "latestDecisionNote",
      "LatestDecisionNote"
    )
  ),

  visibleProductCount:
    integerOrNull(
      read(
        dto,
        "visibleProductCount",
        "VisibleProductCount"
      )
    ) ?? 0,
});

export const mapStoreWriteRequest = (
  store = {}
) => ({
  storeName: String(
    store.storeName || ""
  ).trim(),

  storeSlug: nullableString(
    store.storeSlug
  ),

  storeDescription: nullableString(
    store.storeDescription
  ),

  storeLogoUrl: nullableString(
    store.storeLogoUrl
  ),

  storeBannerUrl: nullableString(
    store.storeBannerUrl
  ),

  supportEmail: nullableString(
    store.supportEmail
  ),

  supportPhone: nullableString(
    store.supportPhone
  ),

  returnPolicy: nullableString(
    store.returnPolicy
  ),

  supportPolicy: nullableString(
    store.supportPolicy
  ),
});

export const mapStoreStoryDto = (
  dto = {}
) => {
  const products = read(
    dto,
    "products",
    "Products"
  );

  return {
    storyId: integerOrNull(
      read(dto, "storyId", "StoryID")
    ),

    storeId: integerOrNull(
      read(dto, "storeId", "StoreID")
    ),

    storeName:
      nullableString(
        read(
          dto,
          "storeName",
          "StoreName"
        )
      ) || "",

    storeLogo: nullableString(
      read(
        dto,
        "storeLogo",
        "StoreLogoURL"
      )
    ),

    storeSlug: nullableString(
      read(
        dto,
        "storeSlug",
        "StoreSlug"
      )
    ),

    thumbnailUrl: nullableString(
      read(
        dto,
        "thumbnailUrl",
        "ThumbnailURL"
      )
    ),

    mediaType: nullableString(
      read(
        dto,
        "mediaType",
        "MediaType"
      )
    ),

    mediaUrl: nullableString(
      read(
        dto,
        "mediaUrl",
        "MediaURL"
      )
    ),

    caption: nullableString(
      read(dto, "caption", "Caption")
    ),

    createdDate: nullableString(
      read(
        dto,
        "createdDate",
        "CreatedDate"
      )
    ),

    products: Array.isArray(products)
      ? products.map((product) => ({
          productId: integerOrNull(
            read(
              product,
              "productId",
              "ProductID"
            )
          ),

          variantId: integerOrNull(
            read(
              product,
              "variantId",
              "VariantID"
            )
          ),

          productName:
            nullableString(
              read(
                product,
                "productName",
                "ProductName"
              )
            ) || "",

          productImage: nullableString(
            read(
              product,
              "productImage",
              "ProductImageURL"
            )
          ),

          price:
            read(
              product,
              "price",
              "Price"
            ) == null
              ? null
              : Number(
                  read(
                    product,
                    "price",
                    "Price"
                  )
                ),
        }))
      : [],
  };
};