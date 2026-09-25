# Product and Store backend connection contract

This frontend contract is aligned to the authoritative consolidated SQL Server
23-table design supplied in July 2026 and the supplied ASP.NET Core controllers.
The Product, Store, Seller Product, and Seller Store routes listed below are now
configured by default. Environment variables may override them for deployment.

## Ownership and trust boundaries

- SQL Server generates every Product, ProductInfo, ProductImage,
  ProductVariant, Category, and Store identifier.
- The authenticated JWT determines Seller identity from its NameIdentifier and
  Role claims. Every protected request sends `Authorization: Bearer <token>`.
  A browser request never sends a Seller or Store owner ID in its JSON body.
- Category administration and Store approval fields are Admin-owned.
- Product and Store timestamps are generated or managed by the backend.
- Public Product results omit ProductVariant `costPrice`. Seller-authorized
  Product results may include it.
- `rating`, `reviewCount`, `minPrice`, `maxPrice`, `primaryImage`, and
  pagination `totalCount` are optional read-only projections, not physical
  Product fields. The frontend never writes or invents them.
- Public visibility is backend-owned and follows Product, Variant, Store, and
  Store-approval status.

## Canonical read models

Product:

```text
productId, productName, shortDescription, description, brand, modelNumber,
productCondition, conditionDescription, status, createdDate, storeId,
categoryId, productInfo, images, variants
```

ProductInfo:

```text
productInfoId, productId, productDetails, specifications, whatsInTheBox,
warrantyInformation, returnPolicy, careInstructions, additionalInformation,
createdDate, updatedDate
```

`productDetails` and `whatsInTheBox` are JSON objects containing `items`.
`specifications` is a JSON object containing `groups`; every group contains
`items`.

ProductImage:

```text
imageId, productId, imageUrl, altText, displayOrder, isPrimary, createdDate
```

Display order starts at 1 and is unique per Product. At most one Product image
is primary.

ProductVariant:

```text
variantId, productId, sku, variantName, size, color, storageCapacity, price,
costPrice, stockQuantity, status, createdDate, rowVersion
```

SKU is globally unique. The Size/Color/StorageCapacity combination is unique
within a Product. Price and confidential cost price are nonnegative; stock is a
nonnegative integer.

Category:

```text
categoryId, categoryName, description, parentCategoryId
```

Categories are hierarchical. The required Admin-manager foreign key is not
exposed to ordinary Buyer or Seller UI.

Store:

```text
storeId, sellerUserId, storeName, storeSlug, storeDescription, storeLogoUrl,
storeBannerUrl, supportEmail, supportPhone, returnPolicy, supportPolicy,
approvalStatus, approvedByAdminUserId, createdDate, updatedDate, storeStatus
```

Sellers may edit only Store name, slug, description, logo URL, banner URL,
support email, support phone, return policy, and support policy. Approval
status, approving Admin, Store status, identity, and timestamps are read-only.
Store name is required and unique; Store slug is optional and unique. A Seller
may own at most one Store.

## Enumerations

- Product condition: `NEW`, `USED_LIKE_NEW`, `USED_GOOD`, `USED_FAIR`,
  `REFURBISHED`
- Product status: `DRAFT`, `ACTIVE`, `INACTIVE`, `OUT_OF_STOCK`, `DELETED`
- Variant status: `ACTIVE`, `INACTIVE`, `OUT_OF_STOCK`, `DELETED`
- Store approval: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`
- Store status: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `CLOSED`

A meaningful condition description is required by the seller form for
conditions other than `NEW`.

## Concurrency and delete semantics

Inventory writes send the last backend-issued `rowVersion` unchanged. The
frontend never decodes, increments, or replaces it locally; a successful
response supplies the next token. HTTP 409 is shown as a translated stale-stock
conflict and requires the Seller to reload before retrying. Product and Variant
identifiers remain unchanged.

Product deletion is connected to `DELETE /api/seller/products/{productId}` and
is status-based in the backend. Variant deletion sends the opaque `rowVersion`
in the request body to
`DELETE /api/seller/products/{productId}/variants/{variantId}`. The frontend
waits for a successful response before changing UI state.

## Deliberately unsupported SQL concepts

The July 2026 design has no Collection table or Product-to-Collection
relationship, and no Brand table or Brand foreign key. Brand is nullable text
on Product. Existing collection routes and `collectionService.js` remain only
to render an honest translated unavailable state. Supporting collections later
requires an explicit database-design decision.

The frontend contract also excludes Product slugs, barcodes, compare-at prices,
currency columns, low-stock threshold columns, arbitrary variant option bags,
Variant images/media, Product weight/dimensions, Product update timestamps,
Variant update timestamps, and Store shipping policy. These concepts must not
be substituted for any confirmed column.

## Confirmed Product and Store endpoints

Public Product and Category routes:

```text
GET /api/products
GET /api/products/{productId}
GET /api/products/{productId}/related
GET /api/categories
```

Seller Product routes:

```text
GET    /api/seller/products
GET    /api/seller/products/{productId}
GET    /api/seller/products/inventory
POST   /api/seller/products
PATCH  /api/seller/products/{productId}
DELETE /api/seller/products/{productId}
PUT    /api/seller/products/{productId}/info
POST   /api/seller/products/{productId}/images
PATCH  /api/seller/products/{productId}/images/{imageId}
DELETE /api/seller/products/{productId}/images/{imageId}
POST   /api/seller/products/{productId}/variants
PATCH  /api/seller/products/{productId}/variants/{variantId}
DELETE /api/seller/products/{productId}/variants/{variantId}
PATCH  /api/seller/products/{productId}/status
```

Public and Seller Store routes:

```text
GET   /api/stores
GET   /api/stores/{storeId}
GET   /api/stores/by-slug/{storeSlug}
GET   /api/stores/{storeId}/products
GET   /api/seller/store
POST  /api/seller/store
PATCH /api/seller/store
POST  /api/seller/store/resubmit
PATCH /api/seller/store/status
```

Seller Product editing now coordinates the core Product, ProductInfo, images,
variants, and publication status endpoints. Inventory search, category filtering,
stock filtering, and pagination are server-owned through the dedicated inventory
route. No adapter silently falls back to seed data, browser storage, fake success,
generated IDs, or a parallel `src/api` layer.

## Remaining contract work

- Add a transactional aggregate Product update endpoint if the team requires
  all-or-nothing editing across core information, images, variants, and status.
- Confirm the hosted media/upload workflow; the current contract stores image
  URLs only.
- Finish connecting Seller Order, Analytics, and claim-based Notification UI.
