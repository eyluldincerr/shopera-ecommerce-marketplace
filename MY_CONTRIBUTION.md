# My Contribution to Shopera

**Seller Frontend Developer & UI/Visual Designer**

Shopera was developed collaboratively during my Software Engineering internship. This document distinguishes my declared contribution from the shared source retained for context. The final source package identifies implementation locations; it does not establish line-by-line authorship or reconstruct commit history.

## Designed by me

- Shopera logo.
- Contributions to visual identity and visual direction.
- Figma interface layouts and UI elements.
- Design-to-development work for the Seller experience.

The logo files supplied in both applications are preserved in [design/branding](design/branding/README.md). Hash comparison confirms that these are identical exports, not distinct color variants. Figma exports, process images and comparisons are pending. Other bundled photographs, category images, banners and icons are not automatically claimed as my original artwork.

## Implemented by me

My primary development responsibility was the Seller frontend, specifically these areas:

| Area | Main source |
| --- | --- |
| Dashboard | [SellerDashboardPage](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/pages/seller/SellerDashboardPage.jsx) |
| Products | [SellerProductsPage](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/pages/seller/SellerProductsPage.jsx) |
| Inventory | [SellerInventoryPage](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/pages/seller/SellerInventoryPage.jsx) |
| Orders | [SellerOrdersPage](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/pages/seller/SellerOrdersPage.jsx) |
| Analytics | [SellerAnalyticsPage](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/pages/seller/SellerAnalyticsPage.jsx) |
| Store Profile | [SellerStoreProfilePage](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/pages/seller/SellerStoreProfilePage.jsx) |
| Notifications | [SellerNotificationsPage](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/pages/seller/SellerNotificationsPage.jsx) |

These are feature-level responsibility statements, not a claim that every line in the final team version was written solely by me. Supporting UI lives in the [Seller components](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/components/seller), [layout](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/components/layout/seller) and [styles](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/styles/seller).

## Integrated by me

I worked on connecting the Seller frontend to supporting APIs/services for products, variants, images, inventory, orders, analytics, store profile and notifications. Relevant integration paths include:

- [Seller service](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/services/sellerService.js).
- [Order service](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/services/sellerOrderService.js).
- [HTTP adapters](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/services/adapters) and [response mappers](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/services/mappers).
- Shared authentication, notification Context, realtime notifications and error handling.

Integration with these services does not imply that I authored all of them or their backend implementations.

## Team/shared implementation

The repository preserves the Buyer frontend, Admin frontend, backend APIs, authentication, database mappings, notification infrastructure, shared components and tests needed to understand the application as a team project. Their inclusion is not a personal authorship claim.

Store Media and Store Preview are retained because they are part of the supplied application. They are not listed as my personal implementation contributions.

The original frontend overview lists **Aytuğ, Eylül, Maaz, Ehsan and Keymanesh**. The original backend overview lists **Ehsan, Keymanesh and Maaz**. These credits are preserved as supplied; no additional assignment of individual responsibilities is inferred from them.

## Evidence and publication status

- Source links demonstrate the final implementation, not a fabricated development timeline.
- Figma evidence and screenshots will be provided later.
- No Git history has been created or rewritten for this preparation.
- No license has been added. Confirm publication permission and credit/asset details before making the project public.
