import { getCurrentSession } from "./authService.js";

const listeners = new Set();

const clone = (value) => structuredClone(value);

const getSellerSession = () => {
  const session = getCurrentSession();

  if (!session || session.role !== "Seller" || !session.userId) {
    throw new Error("An authenticated seller session is required.");
  }

  return session;
};

const scopeKey = (name) => {
  const { userId } = getSellerSession();
  return `shopera:seller:${encodeURIComponent(userId)}:${name}`;
};

const read = (name, fallback) => {
  const storedValue = localStorage.getItem(scopeKey(name));

  if (!storedValue) {
    return clone(fallback);
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    throw new Error(`Saved seller ${name} data is invalid.`);
  }
};

const cleanedSellerIds = new Set();

export const removeDeprecatedSellerProductStoreKeys = () => {
  const { userId } = getSellerSession();
  if (cleanedSellerIds.has(userId)) {
    return;
  }

  ["products", "profile"].forEach((name) => {
    localStorage.removeItem(scopeKey(name));
  });
  cleanedSellerIds.add(userId);
};

export const sellerStoreService = {
  getReviews() {
    return clone(read("reviews", []));
  },
  getPreferenceKey(name) {
    return scopeKey(`preference:${name}`);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const subscribeSellerData = (listener) =>
  sellerStoreService.subscribe(listener);
