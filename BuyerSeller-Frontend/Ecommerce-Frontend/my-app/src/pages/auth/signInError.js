import { HttpClientError } from "../../services/axiosClient.js";

const AUTHENTICATION_ERROR_STATUSES = new Set([400, 401]);
const AUTHENTICATION_ERROR_CODES = new Set([
  "AUTH_INVALID_CREDENTIALS",
  "HTTP_401",
]);

export const getSignInErrorMessageKey = (error) => {
  const status = error?.status ?? error?.response?.status;
  const code = error?.code ?? error?.data?.code ?? error?.response?.data?.code;

  if (code === "AUTH_ACCOUNT_INACTIVE") {
    return "auth.accountInactive";
  }

  if (
    AUTHENTICATION_ERROR_STATUSES.has(status) ||
    AUTHENTICATION_ERROR_CODES.has(code)
  ) {
    return "auth.incorrectCredentials";
  }

  if (error instanceof HttpClientError && error.isNetworkError) {
    return "auth.backendConnectionFailure";
  }

  return "auth.signInFailure";
};
