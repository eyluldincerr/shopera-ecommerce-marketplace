import axiosClient, {
  configureHttpClientSession,
  HttpClientError,
} from "./axiosClient.js";
import {
  AUTH_ENDPOINTS,
  PROFILE_ENDPOINTS,
} from "../config/apiEndpoints.js";
import {
  getRoleLandingRoute,
  getSafePostLoginRoute,
} from "../routes/routePolicy.js";

const LEGACY_USERS_STORAGE_KEY = "users";

const AUTH_KEYS = [
  "token",
  "role",
  "userId",
  "fullName",
  "email",
  "phoneNumber",
  "profilePhoto",
  "sessionIssuedAt",
  "sessionExpiresAt",
];

const CHECKOUT_KEYS = [
  "checkoutShippingAddress",
  "checkoutPaymentMethod",
  "selectedCheckoutCoupon",
];

const CHECKOUT_SESSION_KEY = "shopera-checkout";
const CHECKOUT_SHIPPING_SESSION_KEY = "checkoutShippingAddress";

const ROLE_MAP = {
  buyer: "Buyer",
  seller: "Seller",
  admin: "Admin",
};

const PUBLIC_REGISTRATION_ROLES = ["Buyer", "Seller"];

export const normalizeEmail = (email = "") => email.trim().toLowerCase();

export const normalizeRole = (role = "") =>
  ROLE_MAP[String(role).trim().toLowerCase()] || "";

export const isValidPassword = (password = "") =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password);

// Retained as a compatibility alias for components that used the old name.
export const isValidDemoPassword = isValidPassword;

const normalizeUserId = (userId) => {
  if (userId === undefined || userId === null) {
    return "";
  }

  const normalizedUserId = String(userId).trim();

  return normalizedUserId && normalizedUserId !== "0" ? normalizedUserId : "";
};

const hasStorage = () => typeof localStorage !== "undefined";

const dispatchAuthChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("authChanged"));
  }
};

const isJwtLikeToken = (token) => {
  const segments = String(token || "").split(".");

  return (
    segments.length === 3 &&
    segments.every((segment) => /^[A-Za-z0-9_-]+$/.test(segment))
  );
};

const toPublicUser = (user = {}) => ({
  userId: normalizeUserId(user.userId),
  email: normalizeEmail(user.email),
  fullName: String(user.fullName || "").trim(),
  phoneNumber: String(user.phoneNumber || "").trim(),
  role: normalizeRole(user.role),
  profilePhoto: String(user.profilePhoto || ""),
});

const writeSessionValues = (session, { notify = true } = {}) => {
  if (!hasStorage()) {
    return session;
  }

  try {
    localStorage.setItem("token", session.token);
    localStorage.setItem("role", session.role);
    localStorage.setItem("userId", session.userId);
    localStorage.setItem("fullName", session.fullName);
    localStorage.setItem("email", session.email);
    localStorage.setItem("phoneNumber", session.phoneNumber);
    localStorage.setItem("profilePhoto", session.profilePhoto);
    localStorage.setItem("sessionIssuedAt", String(session.issuedAt));
    localStorage.setItem("sessionExpiresAt", String(session.expiresAt));
    localStorage.removeItem(LEGACY_USERS_STORAGE_KEY);
  } catch (error) {
    clearSession({ notify: false });
    throw error;
  }

  if (notify) {
    dispatchAuthChanged();
  }

  return session;
};

export const clearSession = ({ notify = true } = {}) => {
  if (!hasStorage()) {
    return;
  }

  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  CHECKOUT_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(LEGACY_USERS_STORAGE_KEY);

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
    sessionStorage.removeItem(CHECKOUT_SHIPPING_SESSION_KEY);
  }

  if (notify) {
    dispatchAuthChanged();
  }
};

export const getCurrentSession = () => {
  if (!hasStorage()) {
    return null;
  }

  const token = localStorage.getItem("token") || "";
  const role = normalizeRole(localStorage.getItem("role") || "");
  const userId = normalizeUserId(localStorage.getItem("userId"));
  const email = normalizeEmail(localStorage.getItem("email") || "");
  const fullName = localStorage.getItem("fullName") || "";
  const phoneNumber = localStorage.getItem("phoneNumber") || "";
  const profilePhoto = localStorage.getItem("profilePhoto") || "";
  const issuedAt = Number(localStorage.getItem("sessionIssuedAt"));
  const expiresAt = Number(localStorage.getItem("sessionExpiresAt"));

  if (
    !isJwtLikeToken(token) ||
    !role ||
    !userId ||
    !email ||
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= issuedAt ||
    expiresAt <= Date.now()
  ) {
    if (token || role || userId || email || issuedAt || expiresAt) {
      clearSession();
    }

    return null;
  }

  return {
    token,
    role,
    userId,
    email,
    fullName,
    phoneNumber,
    profilePhoto,
    issuedAt,
    expiresAt,
  };
};

export const getCurrentUser = () => getCurrentSession();

export const isAuthenticated = () => Boolean(getCurrentSession());

export const hasRole = (allowedRoles = []) => {
  const session = getCurrentSession();

  if (!session) {
    return false;
  }

  return allowedRoles.map(normalizeRole).includes(session.role);
};

export const requireCurrentSession = (allowedRoles = []) => {
  const session = getCurrentSession();
  const normalizedRoles = allowedRoles.map(normalizeRole).filter(Boolean);

  if (!session) {
    throw new Error("User session was not found or has expired.");
  }

  if (normalizedRoles.length > 0 && !normalizedRoles.includes(session.role)) {
    throw new Error("User session does not have permission for this action.");
  }

  return session;
};

export const getDefaultRouteForRole = (role) =>
  getRoleLandingRoute(normalizeRole(role));

export const getSafeRedirectPath = (candidatePath, role) =>
  getSafePostLoginRoute(candidatePath, normalizeRole(role));

const parseExpiry = (expiresAt) => {
  const parsed = Date.parse(String(expiresAt || ""));

  return Number.isFinite(parsed) ? parsed : 0;
};

const createSessionFromAuthResponse = (authResponse = {}) => {
  const publicUser = toPublicUser(authResponse);
  const token = String(authResponse.token || "").trim();
  const issuedAt = Date.now();
  const expiresAt = parseExpiry(authResponse.expiresAt);

  if (
    !publicUser.userId ||
    !publicUser.email ||
    !publicUser.role ||
    !isJwtLikeToken(token) ||
    expiresAt <= issuedAt
  ) {
    throw new HttpClientError("The authentication response was invalid.", {
      code: "INVALID_AUTH_RESPONSE",
      data: authResponse,
    });
  }

  return {
    ...publicUser,
    token,
    issuedAt,
    expiresAt,
  };
};

const saveAuthResponse = (authResponse) => {
  const session = createSessionFromAuthResponse(authResponse);

  clearSession({ notify: false });
  writeSessionValues(session);

  return session;
};

export const loginUser = async ({ email, password } = {}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw new Error("Incorrect email or password.");
  }

  const response = await axiosClient.post(AUTH_ENDPOINTS.login, {
    email: normalizedEmail,
    password,
  });
  const session = saveAuthResponse(response.data);

  return {
    token: session.token,
    session,
    user: toPublicUser(session),
  };
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const registerUser = async (registrationData = {}) => {
  const fullName = String(registrationData.fullName || "").trim();
  const email = normalizeEmail(registrationData.email);
  const phoneNumber = String(registrationData.phoneNumber || "").trim();
  const role = normalizeRole(registrationData.role);
  const password = registrationData.password || "";

  if (!fullName) {
    throw new Error("Full name is required.");
  }

  if (!validateEmail(email)) {
    throw new Error("Enter a valid email address.");
  }

  if (!isValidPassword(password)) {
    throw new Error(
      "Password must contain at least 8 characters, uppercase, lowercase and a number."
    );
  }

  if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
    throw new Error("Select a valid account type.");
  }

  const response = await axiosClient.post(AUTH_ENDPOINTS.register, {
    fullName,
    email,
    phoneNumber,
    password,
    role,
  });
  const session = saveAuthResponse(response.data);

  return {
    token: session.token,
    session,
    user: toPublicUser(session),
  };
};

export const synchronizeCurrentUser = async () => {
  const currentSession = getCurrentSession();

  if (!currentSession) {
    return null;
  }

  const response = await axiosClient.get(AUTH_ENDPOINTS.me);
  const currentUser = toPublicUser(response.data);

  if (
    !currentUser.userId ||
    currentUser.userId !== currentSession.userId ||
    !currentUser.role
  ) {
    clearSession();
    throw new HttpClientError("The current-user response was invalid.", {
      code: "INVALID_CURRENT_USER_RESPONSE",
      data: response.data,
    });
  }

  return writeSessionValues({
    ...currentSession,
    ...currentUser,
    token: currentSession.token,
    issuedAt: currentSession.issuedAt,
    expiresAt: currentSession.expiresAt,
  });
};

const saveCurrentUserResponse = (currentSession, responseData) => {
  const currentUser = toPublicUser(responseData);

  if (
    !currentUser.userId ||
    currentUser.userId !== currentSession.userId ||
    !currentUser.role ||
    currentUser.role !== currentSession.role ||
    !currentUser.email ||
    currentUser.email !== currentSession.email
  ) {
    clearSession();
    throw new HttpClientError("The profile response was invalid.", {
      code: "INVALID_PROFILE_RESPONSE",
      data: responseData,
    });
  }

  return writeSessionValues({
    ...currentSession,
    ...currentUser,
    token: currentSession.token,
    issuedAt: currentSession.issuedAt,
    expiresAt: currentSession.expiresAt,
    accountStatus: String(responseData?.accountStatus || ""),
  });
};

export const getCurrentProfile = async () => {
  const currentSession = requireCurrentSession();
  const response = await axiosClient.get(PROFILE_ENDPOINTS.me);

  return saveCurrentUserResponse(currentSession, response.data);
};

export const updateCurrentUser = async ({ fullName, phoneNumber } = {}) => {
  const currentSession = requireCurrentSession();
  const response = await axiosClient.patch(PROFILE_ENDPOINTS.me, {
    fullName: String(fullName || "").trim(),
    phoneNumber: String(phoneNumber || "").trim() || null,
  });

  return saveCurrentUserResponse(currentSession, response.data);
};

export const requestPasswordReset = async ({ email } = {}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!validateEmail(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const response = await axiosClient.post(AUTH_ENDPOINTS.forgotPassword, {
    email: normalizedEmail,
  });

  return {
    message: String(response.data?.message || ""),
    developmentResetToken: String(
      response.data?.developmentResetToken || ""
    ),
  };
};

export const resetPassword = async ({ token, newPassword } = {}) => {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    throw new Error("Password reset token is required.");
  }

  if (!isValidPassword(newPassword)) {
    throw new Error(
      "Password must contain at least 8 characters, uppercase, lowercase and a number."
    );
  }

  await axiosClient.post(AUTH_ENDPOINTS.resetPassword, {
    token: normalizedToken,
    newPassword,
  });

  return { success: true };
};

// The browser is no longer an account database. These compatibility exports
// intentionally expose no local users and never persist passwords.
export const getStoredUsers = () => [];
export const saveStoredUsers = () => [];

export const logoutUser = async () => {
  clearSession();

  return { success: true };
};

configureHttpClientSession({
  getAccessToken: () => getCurrentSession()?.token || null,
  onUnauthorized: () => clearSession(),
});
