const SESSION_KEY = "shopera.auth.session.v1";
const explicitMockMode = String(import.meta.env?.VITE_USE_MOCK_AUTH || "").toLowerCase() === "true";
const realApiMode = Boolean(import.meta.env?.VITE_API_BASE_URL) || !explicitMockMode;
let memorySession = null;

const storage = () => typeof window !== "undefined" ? window.sessionStorage : null;
const notifySessionChanged = () => {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("shopera:auth-changed"));
  }
};

export const restoreAuthenticatedSession = () => {
  if (memorySession) return memorySession;
  try {
    const saved = storage()?.getItem(SESSION_KEY);
    memorySession = saved ? JSON.parse(saved) : null;
  } catch { memorySession = null; }
  return memorySession;
};

export const setAuthenticatedSession = (session) => {
  memorySession = {
    token: String(session.token || ""),
    userId: Number(session.userId),
    email: String(session.email || ""),
    role: String(session.role || "").toUpperCase(),
    accountStatus: "ACTIVE",
  };
  storage()?.setItem(SESSION_KEY, JSON.stringify(memorySession));
  notifySessionChanged();
  return memorySession;
};

export const clearAuthenticatedSession = () => {
  memorySession = null;
  storage()?.removeItem(SESSION_KEY);
  notifySessionChanged();
};

export const getAccessToken = () => restoreAuthenticatedSession()?.token || null;
export const isRealApiMode = () => realApiMode;

export const getAuthenticatedUser = () => {
  return restoreAuthenticatedSession();
};

export const requireAuthenticatedAdmin = () => {
  const user = getAuthenticatedUser();
  if (user?.role !== "ADMIN" || user?.accountStatus !== "ACTIVE")
    throw new Error("An active administrator session is required.");
  return user;
};

export const getAuthenticatedUserId = () => requireAuthenticatedAdmin().userId;
export const requireAuthenticatedSeller = () => {
  const user = getAuthenticatedUser();
  if (user?.role !== "SELLER" || user?.accountStatus !== "ACTIVE") throw new Error("An active seller session is required.");
  return user;
};
export const requireAuthenticatedBuyer = () => {
  const user = getAuthenticatedUser();
  if (user?.role !== "BUYER" || user?.accountStatus !== "ACTIVE") throw new Error("An active buyer session is required.");
  return user;
};
