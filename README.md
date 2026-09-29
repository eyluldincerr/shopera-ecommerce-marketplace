# Shopera — E-Commerce Marketplace

<!-- Optional README logo: after adding the original dark-wordmark export at
design/branding/shopera-logo-readme.png, uncomment the image below.
The existing application logo assets remain unchanged.
<img src="design/branding/shopera-logo-readme.png" alt="Shopera logo" width="600">
-->

**Seller Frontend Development · UI/Visual Design · React · Figma**

Shopera is an e-commerce marketplace developed during my Software Engineering internship at **Analiz Systems**. As part of the project team, I designed Shopera's visual identity and marketplace interfaces in Figma for desktop and mobile. My primary coding responsibility was the Seller frontend in React, including its integration with supporting APIs and services.

**My Role — Seller Frontend Developer & UI/Visual Designer**

[View detailed contributions and team attribution →](MY_CONTRIBUTION.md)

## My Contribution

### 🎨 Design & Visual Identity

- **Shopera logo:** designed the shopping-cart symbol and wordmark.
- **Visual identity:** established the color and branding direction.
- **Marketplace UI in Figma:** designed desktop and mobile interfaces across Shopera.
- **UI elements:** designed the elements used throughout the marketplace interfaces.
- **Visual direction:** established the visual language and interface direction used by the development team.

### 💻 Seller Frontend Development

I worked on seven connected areas of the Seller workspace: **Dashboard, Products, Inventory, Orders, Analytics, Store Profile and Notifications**, including their integration with supporting APIs and services.

## UI Design in Figma

Alongside Shopera's visual identity, I designed the marketplace interfaces in Figma across desktop and mobile. These designs established the layouts, visual hierarchy, navigation patterns and UI direction used by the development team when implementing the application.

### Desktop Experience

<img src="design/figma-exports/shopera-desktop-ui.png" alt="Shopera desktop marketplace UI designs created in Figma" width="1200">

*Shopera's desktop marketplace UI designs, created in Figma.*

### Mobile Experience

<img src="design/figma-exports/shopera-mobile-ui.png" alt="Shopera mobile UI designs and responsive design direction created in Figma" width="1200">

*Shopera's mobile UI designs and responsive design direction, created in Figma.*

## The Seller Experience

### Dashboard

A store overview bringing together weekly sales, recent orders, low-stock alerts and top-rated products. Sellers can reorder cards, choose which ones to display and save their layout locally.

<!-- Add real Seller Dashboard screenshot here: docs/screenshots/seller-dashboard.webp -->

### Products

Searchable, paginated product management with a detailed editor for product information, variants, SKU, pricing, stock and images. Sellers can manage product status and archive listings.

<!-- Add real Products screenshot here: docs/screenshots/seller-products.webp -->
<!-- Add a product-editor detail capture showing variants and image management. -->

### Inventory

Variant-level stock management with category and stock filters. Stock updates include conflict feedback when a record has changed since it was loaded.

<!-- Add real Inventory screenshot here: docs/screenshots/seller-inventory.webp -->

### Orders

Search and filter orders, inspect details, confirm status changes and update shipment information. CSV export supports reviewing order data outside the application.

<!-- Add real Orders screenshot here: docs/screenshots/seller-orders.webp -->

### Analytics

API-backed financial summaries, sales charts and product performance views give sellers a clearer view of store activity.

<!-- Add real Analytics screenshot here: docs/screenshots/seller-analytics.webp -->

### Store Profile

Manage store identity, logo and banner URLs, contact details and policies. The interface also presents approval feedback, supports resubmitting rejected applications and provides permitted store-status controls.

<!-- Add real Store Profile screenshot here: docs/screenshots/seller-store-profile.webp -->

### Notifications

Categorized updates with unread indicators, mark-read actions and links to related Seller activity, connected to realtime notification services.

<!-- Add real Notifications screenshot here: docs/screenshots/seller-notifications.webp -->

[Explore the Seller frontend →](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/pages/seller)

## Technical Highlights

- **Organized API integration.** Services, HTTP adapters and response mappers keep data handling separate from the page interface.
- **Inventory conflict handling.** Stock updates use the backend's row-version value to detect conflicting changes and provide feedback.
- **Detailed product editing.** Validation covers variants, duplicate SKUs and option combinations, image types and sizes, and primary-image ordering.
- **Clear async states.** Reusable loading, error and retry views support the Seller workflows, with request cancellation in dashboard and order loading.
- **Reusable Seller components.** Page shells, navigation, dashboard cards and accessible overlay behavior keep the workspace consistent.
- **Realtime notifications.** The Seller interface integrates with shared React Context and SignalR services to display incoming updates.

[Seller services](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/services/sellerService.js) · [Components](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/components/seller) · [Styles](BuyerSeller-Frontend/Ecommerce-Frontend/my-app/src/styles/seller)

## Tech Stack

| My design & frontend work | Supporting application stack |
| --- | --- |
| Figma · React · JavaScript/JSX · CSS · React Router · API integration | ASP.NET Core / .NET 10 · C# · Entity Framework Core · SQL Server · JWT · SignalR |

## Running the Project

See the [setup guide](docs/SETUP.md) for prerequisites and development commands, and [known limitations](docs/KNOWN_LIMITATIONS.md) for the current implementation status.
