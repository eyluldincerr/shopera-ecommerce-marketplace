export const ROUTES = Object.freeze({
  HOME: "/",
  CATEGORY: "/categories/:categorySlug",
  COLLECTION: "/collections/:collectionSlug",
  SEARCH: "/search",
  PRODUCT: "/products/:productId",
  STORES: "/stores",
  STORE: "/stores/:storeId",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  WISHLIST: "/wishlist",
  CART: "/cart",
  CHECKOUT: "/checkout",
  CHECKOUT_SHIPPING: "/checkout/shipping",
  CHECKOUT_REVIEW: "/checkout/review",
  ORDERS: "/orders",
  ACCOUNT_ORDERS: "/account/orders",
  ORDER_DETAIL: "/orders/:orderId",
  NOTIFICATIONS: "/notifications",
  ACCOUNT_PROFILE: "/account/profile",
  ACCOUNT_ADDRESSES: "/account/addresses",
  ACCOUNT_PAYMENT_METHODS: "/account/payment-methods",
  ACCOUNT_COUPONS: "/account/coupons",
  ACCOUNT_SUPPORT: "/account/support",
  SELLER_DASHBOARD: "/seller/dashboard",
  SELLER_ORDERS: "/seller/orders",
  SELLER_PRODUCTS: "/seller/products",
  SELLER_INVENTORY: "/seller/inventory",
  SELLER_ANALYTICS: "/seller/analytics",
  SELLER_STORE_PROFILE: "/seller/store-profile",
  SELLER_STORE_MEDIA: "/seller/store-media",
  SELLER_STORE_PREVIEW: "/seller/store-preview",
  SELLER_NOTIFICATIONS: "/seller/notifications",
});

export const ROUTE_ACCESS = Object.freeze({
  PUBLIC: "Public",
  GUEST_ONLY: "Guest",
  AUTHENTICATED: "Authenticated",
  BUYER: "Buyer",
  SELLER: "Seller",
});

export const APP_ROUTE_POLICIES = Object.freeze([
  { path: ROUTES.HOME, access: ROUTE_ACCESS.PUBLIC },
  { path: ROUTES.CATEGORY, access: ROUTE_ACCESS.PUBLIC },
  { path: ROUTES.COLLECTION, access: ROUTE_ACCESS.PUBLIC },
  { path: ROUTES.SEARCH, access: ROUTE_ACCESS.PUBLIC },
  { path: ROUTES.PRODUCT, access: ROUTE_ACCESS.PUBLIC },
  { path: ROUTES.STORES, access: ROUTE_ACCESS.PUBLIC },
  { path: ROUTES.STORE, access: ROUTE_ACCESS.PUBLIC },
  { path: ROUTES.LOGIN, access: ROUTE_ACCESS.GUEST_ONLY },
  { path: ROUTES.REGISTER, access: ROUTE_ACCESS.GUEST_ONLY },
  { path: ROUTES.FORGOT_PASSWORD, access: ROUTE_ACCESS.GUEST_ONLY },
  { path: ROUTES.RESET_PASSWORD, access: ROUTE_ACCESS.GUEST_ONLY },
  { path: ROUTES.WISHLIST, access: ROUTE_ACCESS.BUYER },
  { path: ROUTES.CART, access: ROUTE_ACCESS.BUYER },
  { path: ROUTES.CHECKOUT, access: ROUTE_ACCESS.BUYER, guard: "checkout" },
  {
    path: ROUTES.CHECKOUT_SHIPPING,
    access: ROUTE_ACCESS.BUYER,
    guard: "checkout",
  },
  {
    path: ROUTES.CHECKOUT_REVIEW,
    access: ROUTE_ACCESS.BUYER,
    guard: "checkout",
  },
  { path: ROUTES.ORDERS, access: ROUTE_ACCESS.BUYER },
  { path: ROUTES.ACCOUNT_ORDERS, access: ROUTE_ACCESS.BUYER },
  { path: ROUTES.ORDER_DETAIL, access: ROUTE_ACCESS.BUYER },
  { path: ROUTES.NOTIFICATIONS, access: ROUTE_ACCESS.BUYER },
  { path: ROUTES.ACCOUNT_PROFILE, access: ROUTE_ACCESS.AUTHENTICATED },
  { path: ROUTES.ACCOUNT_ADDRESSES, access: ROUTE_ACCESS.BUYER },
  {
    path: ROUTES.ACCOUNT_PAYMENT_METHODS,
    access: ROUTE_ACCESS.BUYER,
  },
  { path: ROUTES.ACCOUNT_COUPONS, access: ROUTE_ACCESS.BUYER },
  { path: ROUTES.ACCOUNT_SUPPORT, access: ROUTE_ACCESS.BUYER },
  { path: ROUTES.SELLER_DASHBOARD, access: ROUTE_ACCESS.SELLER },
  { path: ROUTES.SELLER_ORDERS, access: ROUTE_ACCESS.SELLER },
  { path: ROUTES.SELLER_PRODUCTS, access: ROUTE_ACCESS.SELLER },
  { path: ROUTES.SELLER_INVENTORY, access: ROUTE_ACCESS.SELLER },
  { path: ROUTES.SELLER_ANALYTICS, access: ROUTE_ACCESS.SELLER },
  { path: ROUTES.SELLER_STORE_PROFILE, access: ROUTE_ACCESS.SELLER },
  { path: ROUTES.SELLER_STORE_MEDIA, access: ROUTE_ACCESS.SELLER },
  { path: ROUTES.SELLER_STORE_PREVIEW, access: ROUTE_ACCESS.SELLER },
  { path: ROUTES.SELLER_NOTIFICATIONS, access: ROUTE_ACCESS.SELLER },
]);

const normalizeRoutedRole = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (normalizedRole === "buyer") {
    return ROUTE_ACCESS.BUYER;
  }

  if (normalizedRole === "seller") {
    return ROUTE_ACCESS.SELLER;
  }

  return "";
};

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const routePatternToRegExp = (routePattern) => {
  if (routePattern === ROUTES.HOME) {
    return /^\/$/i;
  }

  const pattern = routePattern
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? "[^/]+" : escapeRegExp(segment)
    )
    .join("/");

  return new RegExp(`^${pattern}/?$`, "i");
};

const getInternalUrl = (candidatePath) => {
  const hasControlCharacter = Array.from(candidatePath || "").some(
    (character) => character.charCodeAt(0) < 32
  );

  if (
    typeof candidatePath !== "string" ||
    !candidatePath.startsWith("/") ||
    candidatePath.startsWith("//") ||
    candidatePath.includes("\\") ||
    hasControlCharacter
  ) {
    return null;
  }

  try {
    const url = new URL(candidatePath, "https://shopera.local");
    const decodedPathname = decodeURIComponent(url.pathname);

    if (
      url.origin !== "https://shopera.local" ||
      decodedPathname.includes("\\") ||
      decodedPathname.split("/").some((segment) => segment === "..")
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};

export const getRoutePolicy = (candidatePath) => {
  const url = getInternalUrl(candidatePath);

  if (!url) {
    return null;
  }

  return (
    APP_ROUTE_POLICIES.find((policy) =>
      routePatternToRegExp(policy.path).test(url.pathname)
    ) || null
  );
};

export const getRoleLandingRoute = (role) =>
  normalizeRoutedRole(role) === ROUTE_ACCESS.SELLER
    ? ROUTES.SELLER_DASHBOARD
    : ROUTES.HOME;

export const getUnauthorizedRoleRoute = (role) =>
  getRoleLandingRoute(role);

export const getGuestOnlyRedirect = (role) => getRoleLandingRoute(role);

export const getPostLogoutRoute = () => ROUTES.HOME;

export const getExpiredSessionRoute = () => ROUTES.LOGIN;

export const getStoreRoute = (storeId) => {
  const normalizedStoreId = String(storeId ?? "").trim();

  if (!/^[1-9]\d*$/.test(normalizedStoreId)) {
    return ROUTES.STORES;
  }

  return ROUTES.STORE.replace(
    ":storeId",
    encodeURIComponent(normalizedStoreId)
  );
};

export const getOrderDetailRoute = (orderId) => {
  const normalizedOrderId = String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    return "";
  }

  return ROUTES.ORDER_DETAIL.replace(
    ":orderId",
    encodeURIComponent(normalizedOrderId)
  );
};

export const getAccountActionRoute = (role) => {
  const normalizedRole = normalizeRoutedRole(role);

  if (normalizedRole === ROUTE_ACCESS.SELLER) {
    return ROUTES.SELLER_DASHBOARD;
  }

  if (normalizedRole === ROUTE_ACCESS.BUYER) {
    return ROUTES.ACCOUNT_PROFILE;
  }

  return ROUTES.LOGIN;
};

export const getNotFoundAction = (role) => {
  const normalizedRole = normalizeRoutedRole(role);

  if (normalizedRole === ROUTE_ACCESS.SELLER) {
    return {
      to: ROUTES.SELLER_DASHBOARD,
      labelKey: "notFound.actions.seller",
    };
  }

  if (normalizedRole === ROUTE_ACCESS.BUYER) {
    return {
      to: ROUTES.HOME,
      labelKey: "notFound.actions.buyer",
    };
  }

  return {
    to: ROUTES.HOME,
    labelKey: "notFound.actions.guest",
  };
};

export const getSafePostLoginRoute = (candidatePath, role) => {
  const normalizedRole = normalizeRoutedRole(role);
  const policy = getRoutePolicy(candidatePath);

  if (
    !normalizedRole ||
    !policy ||
    policy.access === ROUTE_ACCESS.GUEST_ONLY
  ) {
    return getRoleLandingRoute(normalizedRole);
  }

  const isAllowed =
    policy.access === ROUTE_ACCESS.PUBLIC ||
    policy.access === ROUTE_ACCESS.AUTHENTICATED ||
    policy.access === normalizedRole;

  return isAllowed ? candidatePath : getRoleLandingRoute(normalizedRole);
};

export const getLocationPath = ({ pathname = "/", search = "", hash = "" }) =>
  `${pathname}${search}${hash}`;

export const getRouteDecision = ({
  path,
  role,
  isAuthenticated = Boolean(role),
}) => {
  const policy = getRoutePolicy(path);
  const hasSession = Boolean(isAuthenticated);
  const normalizedRole = isAuthenticated ? normalizeRoutedRole(role) : "";

  if (!policy) {
    return { outcome: "not-found", destination: null, policy: null };
  }

  if (policy.access === ROUTE_ACCESS.GUEST_ONLY && hasSession) {
    return {
      outcome: "redirect",
      destination: getGuestOnlyRedirect(normalizedRole),
      policy,
    };
  }

  if (
    policy.access === ROUTE_ACCESS.BUYER ||
    policy.access === ROUTE_ACCESS.SELLER ||
    policy.access === ROUTE_ACCESS.AUTHENTICATED
  ) {
    if (!hasSession) {
      return {
        outcome: "redirect",
        destination: getExpiredSessionRoute(),
        policy,
      };
    }

    if (
      !normalizedRole ||
      (policy.access !== ROUTE_ACCESS.AUTHENTICATED &&
        policy.access !== normalizedRole)
    ) {
      return {
        outcome: "redirect",
        destination: getUnauthorizedRoleRoute(normalizedRole),
        policy,
      };
    }
  }

  return { outcome: "render", destination: null, policy };
};
