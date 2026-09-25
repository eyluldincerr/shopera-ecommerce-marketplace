import { HttpClientError } from "./axiosClient.js";
import { getCurrentSession } from "./authService.js";
import cartHttpAdapter from "./adapters/cartHttpAdapter.js";

const isBuyerSession = (session = getCurrentSession()) =>
  session?.role === "Buyer";

const toPositiveInteger = (value, field) => {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new HttpClientError(`A valid ${field} is required.`, {
      status: 400,
      code: `INVALID_CART_${field.toUpperCase()}`,
    });
  }

  return number;
};

const requireBuyerCartSession = () => {
  const session = getCurrentSession();

  if (!session) {
    throw new HttpClientError("Please sign in again.", {
      status: 401,
      code: "CART_SESSION_REQUIRED",
    });
  }

  if (!isBuyerSession(session)) {
    throw new HttpClientError("A Buyer account is required.", {
      status: 403,
      code: "CART_BUYER_REQUIRED",
    });
  }
};

export const getBuyerCart = async (options = {}) => {
  if (!isBuyerSession()) {
    return null;
  }

  return cartHttpAdapter.getCart(options);
};

export const addCartItem = async (
  variantId,
  quantity = 1,
  options = {}
) => {
  requireBuyerCartSession();

  return cartHttpAdapter.addItem(
    toPositiveInteger(variantId, "variant ID"),
    toPositiveInteger(quantity, "quantity"),
    options
  );
};

export const updateCartItemQuantity = async (
  variantId,
  quantity,
  options = {}
) => {
  requireBuyerCartSession();

  return cartHttpAdapter.updateItem(
    toPositiveInteger(variantId, "variant ID"),
    toPositiveInteger(quantity, "quantity"),
    options
  );
};

export const removeCartItem = async (variantId, options = {}) => {
  requireBuyerCartSession();

  await cartHttpAdapter.deleteItem(
    toPositiveInteger(variantId, "variant ID"),
    options
  );
};

export const clearBuyerCart = async (_cart, options = {}) => {
  requireBuyerCartSession();

  await cartHttpAdapter.clearCart(options);
  return getBuyerCart(options);
};

// Retained only so legacy checkout/order modules can load. Cart state is never
// read from or written to browser storage.
export const getCartItems = () => [];
export const mergeCartItems = () => [];
export const saveCartItems = () => false;
export const clearCartItems = () => {};
export const replaceCartItems = () => [];
export const getOrCreateActiveCart = () => null;
export const markActiveCartConverted = () => null;
