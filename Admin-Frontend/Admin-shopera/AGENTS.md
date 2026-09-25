# Project Rules

## Database authority

- The final database design is authoritative.
- Never invent database tables, columns, relationships, enums, or persistent features.
- Technical database names must remain unchanged.
- User-facing `SELLER` terminology may be displayed as “Brand” or “Brand Store”.

## Role ownership

`ADMIN` owns:

- User account status management.
- Administrator permissions where supported.
- Store application approval.
- Store operational status.
- Category management.
- Read-only product oversight.

`SELLER` owns:

- Product creation and editing.
- Product conditions.
- Product status.
- Variants.
- SKU.
- Images.
- Price.
- `CostPrice`.
- Stock.

`BUYER` owns:

- Cart.
- Wishlist.
- Checkout.
- Saved addresses.
- Reviews.
- Buyer-facing order activity.

## Product and store rules

- The admin product interface must be read-only.
- Admin must not draft, activate, deactivate, delete, restock, or mark products out of stock.
- `CostPrice` and `RowVersion` must never be exposed to buyer-facing code.
- Store operational status is true only when `ApprovalStatus` is `APPROVED` and `StoreStatus` is `ACTIVE`.
- Product sale availability is true only when all of the following are true:
  - Product status is `ACTIVE`.
  - Store approval status is `APPROVED`.
  - Store status is `ACTIVE`.
  - At least one variant is `ACTIVE` with stock greater than zero.

## Deferred features

- `COUPON_USAGE`, return-request, refund, inventory-transaction, and review-response tables are deferred and must not be simulated.
- Do not add language selection yet.
- Do not add dashboard customization yet.

## Repository workflow

- Do not use destructive Git operations.
- Always run build and lint after changes.
