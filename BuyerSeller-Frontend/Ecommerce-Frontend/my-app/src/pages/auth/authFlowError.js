import { HttpClientError } from "../../services/axiosClient.js";

const ERROR_KEYS = Object.freeze({
  AUTH_CURRENT_PASSWORD_INVALID: "accountProfile.errors.currentPassword",
  AUTH_PASSWORD_REUSE: "accountProfile.errors.passwordReuse",
  AUTH_PASSWORD_WEAK: "accountProfile.errors.weakPassword",
  AUTH_RESET_TOKEN_INVALID: "auth.recovery.invalidToken",
  PROFILE_ACCOUNT_INACTIVE: "accountProfile.errors.inactiveAccount",
  PROFILE_INVALID: "accountProfile.errors.invalidProfile",
  INVALID_PROFILE_RESPONSE: "accountProfile.errors.invalidResponse",
});

export const getAuthFlowErrorMessageKey = (
  error,
  fallbackKey = "auth.recovery.failure"
) => {
  const code =
    error?.code ?? error?.data?.code ?? error?.response?.data?.code;

  if (ERROR_KEYS[code]) {
    return ERROR_KEYS[code];
  }

  if (error instanceof HttpClientError && error.isNetworkError) {
    return "auth.backendConnectionFailure";
  }

  return fallbackKey;
};
