# Complete backend test matrix

| Area | Test | Expected result |
| --- | --- | --- |
| Buyer address | Missing buyer header | `401 BUYER_ID_REQUIRED` |
| Buyer address | Header belongs to non-buyer/inactive user | `403 BUYER_FORBIDDEN` |
| Buyer address | Create valid address | `201 Created` and one `BUYER_ADDRESS` row |
| Buyer address | Create same address twice | `409 BUYER_ADDRESS_DUPLICATE` |
| Buyer address | Set a second default shipping address | Previous default becomes false |
| Buyer address | Read/update/delete another buyer's address | `404 BUYER_ADDRESS_NOT_FOUND` |
| Review | Public list for existing product | `200 OK`, paging, count, average rating |
| Review | Buyer has a `DELIVERED` order containing the ACTIVE product | `201 Created` and one `REVIEW` row |
| Review | Product was not purchased, or order is not `DELIVERED` | `403 REVIEW_DELIVERED_ORDER_REQUIRED` |
| Review | Rating outside 1-5 | `400 Bad Request` |
| Review | Same buyer reviews same product twice | `409 REVIEW_ALREADY_EXISTS` |
| Review | Buyer edits/deletes another buyer's review | `404 REVIEW_NOT_FOUND` |
| Store | Active seller creates first store | `201`, status `PENDING` |
| Store | Seller attempts a second store | `409 SELLER_STORE_ALREADY_EXISTS` |
| Store | Duplicate name or non-null slug | `409` duplicate error |
| Store | Store submission | One `SellerApprovalRequested` notification per active Admin |
| Store | Edit suspended/closed store | `409 STORE_STATUS_CONFLICT` |
| Store | Resubmit a `REJECTED` store | Status becomes `PENDING`, Admin actor cleared |
| Store | Resubmit a non-rejected store | `409 STORE_STATUS_CONFLICT` |
| Store | Approved seller changes status to `INACTIVE` | Store and products disappear publicly |
| Store | Seller reactivates approved inactive store | Store returns to public catalogue |
| Store | Seller attempts to reopen `CLOSED`/`SUSPENDED` store | `409 STORE_STATUS_CONFLICT` |
| Admin | Approve/reject submitted store | Store, history, and seller notification commit together |
| Category | Public category list | `200 OK`, hierarchy and visible-product counts |
| Category | Active Admin creates root/child category | `201 Created`, Admin ID recorded |
| Category | Duplicate name under same parent | `409 DUPLICATE_CATEGORY` |
| Category | Move a category under itself/descendant | `409 CATEGORY_CYCLE` |
| Category | Delete category with products/children | `409 CATEGORY_IN_USE` |
| Seller product | Seller has no approved active store | `409 STORE_NOT_READY` |
| Seller product | Create valid complete aggregate | `201`, `DRAFT`, info/images/variants saved |
| Seller product | Create duplicate global SKU | `409 DUPLICATE_SKU` |
| Seller product | Duplicate size/color/storage combination | `409 DUPLICATE_VARIANT_OPTIONS` |
| Seller product | Duplicate image display order | `409 DUPLICATE_IMAGE_DISPLAY_ORDER` |
| Seller product | Malformed PRODUCT_INFO JSON envelope | `400 INVALID_PRODUCT_INFORMATION` |
| Seller product | Activate without a primary image or variant | `409 INVALID_PRODUCT_TRANSITION` |
| Seller product | Activate complete product with stock | Product becomes `ACTIVE` |
| Seller product | All active stock reaches zero | Product/variant become `OUT_OF_STOCK` |
| Seller product | Stale variant `rowVersion` | `409 VARIANT_CONCURRENCY_CONFLICT` |
| Seller inventory | Page/search/category/stock-status filters | SQL-side page with exact `ProductID`, `VariantID`, and `RowVersion` |
| Seller product | Seller accesses another store's product | `404 PRODUCT_NOT_FOUND` |
| Seller product | Delete product/variant | Soft-delete status preserves order history |
| Public catalogue | Page size greater than 100 | Server caps response at 100 |
| Public catalogue | 1,000 visible products | Correct total/pages; only requested page returned |
| Public catalogue | Search/category/brand/store/condition/price/stock filters | Only matching public products returned |
| Public catalogue | Equal sort values across multiple pages | No overlap; `ProductID` gives deterministic order |
| Public catalogue | Related products for a visible product | Same category, source product excluded, deterministic paged result |
| Public catalogue | Dynamic brand list | Counts only visible products from approved active stores |
| Public catalogue | Pending/rejected/suspended store | Its products are absent |
| Public catalogue | Draft/inactive/deleted product | Product is absent |
| Public detail | Complete buyer-safe aggregate | Core, info, images, variants, category, store, reviews |
| Public detail | Confidential fields | `CostPrice` and `RowVersion` never serialized |

## Rollback checks

- If store submission fails before commit, no partial store or Admin
  notification should remain.
- If Admin approval fails, the store decision, approval history, and seller
  notification should roll back together.
- SignalR failure must not remove a successfully saved notification.
- Product aggregate creation must not leave partial info, images, or variants.
- Image primary replacement must keep at most one primary image.
