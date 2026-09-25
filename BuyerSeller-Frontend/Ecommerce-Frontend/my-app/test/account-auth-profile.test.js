import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
};
globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
globalThis.window = { dispatchEvent: () => {} };

const {
  loginUser,
  requestPasswordReset,
  resetPassword,
} = await import("../src/services/authService.js");
const {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} = await import("../src/services/accountService.js");
const { getAuthFlowErrorMessageKey } = await import(
  "../src/pages/auth/authFlowError.js"
);

const signIn = async (email = "buyer@shopera.demo") => {
  values.clear();
  globalThis.__shoperaAuthRequests.length = 0;
  await loginUser({
    email,
    password: email.startsWith("seller") ? "Seller123!" : "Buyer123!",
  });
  globalThis.__shoperaAuthRequests.length = 0;
};

test("profile loads from the protected backend and sends the JWT", async () => {
  await signIn();
  const profile = await getMyProfile();
  const request = globalThis.__shoperaAuthRequests.at(-1);

  assert.equal(profile.userId, "1001");
  assert.equal(profile.email, "buyer@shopera.demo");
  assert.equal(request.path, "/api/profile");
  assert.equal(request.method, "GET");
  assert.match(request.headers.get("Authorization"), /^Bearer /);
});

test("profile update sends only editable fields and refreshes the session", async () => {
  await signIn();
  const profile = await updateMyProfile({
    fullName: "Updated Buyer",
    phoneNumber: "+90 555 111 2233",
    email: "attacker@example.test",
    role: "Admin",
  });
  const request = globalThis.__shoperaAuthRequests.at(-1);

  assert.equal(request.path, "/api/profile");
  assert.equal(request.method, "PATCH");
  assert.deepEqual(request.body, {
    fullName: "Updated Buyer",
    phoneNumber: "+90 555 111 2233",
  });
  assert.equal(profile.email, "buyer@shopera.demo");
  assert.equal(profile.role, "Buyer");
  assert.equal(localStorage.getItem("fullName"), "Updated Buyer");
});

test("password change sends no confirmation value and stores no password", async () => {
  await signIn();
  await changeMyPassword({
    currentPassword: "Buyer123!",
    newPassword: "NewPassword2",
    confirmPassword: "NewPassword2",
  });
  const request = globalThis.__shoperaAuthRequests.at(-1);

  assert.equal(request.path, "/api/auth/change-password");
  assert.equal(request.method, "POST");
  assert.deepEqual(request.body, {
    currentPassword: "Buyer123!",
    newPassword: "NewPassword2",
  });
  assert.equal(localStorage.getItem("password"), null);
  assert.equal(JSON.stringify([...values.entries()]).includes("NewPassword2"), false);
});

test("forgot password normalizes email and exposes only the development token", async () => {
  values.clear();
  globalThis.__shoperaAuthRequests.length = 0;
  const result = await requestPasswordReset({
    email: "  BUYER@SHOPERA.DEMO ",
  });
  const request = globalThis.__shoperaAuthRequests.at(-1);

  assert.equal(request.path, "/api/auth/forgot-password");
  assert.deepEqual(request.body, { email: "buyer@shopera.demo" });
  assert.equal(result.developmentResetToken, "development-reset-token");
  assert.match(result.message, /If an active account/);
});

test("reset password uses the confirmed backend contract", async () => {
  globalThis.__shoperaAuthRequests.length = 0;
  await resetPassword({
    token: " development-reset-token ",
    newPassword: "ResetPassword2",
  });
  const request = globalThis.__shoperaAuthRequests.at(-1);

  assert.equal(request.path, "/api/auth/reset-password");
  assert.deepEqual(request.body, {
    token: "development-reset-token",
    newPassword: "ResetPassword2",
  });
});

test("typed password errors map to safe localized messages", async () => {
  await signIn();

  await assert.rejects(
    changeMyPassword({
      currentPassword: "WrongPassword1",
      newPassword: "NewPassword2",
    }),
    (error) => {
      assert.equal(
        getAuthFlowErrorMessageKey(error),
        "accountProfile.errors.currentPassword"
      );
      return true;
    }
  );
});

test("account UI exposes real routes without fake profile-photo or OAuth actions", async () => {
  const [profilePage, accountLayout, signInPage, registerPage] =
    await Promise.all(
      [
        "src/pages/buyer/ProfilePage.jsx",
        "src/components/account/BuyerAccountLayout.jsx",
        "src/pages/auth/SignInPage.jsx",
        "src/pages/auth/RegisterPage.jsx",
      ].map((path) =>
        readFile(new URL(`../${path}`, import.meta.url), "utf8")
      )
    );

  assert.match(profilePage, /getMyProfile/);
  assert.match(profilePage, /changeMyPassword/);
  assert.doesNotMatch(profilePage, /updateProfilePhoto|FileReader/);
  assert.doesNotMatch(accountLayout, /type="file"/);
  assert.match(signInPage, /to="\/forgot-password"/);
  assert.doesNotMatch(signInPage, /signin-google|googleUnavailable|Google/);
  assert.doesNotMatch(registerPage, /google-button|continueGoogle|googleUnavailable/);
});
