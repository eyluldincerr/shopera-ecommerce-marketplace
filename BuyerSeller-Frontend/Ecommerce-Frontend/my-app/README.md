# Shopera marketplace frontend

React/Vite application containing Buyer pages, the Seller workspace and shared infrastructure. Seller source is in [src/pages/seller](src/pages/seller), with [components](src/components/seller), [layout](src/components/layout/seller) and [styles](src/styles/seller).

See the [portfolio README](../../../README.md), [my contribution](../../../MY_CONTRIBUTION.md) and [setup guide](../../../docs/SETUP.md).

Available scripts: `npm run dev`, `npm run build`, `npm run lint`, and `npm test`. Install locked dependencies with `npm ci`. A running API, compatible database and authenticated Seller account are required for Seller data. This is not an offline Seller demo.

The shared client uses fetch; the historical axiosClient filename does not indicate an Axios dependency. Notification integration uses the SignalR JavaScript client. Tests include service behavior and source-structure assertions.
