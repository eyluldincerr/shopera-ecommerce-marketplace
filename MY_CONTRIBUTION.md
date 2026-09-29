# My Contribution to Shopera

**Seller Frontend Developer & UI/Visual Designer**

Shopera was a team project during my Software Engineering internship at Analiz Systems. I designed the marketplace interfaces in Figma across desktop and mobile, alongside the logo and visual identity. Separately, my primary coding responsibility was the Seller frontend in React and its API/service integration.

## Designed by me

- Shopera logo.
- Visual identity.
- Marketplace interfaces in Figma.
- Desktop UI layouts, visual hierarchy and navigation patterns.
- Mobile UI layouts and responsive/mobile design direction.
- UI elements and visual direction used by the development team to implement the application.

The logo files supplied in both applications are preserved in [design/branding](design/branding/README.md). Hash comparison confirms that these are identical exports, not distinct color variants. Figma exports, process images and comparisons are pending. Other bundled photographs, category images, banners and icons are not automatically claimed as my original artwork.

## Developed by me

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

## Team implementation

The development team implemented the marketplace designs in the application. Buyer/Admin frontend development, backend APIs and other implementation outside my documented Seller responsibility belong to the team implementation. My design work across those interfaces is distinct from their coding implementation.

Shared authentication, database mappings, notification infrastructure, components and tests are retained to show how the Seller frontend integrates with the application.

Store Media and Store Preview are retained because they are part of the supplied application. They are not listed as my personal implementation contributions.

The original frontend overview lists **Aytuğ, Eylül, Maaz, Ehsan and Keymanesh**. The original backend overview lists **Ehsan, Keymanesh and Maaz**. These credits are preserved as supplied; no additional assignment of individual responsibilities is inferred from them.

## Supporting material

- Source links identify the documented Seller implementation areas.
- Original desktop/mobile Figma boards will be added to the design showcase separately.
- No license has been added.
