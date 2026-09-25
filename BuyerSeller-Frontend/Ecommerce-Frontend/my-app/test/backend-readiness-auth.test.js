import test from "node:test";
import assert from "node:assert/strict";

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
  getCurrentSession,
  loginUser,
  logoutUser,
  registerUser,
  requireCurrentSession,
  synchronizeCurrentUser,
} = await import("../src/services/authService.js");

const loginBuyer = () =>
  loginUser({ email: "buyer@shopera.demo", password: "Buyer123!" });

test("backend login stores JWT issuance and expiry metadata", async () => {
  values.clear();
  globalThis.__shoperaAuthRequests.length = 0;
  await loginBuyer();
  const session = getCurrentSession();

  assert.match(session.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(session.userId, "1001");
  assert.equal(session.role, "Buyer");
  assert.ok(session.issuedAt <= Date.now());
  assert.ok(session.expiresAt > session.issuedAt);
  assert.deepEqual(globalThis.__shoperaAuthRequests[0].body, {
    email: "buyer@shopera.demo",
    password: "Buyer123!",
  });
});

test("missing, malformed, and expired JWT sessions are rejected", async () => {
  for (const mutate of [
    () => localStorage.removeItem("token"),
    () => localStorage.setItem("token", "malformed"),
    () => localStorage.setItem("token", "random.not valid.token"),
    () => localStorage.setItem("sessionExpiresAt", Date.now() - 1),
  ]) {
    values.clear();
    await loginBuyer();
    mutate();
    assert.equal(getCurrentSession(), null);
    assert.equal(localStorage.getItem("token"), null);
  }
});

test("registration sends the confirmed backend contract and starts a session", async () => {
  values.clear();
  globalThis.__shoperaAuthRequests.length = 0;
  const result = await registerUser({
    fullName: "New Seller",
    email: "NEW@SELLER.TEST",
    phoneNumber: "+90 555 000 0000",
    password: "Password1",
    role: "Seller",
  });

  assert.equal(result.session.role, "Seller");
  assert.deepEqual(globalThis.__shoperaAuthRequests[0].body, {
    fullName: "New Seller",
    email: "new@seller.test",
    phoneNumber: "+90 555 000 0000",
    password: "Password1",
    role: "Seller",
  });
  assert.equal(localStorage.getItem("users"), null);
});

test("current-user restoration uses the protected backend endpoint", async () => {
  values.clear();
  await loginBuyer();
  const restored = await synchronizeCurrentUser();

  assert.equal(restored.userId, "1001");
  assert.equal(restored.role, "Buyer");
});

test("valid Seller sessions pass Seller access and reject Buyer access", async () => {
  values.clear();
  await loginUser({ email: "seller@shopera.demo", password: "Seller123!" });
  assert.equal(requireCurrentSession(["Seller"]).role, "Seller");
  assert.throws(
    () => requireCurrentSession(["Buyer"]),
    /does not have permission/
  );
});

test("logout clears all session metadata", async () => {
  values.clear();
  await loginBuyer();
  await logoutUser();
  for (const key of [
    "token",
    "role",
    "userId",
    "sessionIssuedAt",
    "sessionExpiresAt",
  ]) {
    assert.equal(localStorage.getItem(key), null);
  }
  assert.equal(getCurrentSession(), null);
});
