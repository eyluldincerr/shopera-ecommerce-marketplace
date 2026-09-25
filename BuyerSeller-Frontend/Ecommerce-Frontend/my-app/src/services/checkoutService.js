import { requireCurrentSession } from "./authService.js";
import { clearSelectedCoupon } from "./couponService.js";
import { HttpClientError } from "./axiosClient.js";
import checkoutHttpAdapter from "./adapters/checkoutHttpAdapter.js";
import { getOrderDetailRoute } from "../routes/routePolicy.js";

const CHECKOUT_STORAGE_KEY = "shopera-checkout";
const CHECKOUT_SHIPPING_ADDRESS_KEY = "checkoutShippingAddress";
const CHECKOUT_COMPLETION_KEY = "shopera-checkout-completion";
const CHECKOUT_COMPLETION_TTL = 2 * 60 * 1000;
const LEGACY_CHECKOUT_PAYMENT_KEY = "checkoutPaymentMethod";
const LEGACY_PAYMENT_METHODS_KEY = "paymentMethods";

export const initialCheckoutState = {
  shipping: {
    fullName: "",
    phone: "",
    email: "",
    country: "",
    city: "",
    address: "",
    apartment: "",
    postalCode: "",
    saveAddress: false,
  },
  savedAddresses: [],
  selectedAddressId: "",
};

const readObject = (storage, key) => {
  try {
    const value = storage?.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const removeLegacyPaymentStorage = () => {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(LEGACY_CHECKOUT_PAYMENT_KEY);
  localStorage.removeItem(LEGACY_PAYMENT_METHODS_KEY);
};

const sanitizeCheckoutState = (checkoutState = {}) => {
  const { payment: _legacyPayment, ...state } = checkoutState;

  return {
    ...state,
    shipping: {
      ...initialCheckoutState.shipping,
      ...state.shipping,
    },
    savedAddresses: [],
    selectedAddressId: state.selectedAddressId || "",
  };
};

export const readCheckoutState = () => {
  removeLegacyPaymentStorage();

  if (typeof sessionStorage === "undefined") {
    return initialCheckoutState;
  }

  const parsed = readObject(sessionStorage, CHECKOUT_STORAGE_KEY);

  if (!parsed) {
    return initialCheckoutState;
  }

  const safeState = sanitizeCheckoutState(parsed);
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(safeState));

  return safeState;
};

export const writeCheckoutState = (checkoutState) => {
  removeLegacyPaymentStorage();

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(
      CHECKOUT_STORAGE_KEY,
      JSON.stringify(sanitizeCheckoutState(checkoutState))
    );
  }
};

export const clearCheckoutState = () => {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    sessionStorage.removeItem(CHECKOUT_SHIPPING_ADDRESS_KEY);
  }

  if (typeof localStorage !== "undefined") {
    removeLegacyPaymentStorage();
    clearSelectedCoupon();
  }
};

export const clearCheckoutCompletionInProgress = () => {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(CHECKOUT_COMPLETION_KEY);
  }
};

export const markCheckoutCompletionInProgress = (orderId) => {
  const orderPath = getOrderDetailRoute(orderId);

  if (!orderPath || typeof sessionStorage === "undefined") {
    return "";
  }

  sessionStorage.setItem(
    CHECKOUT_COMPLETION_KEY,
    JSON.stringify({ orderId, startedAt: Date.now() })
  );

  return orderPath;
};

export const getCheckoutCompletionOrderPath = () => {
  if (typeof sessionStorage === "undefined") {
    return "";
  }

  const completion = readObject(sessionStorage, CHECKOUT_COMPLETION_KEY);
  const isExpired =
    !completion ||
    Date.now() - Number(completion.startedAt) > CHECKOUT_COMPLETION_TTL;

  if (!completion?.orderId || isExpired) {
    sessionStorage.removeItem(CHECKOUT_COMPLETION_KEY);
    return "";
  }

  return getOrderDetailRoute(completion.orderId);
};

export const getCheckoutShippingAddress = () =>
  typeof sessionStorage === "undefined"
    ? null
    : readObject(sessionStorage, CHECKOUT_SHIPPING_ADDRESS_KEY);

export const clearCheckoutShippingAddress = () => {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(CHECKOUT_SHIPPING_ADDRESS_KEY);
  }
};

export const saveCheckoutShippingAddress = (address) => {
  requireCurrentSession(["Buyer"]);
  sessionStorage.setItem(
    CHECKOUT_SHIPPING_ADDRESS_KEY,
    JSON.stringify(address)
  );
};

const hasValues = (object, names) =>
  names.every((name) => String(object?.[name] ?? "").trim());

export const isShippingValid = (shipping) => {
  const snapshot = getCheckoutShippingAddress();
  return snapshot
    ? hasValues(snapshot, [
        "recipientName",
        "country",
        "city",
        "streetAddress",
      ])
    : hasValues(shipping, [
        "fullName",
        "phone",
        "email",
        "country",
        "city",
        "address",
        "postalCode",
      ]);
};

const requiredText = (value) => String(value ?? "").trim();
const optionalText = (value) => requiredText(value) || null;

export const createCheckoutAddressRequest = (address = {}) => ({
  recipientName: requiredText(address.recipientName),
  recipientPhone: optionalText(address.recipientPhone),
  streetAddress: requiredText(address.streetAddress),
  city: requiredText(address.city),
  stateProvince: optionalText(address.stateProvince),
  postalCode: optionalText(address.postalCode),
  country: requiredText(address.country),
});

export const createCheckoutRequest = ({ shippingAddress, couponCode } = {}) => {
  const canonicalAddress = createCheckoutAddressRequest(shippingAddress);

  if (
    !canonicalAddress.recipientName ||
    !canonicalAddress.streetAddress ||
    !canonicalAddress.city ||
    !canonicalAddress.country
  ) {
    throw new HttpClientError("A complete shipping address is required.", {
      status: 400,
      code: "INVALID_CHECKOUT_ADDRESS",
    });
  }

  return {
    couponCode: String(couponCode ?? "").trim().toUpperCase() || null,
    shippingAddress: canonicalAddress,
    billingAddress: { ...canonicalAddress },
  };
};

export const submitCheckout = async ({
  shippingAddress,
  cart,
  couponCode,
  signal,
} = {}) => {
  requireCurrentSession(["Buyer"]);

  const order = await checkoutHttpAdapter.submit(
    createCheckoutRequest({ shippingAddress, cart, couponCode }),
    { signal }
  );

  const orderId = Number(order?.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpClientError("The order response did not include an order ID.", {
      code: "INVALID_CHECKOUT_RESPONSE",
      data: order,
    });
  }

  return { ...order, orderId };
};

export const calculateCheckoutEstimate = ({
  cartItems = [],
} = {}) => {
  const subtotal = cartItems.reduce(
    (sum, item) =>
      sum +
      Number(
        item.currentUnitPrice ??
        item.price ??
        item.CurrentUnitPrice ??
        item.UnitPriceAtAdd ??
        0
      ) * Math.max(0, Number(item.quantity ?? item.Quantity) || 0),
    0
  );
  const stockConflicts = cartItems
    .map((item) => {
      const requested = Number(item.quantity ?? item.Quantity) || 0;
      const available = Number(
        item.stockQuantity ??
        item.availableStock ??
        item.StockQuantity ??
        item.AvailableStock
      );
      return Number.isFinite(available) && requested > available
        ? {
            variantId: item.variantId ?? item.VariantID,
            requested,
            available,
          }
        : null;
    })
    .filter(Boolean);

  return {
    subtotal,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: Math.max(subtotal, 0),
    stockConflicts,
    couponError: null,
    isEstimate: true,
    authority: "backend-current-price-preview",
  };
};
