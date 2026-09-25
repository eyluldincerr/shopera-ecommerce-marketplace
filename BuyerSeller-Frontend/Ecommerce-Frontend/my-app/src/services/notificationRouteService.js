import { getNotificationPresentation } from "./notificationPresentationService.js";

const relatedEntityRoutes = {
  order: {
    actionLabel: "View order",
    actionKey: "buyer.notifications.actions.viewOrder",
    buildRoute: (relatedEntityId) =>
      `/orders/${encodeURIComponent(relatedEntityId)}`,
    requiresId: true,
  },
  product: {
    actionLabel: "View product",
    actionKey: "buyer.notifications.actions.viewProduct",
    buildRoute: (relatedEntityId) =>
      `/products/${encodeURIComponent(relatedEntityId)}`,
    requiresId: true,
  },
  wishlistitem: {
    actionLabel: "View wishlist",
    actionKey: "buyer.notifications.actions.viewWishlist",
    buildRoute: () => "/wishlist",
    requiresId: false,
  },
  coupon: {
    actionLabel: "View coupon",
    actionKey: "buyer.notifications.actions.viewCoupon",
    buildRoute: () => "/account/coupons",
    requiresId: false,
  },
  account: {
    actionLabel: "Review account",
    actionKey: "buyer.notifications.actions.reviewAccount",
    buildRoute: () => "/account/profile",
    requiresId: false,
  },
};

export const getNotificationDestination = (notification = {}, role = "Buyer") => {
  if (notification.relatedEntityAvailable === false) {
    return null;
  }
  const relatedEntityType = String(notification.relatedEntityType || "")
    .trim()
    .toLowerCase();
  const relatedEntityId = notification.relatedEntityId;
  const routeConfig = relatedEntityRoutes[relatedEntityType];

  if (role === "Seller") {
    if (relatedEntityType === "order") {
      return "/seller/orders";
    }
    if (relatedEntityType === "product") {
      return "/seller/products";
    }
    if (relatedEntityType === "account") {
      return "/account/profile";
    }
    return null;
  }

  if (
    !routeConfig ||
    (routeConfig.requiresId &&
      (relatedEntityId === undefined ||
        relatedEntityId === null ||
        relatedEntityId === ""))
  ) {
    return null;
  }

  return routeConfig.buildRoute(String(relatedEntityId || ""));
};

export const getNotificationActionLabel = (notification = {}, role = "Buyer") => {
  const relatedEntityType = String(notification.relatedEntityType || "")
    .trim()
    .toLowerCase();
  const routeConfig = relatedEntityRoutes[relatedEntityType];

  if (role === "Seller") {
    if (relatedEntityType === "order") return "View Order";
    if (relatedEntityType === "product") return "View Product";
  }

  return (
    routeConfig?.actionLabel ||
    getNotificationPresentation(notification.notificationType).actionLabel
  );
};

export const getNotificationActionKey = (notification = {}, role = "Buyer") => {
  const relatedEntityType = String(notification.relatedEntityType || "")
    .trim()
    .toLowerCase();
  const routeConfig = relatedEntityRoutes[relatedEntityType];

  if (role === "Seller") {
    if (relatedEntityType === "order") return "notifications.actions.viewOrder";
    if (relatedEntityType === "product") return "notifications.actions.viewProduct";
  }

  return (
    routeConfig?.actionKey ||
    getNotificationPresentation(notification.notificationType).actionKey
  );
};
