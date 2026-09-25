const authUsers = new Map([
  [
    "buyer@shopera.demo",
    {
      password: "Buyer123!",
      userId: 1001,
      fullName: "Demo Buyer",
      email: "buyer@shopera.demo",
      phoneNumber: "",
      role: "BUYER",
    },
  ],
  [
    "seller@shopera.demo",
    {
      password: "Seller123!",
      userId: 2001,
      fullName: "Demo Seller",
      email: "seller@shopera.demo",
      phoneNumber: "",
      role: "SELLER",
    },
  ],
]);

globalThis.__shoperaAuthRequests = [];
let currentUser = null;

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const authenticatedResponse = (user) => ({
  ...user,
  token: `eyJhbGciOiJIUzI1NiJ9.dXNlci0${user.userId}.c2lnbmF0dXJl`,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input), "http://shopera.test");
  const requestBody = options.body ? JSON.parse(options.body) : null;

  globalThis.__shoperaAuthRequests.push({
    path: url.pathname,
    method: options.method || "GET",
    body: requestBody,
    headers: options.headers,
  });

  if (url.pathname === "/api/auth/login") {
    const email = String(requestBody?.email || "").toLowerCase();
    const user = authUsers.get(email);

    if (!user || user.password !== requestBody?.password) {
      return jsonResponse(
        { title: "Unauthorized", detail: "Incorrect email or password." },
        401
      );
    }

    currentUser = user;
    return jsonResponse(authenticatedResponse(user));
  }

  if (url.pathname === "/api/auth/register") {
    currentUser = {
      userId: 3001,
      fullName: requestBody.fullName,
      email: requestBody.email,
      phoneNumber: requestBody.phoneNumber || "",
      role: String(requestBody.role || "").toUpperCase(),
    };

    return jsonResponse(authenticatedResponse(currentUser), 201);
  }

  if (url.pathname === "/api/auth/me" && currentUser) {
    return jsonResponse(currentUser);
  }

  if (url.pathname === "/api/profile" && currentUser) {
    if ((options.method || "GET") === "PATCH") {
      currentUser = {
        ...currentUser,
        fullName: requestBody.fullName,
        phoneNumber: requestBody.phoneNumber || "",
      };
    }

    return jsonResponse({
      ...currentUser,
      accountStatus: "ACTIVE",
    });
  }

  if (url.pathname === "/api/auth/change-password" && currentUser) {
    if (requestBody?.currentPassword === "WrongPassword1") {
      return jsonResponse(
        {
          code: "AUTH_CURRENT_PASSWORD_INVALID",
          message: "Current password is incorrect.",
        },
        400
      );
    }

    return new Response(null, { status: 204 });
  }

  if (url.pathname === "/api/auth/forgot-password") {
    return jsonResponse(
      {
        message:
          "If an active account uses this email, password reset instructions have been created.",
        developmentResetToken: "development-reset-token",
      },
      202
    );
  }

  if (url.pathname === "/api/auth/reset-password") {
    if (requestBody?.token !== "development-reset-token") {
      return jsonResponse(
        {
          code: "AUTH_RESET_TOKEN_INVALID",
          message: "Password reset token is invalid, expired, or already used.",
        },
        400
      );
    }

    return new Response(null, { status: 204 });
  }

  throw new TypeError(`Unhandled test request: ${url.pathname}`);
};
