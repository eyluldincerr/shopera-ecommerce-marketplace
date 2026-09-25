// Buyer-facing informational copy only. These entries describe behavior that is
// already supported by the current Cart/Order/Shipment/Review flows and avoid
// invented delivery dates, customer counts, payment claims, or return promises.
export const productDeliveryInfo = [
  {
    id: "shipping-status",
    titleKey: "buyer.product.deliveryInfo.shippingStatus.title",
    descriptionKey: "buyer.product.deliveryInfo.shippingStatus.description",
    icon: "Ship",
  },
  {
    id: "tracking",
    titleKey: "buyer.product.deliveryInfo.tracking.title",
    descriptionKey: "buyer.product.deliveryInfo.tracking.description",
    icon: "Box",
  },
  {
    id: "delivered-review",
    titleKey: "buyer.product.deliveryInfo.deliveredReview.title",
    descriptionKey: "buyer.product.deliveryInfo.deliveredReview.description",
    icon: "Star",
  },
];

export const productTrustInfo = [
  {
    id: "live-stock",
    titleKey: "buyer.product.trustInfo.liveStock.title",
    descriptionKey: "buyer.product.trustInfo.liveStock.description",
    icon: "Stock",
  },
  {
    id: "order-history",
    titleKey: "buyer.product.trustInfo.orderHistory.title",
    descriptionKey: "buyer.product.trustInfo.orderHistory.description",
    icon: "Order",
  },
  {
    id: "verified-review",
    titleKey: "buyer.product.trustInfo.verifiedReviews.title",
    descriptionKey: "buyer.product.trustInfo.verifiedReviews.description",
    icon: "Review",
  },
];
