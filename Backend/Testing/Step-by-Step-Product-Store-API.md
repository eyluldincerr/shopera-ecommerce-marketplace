# Shopera Product and Store API: step-by-step learning guide

> Historical learning guide retained for context. Some setup and authentication details may differ from the current implementation. Start with [the current setup guide](../../docs/SETUP.md); it documents missing database bootstrap scripts. This document is not evidence of a freshly verified workflow.

This guide connects the existing SQL Server database, ASP.NET Core API, and
React frontend without inventing Product or Store data in the browser.

## 1. Confirm usable database rows

In SQL Server Management Studio, identify:

- an `ACTIVE` `SELLER` user;
- that seller's `APPROVED`, `ACTIVE` store;
- an existing category;
- an `ACTIVE` `BUYER` user;
- for review testing, a `DELIVERED` order whose `ORDER_ITEM.VariantID` belongs
  to the product being reviewed.

Keep the IDs. `ProductID` identifies the product page. `VariantID` identifies
one SKU/price/stock choice and must never replace `ProductID`.

## 2. Configure and start the backend

1. Install the .NET 10 SDK and SQL Server tooling.
2. Open `Shopera.slnx`.
3. Store `ConnectionStrings:DefaultConnection` in User Secrets.
4. Run the API with the `Development` environment.
5. Confirm the launch URL, normally `http://localhost:5208`.

Do not generate a migration or recreate `ECommerceDB_Final`; the project maps
the existing approved 23 tables.

## 3. Test Store before Product

Open `Http/SellerStores.http`, replace `SellerUserId`, and execute in order:

1. `GET /api/seller/store`
2. `POST /api/seller/store` only if the seller has no store
3. Admin approval from `Http/AdminNotifications.http`
4. `PATCH /api/seller/store`
5. `PATCH /api/seller/store/status`
6. `POST /api/seller/store/resubmit` only after rejection

Every seller request needs:

```http
X-Seller-User-Id: 3
```

The header is Development-only. JWT claims must replace it in production.

## 4. Create and publish a complete Product

Open `Http/SellerProducts.http` and run:

1. `POST /api/seller/products` with core fields, optional `PRODUCT_INFO`,
   images, and variants. The backend always creates a `DRAFT`.
2. Copy the returned `ProductID`, `ImageID`, `VariantID`, and Base64
   `RowVersion`.
3. `GET /api/seller/products/{ProductID}`.
4. Update optional sections with the core, info, image, and variant routes.
5. `PATCH /api/seller/products/{ProductID}/status` to `ACTIVE` only after the
   product has a primary image and at least one sellable variant.

`CostPrice` and `RowVersion` are seller-only fields. They must not appear in a
public Product response.

## 5. Verify 1,000+ Product rendering safely

Use `Http/PublicCatalogue.http`. Start with:

```http
GET /api/products?page=1&pageSize=50&sort=newest
```

Then combine:

```text
search
categoryId
brand
storeId
condition
minimumPrice
maximumPrice
inStockOnly
sort
page
pageSize
```

Allowed sort values are `newest`, `price_asc`, `price_desc`, `rating_desc`,
`name_asc`, and `name_desc`. Page size is capped at 100. Ordering always ends
with `ProductID`, so equal prices, names, ratings, or dates cannot make products
move randomly between pages.

Check:

- page 1 and page 2 contain no overlapping `ProductID`;
- `totalCount` and `totalPages` are correct;
- only the requested page is returned;
- pending/inactive stores and draft/inactive/deleted products are absent.

## 6. Verify public Product detail and Store pages

Run:

```http
GET /api/products/{ProductID}
GET /api/products/{ProductID}/related?page=1&pageSize=4
GET /api/categories
GET /api/products/brands
GET /api/stores
GET /api/stores/{StoreID}
GET /api/stores/{StoreID}/products?page=1&pageSize=20
```

The Product detail should include core Product data, category, approved store,
`PRODUCT_INFO`, ordered images, buyer-safe variants, and review summary. It
must omit `CostPrice` and `RowVersion`.

## 7. Test seller inventory concurrency

Run:

```http
GET /api/seller/products/inventory?page=1&pageSize=50
X-Seller-User-Id: 3
```

Each row contains both `ProductID` and `VariantID`. Use those exact values and
the returned `RowVersion` when changing stock. Reusing an old `RowVersion`
should produce `409 VARIANT_CONCURRENCY_CONFLICT`; reload the row before trying
again.

## 8. Test Review only after delivery

Use `Http/Reviews.http`.

- An active Buyer with a matching `DELIVERED` order can create one review.
- A Buyer without that delivered purchase receives
  `403 REVIEW_DELIVERED_ORDER_REQUIRED`.
- The order check joins `CUSTOMER_ORDER`, `ORDER_ITEM`, and
  `PRODUCT_VARIANT` to the requested `ProductID`.

## 9. Connect and run the React frontend

In the frontend project, copy `.env.example` to `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:5208
VITE_DEVELOPMENT_BUYER_USER_ID=YOUR_ACTIVE_BUYER_ID
VITE_DEVELOPMENT_SELLER_USER_ID=YOUR_ACTIVE_SELLER_ID
VITE_DEVELOPMENT_ADMIN_USER_ID=YOUR_ACTIVE_ADMIN_ID
```

Then run:

```bash
npm install
npm test
npm run lint
npm run dev
```

Browser checks:

1. Buyer Home and category pages load database Products and Stores.
2. Search, filters, sorting, and next-page loading change API query parameters.
3. Clicking a card opens `/products/{ProductID}` and renders all Product
   sections.
4. Clicking the seller opens `/stores/{StoreID}`.
5. Seller Product create/edit uses real category, image, info, and variant
   endpoints.
6. Seller inventory updates the exact `VariantID`, not the Product ID.
7. A rejected Store shows resubmit; an approved Store can be activated or
   deactivated.
8. Buyer Review creation succeeds only for a delivered purchase.

## 10. Common failures

- `401 *_ID_REQUIRED`: the Development identity header is missing.
- `403 *_FORBIDDEN`: the ID does not belong to an active user with that role.
- CORS error: frontend origin is not listed in backend Development settings.
- `409 STORE_NOT_READY`: approve and activate the seller's Store first.
- `409 INVALID_PRODUCT_TRANSITION`: add a primary image and sellable variant.
- `409 VARIANT_CONCURRENCY_CONFLICT`: reload inventory and use new
  `RowVersion`.
- Product is absent publicly: check Store approval/status, Product status, and
  variant status/stock.
