import { api, ApiError } from "./apiClient.js";
import { clearAuthenticatedSession, setAuthenticatedSession } from "../auth/authSession.js";

export const login = async ({ email, password }) => {
  const response = await api.post("/api/Auth/login", { email, password }, { token: null });
  const role = String(response?.role || "").trim().toUpperCase();

  if (role !== "ADMIN") {
    clearAuthenticatedSession();
    throw new ApiError("This login is not authorized for the Admin workspace.", {
      status: 403,
      title: "Admin access required",
      detail: "This account is not an administrator account.",
      code: "ADMIN_ROLE_REQUIRED",
    });
  }

  return setAuthenticatedSession(response);
};

export const logout = () => clearAuthenticatedSession();
