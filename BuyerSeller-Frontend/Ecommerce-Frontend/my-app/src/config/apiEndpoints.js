const env = import.meta.env || {};

export const AUTH_ENDPOINTS = Object.freeze({
  register: env.VITE_AUTH_REGISTER_ENDPOINT || "/api/auth/register",
  login: env.VITE_AUTH_LOGIN_ENDPOINT || "/api/auth/login",
  me: env.VITE_AUTH_ME_ENDPOINT || "/api/auth/me",
  changePassword:
    env.VITE_AUTH_CHANGE_PASSWORD_ENDPOINT || "/api/auth/change-password",
  forgotPassword:
    env.VITE_AUTH_FORGOT_PASSWORD_ENDPOINT || "/api/auth/forgot-password",
  resetPassword:
    env.VITE_AUTH_RESET_PASSWORD_ENDPOINT || "/api/auth/reset-password",
});

export const PROFILE_ENDPOINTS = Object.freeze({
  me: env.VITE_PROFILE_ENDPOINT || "/api/profile",
});

export const CART_ENDPOINTS = Object.freeze({
  cart: env.VITE_CART_ENDPOINT || "/api/cart",
  items: env.VITE_CART_ITEMS_ENDPOINT || "/api/cart/items",
  item:
    env.VITE_CART_ITEM_ENDPOINT ||
    "/api/cart/items/:variantId",
});

export const ADDRESS_ENDPOINTS = Object.freeze({
  addresses:
    env.VITE_USER_ADDRESSES_ENDPOINT || "/api/user/addresses",
  address:
    env.VITE_USER_ADDRESS_ENDPOINT || "/api/user/addresses/:addressId",
});

export const PRODUCT_ENDPOINTS = Object.freeze({
  list:
    env.VITE_PRODUCTS_ENDPOINT ||
    "/api/products",
  detail:
    env.VITE_PRODUCT_DETAIL_ENDPOINT ||
    "/api/products/:productId",
  related:
    env.VITE_RELATED_PRODUCTS_ENDPOINT ||
    "/api/products/:productId/related",
  categories:
    env.VITE_PRODUCT_CATEGORIES_ENDPOINT ||
    "/api/categories",
  brands:
    env.VITE_PRODUCT_BRANDS_ENDPOINT ||
    "/api/products/brands",
  sellerList:
    env.VITE_SELLER_PRODUCTS_ENDPOINT ||
    "/api/seller/products",
  sellerDetail:
    env.VITE_SELLER_PRODUCT_DETAIL_ENDPOINT ||
    "/api/seller/products/:productId",
  sellerCreate:
    env.VITE_SELLER_PRODUCT_CREATE_ENDPOINT ||
    "/api/seller/products",
  sellerUpdate:
    env.VITE_SELLER_PRODUCT_UPDATE_ENDPOINT ||
    "/api/seller/products/:productId",
  sellerArchive:
    env.VITE_SELLER_PRODUCT_ARCHIVE_ENDPOINT ||
    "/api/seller/products/:productId",
  sellerInventoryList:
    env.VITE_SELLER_PRODUCT_INVENTORY_LIST_ENDPOINT ||
    "/api/seller/products/inventory",
  sellerInfo:
    env.VITE_SELLER_PRODUCT_INFO_ENDPOINT ||
    "/api/seller/products/:productId/info",
  sellerImages:
    env.VITE_SELLER_PRODUCT_IMAGES_ENDPOINT ||
    "/api/seller/products/:productId/images",
  sellerImage:
    env.VITE_SELLER_PRODUCT_IMAGE_ENDPOINT ||
    "/api/seller/products/:productId/images/:imageId",
  sellerVariants:
    env.VITE_SELLER_PRODUCT_VARIANTS_ENDPOINT ||
    "/api/seller/products/:productId/variants",
  sellerVariant:
    env.VITE_SELLER_PRODUCT_VARIANT_ENDPOINT ||
    env.VITE_SELLER_PRODUCT_INVENTORY_ENDPOINT ||
    "/api/seller/products/:productId/variants/:variantId",
  sellerStatus:
    env.VITE_SELLER_PRODUCT_STATUS_ENDPOINT ||
    "/api/seller/products/:productId/status",
});

export const REVIEW_ENDPOINTS = Object.freeze({
  list:
    env.VITE_PRODUCT_REVIEWS_ENDPOINT ||
    "/api/products/:productId/reviews",
  mine:
    env.VITE_MY_PRODUCT_REVIEW_ENDPOINT ||
    "/api/products/:productId/reviews/mine",
});

export const STORE_ENDPOINTS = Object.freeze({
  publicList:
    env.VITE_STORES_ENDPOINT ||
    "/api/stores",

  publicDetail:
    env.VITE_STORE_DETAIL_ENDPOINT ||
    "/api/stores/:storeId",

  publicBySlug:
    env.VITE_STORE_SLUG_ENDPOINT ||
    "/api/stores/by-slug/:storeSlug",

  publicProducts:
    env.VITE_STORE_PRODUCTS_ENDPOINT ||
    "/api/stores/:storeId/products",

  // No Store Stories backend table/endpoint exists yet.
  stories:
    env.VITE_STORE_STORIES_ENDPOINT || "",

  sellerStore:
    env.VITE_SELLER_STORE_ENDPOINT ||
    "/api/seller/store",

  sellerCreate:
    env.VITE_SELLER_STORE_CREATE_ENDPOINT ||
    "/api/seller/store",

  sellerUpdate:
    env.VITE_SELLER_STORE_UPDATE_ENDPOINT ||
    "/api/seller/store",

  sellerResubmit:
    env.VITE_SELLER_STORE_RESUBMIT_ENDPOINT ||
    "/api/seller/store/resubmit",

  sellerStatus:
    env.VITE_SELLER_STORE_STATUS_ENDPOINT ||
    "/api/seller/store/status",
});


export const NOTIFICATION_ENDPOINTS = Object.freeze({
  hub:
    env.VITE_NOTIFICATION_HUB_ENDPOINT ||
    "/hubs/notifications",
  list:
    env.VITE_NOTIFICATIONS_ENDPOINT ||
    "/api/notifications",
  unreadCount:
    env.VITE_NOTIFICATIONS_UNREAD_COUNT_ENDPOINT ||
    "/api/notifications/unread-count",
  read:
    env.VITE_NOTIFICATION_READ_ENDPOINT ||
    "/api/notifications/:notificationId/read",
  readAll:
    env.VITE_NOTIFICATIONS_READ_ALL_ENDPOINT ||
    "/api/notifications/read-all",
});


export const WISHLIST_ENDPOINTS = Object.freeze({
  wishlist:
    env.VITE_WISHLIST_ENDPOINT ||
    "/api/wishlist",
  items:
    env.VITE_WISHLIST_ITEMS_ENDPOINT ||
    "/api/wishlist/items",
  item:
    env.VITE_WISHLIST_ITEM_ENDPOINT ||
    "/api/wishlist/items/:variantId",
});

export const COUPON_ENDPOINTS = Object.freeze({
  list:
    env.VITE_COUPONS_ENDPOINT ||
    "/api/coupons",
  validate:
    env.VITE_COUPON_VALIDATE_ENDPOINT ||
    "/api/coupons/validate",
});


export const SELLER_ANALYTICS_ENDPOINTS = Object.freeze({
  analytics:
    env.VITE_SELLER_ANALYTICS_ENDPOINT ||
    "/api/seller/analytics",
});

export const ORDER_ENDPOINTS = Object.freeze({
  checkout:
    env.VITE_ORDER_CHECKOUT_ENDPOINT ||
    "/api/orders/checkout",

  buyerList:
    env.VITE_BUYER_ORDERS_ENDPOINT ||
    "/api/orders",

  buyerDetail:
    env.VITE_BUYER_ORDER_DETAIL_ENDPOINT ||
    "/api/orders/:orderId",

  buyerCancel:
    env.VITE_BUYER_ORDER_CANCEL_ENDPOINT ||
    "/api/orders/:orderId/cancel",

  buyerReorder:
    env.VITE_BUYER_ORDER_REORDER_ENDPOINT ||
    "/api/orders/:orderId/reorder",

  buyerArchive:
    env.VITE_BUYER_ORDER_ARCHIVE_ENDPOINT ||
    "/api/orders/:orderId/archive",

  sellerList:
    env.VITE_SELLER_ORDERS_ENDPOINT ||
    "/api/orders/seller",

  sellerDetail:
    env.VITE_SELLER_ORDER_DETAIL_ENDPOINT ||
    "/api/orders/seller/:orderId",

  sellerStatus:
    env.VITE_SELLER_ORDER_STATUS_ENDPOINT ||
    "/api/orders/:orderId/status",

  sellerShipment:
    env.VITE_SELLER_ORDER_SHIPMENT_ENDPOINT ||
    "/api/orders/:orderId/shipment",
});

export const PROMOTION_ENDPOINTS = Object.freeze({
  // Public
  activeCampaigns: env.VITE_PROMOTION_ACTIVE_CAMPAIGNS_ENDPOINT || "/api/promotions/campaigns/active",
  campaignImage: env.VITE_PROMOTION_CAMPAIGN_IMAGE_ENDPOINT || "/api/promotions/campaigns/:campaignId/image",

  // Admin
  adminPlans: env.VITE_ADMIN_PROMOTION_PLANS_ENDPOINT || "/api/admin/promotions/plans",
  adminPlan: env.VITE_ADMIN_PROMOTION_PLAN_ENDPOINT || "/api/admin/promotions/plans/:planId",
  adminCampaigns: env.VITE_ADMIN_PROMOTION_CAMPAIGNS_ENDPOINT || "/api/admin/promotions/campaigns",
  adminCampaign: env.VITE_ADMIN_PROMOTION_CAMPAIGN_ENDPOINT || "/api/admin/promotions/campaigns/:campaignId",
  adminCampaignStatus: env.VITE_ADMIN_PROMOTION_CAMPAIGN_STATUS_ENDPOINT || "/api/admin/promotions/campaigns/:campaignId/status",
});