import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import en from "../src/locales/en.json" with { type: "json" };
import tr from "../src/locales/tr.json" with { type: "json" };
import { HttpClientError } from "../src/services/axiosClient.js";
import { getSignInErrorMessageKey } from "../src/pages/auth/signInError.js";

const translate = (translations, key) =>
  key.split(".").reduce((value, part) => value?.[part], translations);

const getEnglishMessage = (error) =>
  translate(en, getSignInErrorMessageKey(error));

test("HTTP 401 shows the localized incorrect-credentials message", () => {
  const error = new HttpClientError("Request failed with status 401", {
    status: 401,
  });

  assert.equal(getEnglishMessage(error), "Incorrect email or password.");
});

test("HTTP 400 authentication failure shows incorrect credentials", () => {
  const error = new HttpClientError("Invalid login request", {
    status: 400,
    code: "AUTH_INVALID_CREDENTIALS",
  });

  assert.equal(getEnglishMessage(error), "Incorrect email or password.");
});

test("authentication backend codes show incorrect credentials", () => {
  for (const code of ["AUTH_INVALID_CREDENTIALS", "HTTP_401"]) {
    assert.equal(
      getEnglishMessage(new HttpClientError(code, { code })),
      "Incorrect email or password."
    );
  }
});

test("typed network failure shows the localized connection message", () => {
  const error = new HttpClientError("NETWORK_ERROR", {
    code: "NETWORK_ERROR",
    isNetworkError: true,
  });

  assert.equal(
    getEnglishMessage(error),
    "Cannot connect to the server. Make sure the backend is running and try again."
  );
});

test("unexpected errors show the localized general sign-in failure", () => {
  assert.equal(
    getEnglishMessage(new Error("Sensitive internal exception")),
    "Sign in could not be completed. Please try again."
  );
});

test("raw backend messages and internal codes are never selected for display", () => {
  for (const rawMessage of [
    "Request failed with status 400",
    "Request failed with status 401",
    "NETWORK_ERROR",
    "HTTP_401",
    "Sensitive internal exception\n    at backend.js:42:7",
  ]) {
    const message = getEnglishMessage(
      new HttpClientError(rawMessage, {
        status: rawMessage.includes("400") ? 400 : null,
        code: rawMessage === "HTTP_401" ? "HTTP_401" : undefined,
        isNetworkError: rawMessage === "NETWORK_ERROR",
      })
    );

    assert.notEqual(message, rawMessage);
    assert.doesNotMatch(message, /Request failed|NETWORK_ERROR|HTTP_401|backend\.js/);
  }
});

test("English and Turkish include all localized sign-in failure messages", () => {
  for (const key of [
    "auth.incorrectCredentials",
    "auth.backendConnectionFailure",
    "auth.signInFailure",
  ]) {
    assert.equal(typeof translate(en, key), "string");
    assert.equal(typeof translate(tr, key), "string");
  }
});

test("the page clears stale errors and always restores submitting state", async () => {
  const source = await readFile(
    new URL("../src/pages/auth/SignInPage.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /setIsSubmitting\(true\);\s*setErrorMessage\(""\);/);
  assert.match(
    source,
    /setEmail\(event\.target\.value\);\s*setErrorMessage\(""\);/
  );
  assert.match(
    source,
    /setPassword\(event\.target\.value\);\s*setErrorMessage\(""\);/
  );
  assert.match(source, /finally\s*{\s*setIsSubmitting\(false\);\s*}/);
});
