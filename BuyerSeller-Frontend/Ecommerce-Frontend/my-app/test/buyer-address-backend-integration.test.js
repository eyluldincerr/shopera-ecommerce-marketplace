import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ADDRESS_ENDPOINTS } from "../src/config/apiEndpoints.js";
import {
  ADDRESS_FIELD_LIMITS,
  mapAddressDto,
  mapAddressWriteRequest,
} from "../src/services/mappers/addressMapper.js";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
};
globalThis.sessionStorage = {
  values: new Map(),
  getItem(key) { return this.values.get(key) ?? null; },
  setItem(key, value) { this.values.set(key, String(value)); },
  removeItem(key) { this.values.delete(key); },
};
globalThis.window = { dispatchEvent: () => {} };

const setAuthenticatedBuyer = () => {
  const issuedAt = Date.now();
  localStorage.setItem("token", "eyJoZWFkZXIiOiJ0ZXN0In0.dXNlci0xMDAx.c2lnbmF0dXJl");
  localStorage.setItem("role", "Buyer");
  localStorage.setItem("userId", "1001");
  localStorage.setItem("email", "buyer@shopera.test");
  localStorage.setItem("fullName", "Demo Buyer");
  localStorage.setItem("sessionIssuedAt", String(issuedAt));
  localStorage.setItem("sessionExpiresAt", String(issuedAt + 28_800_000));
};

const address = {
  addressId: 15,
  addressLabel: "Home",
  streetAddress: "42 Example Street",
  city: "Famagusta",
  stateProvince: null,
  postalCode: "99450",
  country: "Cyprus",
  isDefaultShipping: false,
  isDefaultBilling: false,
};

const {
  createAddress,
  deleteAddress,
  getMyAddresses,
  updateAddress,
} = await import("../src/services/addressService.js");

test("Address mapper preserves address identity and handles camelCase and PascalCase", () => {
  assert.deepEqual(mapAddressDto(address), address);
  const pascal = mapAddressDto({
    AddressID: 0,
    AddressLabel: "Office",
    StreetAddress: "Zero Lane",
    City: "Nicosia",
    StateProvince: "",
    PostalCode: "0",
    Country: "Cyprus",
    IsDefaultShipping: false,
    IsDefaultBilling: true,
  });
  assert.equal(pascal.addressId, 0);
  assert.equal(pascal.postalCode, "0");
  assert.equal(pascal.isDefaultShipping, false);
  assert.equal(pascal.isDefaultBilling, true);
  assert.equal(pascal.stateProvince, null);
  assert.equal(mapAddressDto({
    streetAddress: "Street",
    city: "City",
    country: "Country",
    addressLabel: null,
    postalCode: null,
  }).addressLabel, null);
  assert.equal(mapAddressDto({
    streetAddress: "Street",
    city: "City",
    country: "Country",
    addressLabel: null,
    postalCode: null,
  }).postalCode, null);
});

test("Address writes preserve SQL nullability and enforce the SQL field lengths", async () => {
  const nullableRequest = mapAddressWriteRequest({
    addressLabel: "   ",
    streetAddress: "  42 Example Street  ",
    city: " Famagusta ",
    stateProvince: " ",
    postalCode: " ",
    country: " Cyprus ",
    isDefaultShipping: false,
    isDefaultBilling: true,
    buyerUserId: 9999,
    recipientName: "Must not be sent",
  });
  assert.deepEqual(nullableRequest, {
    addressLabel: null,
    streetAddress: "42 Example Street",
    city: "Famagusta",
    stateProvince: null,
    postalCode: null,
    country: "Cyprus",
    isDefaultShipping: false,
    isDefaultBilling: true,
  });
  assert.deepEqual(ADDRESS_FIELD_LIMITS, {
    addressLabel: 50,
    streetAddress: 255,
    city: 100,
    stateProvince: 100,
    postalCode: 30,
    country: 100,
  });

  values.clear();
  setAuthenticatedBuyer();
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    throw new Error("No request should be sent for invalid input");
  };
  await assert.rejects(
    createAddress({
      ...address,
      addressLabel: "x".repeat(ADDRESS_FIELD_LIMITS.addressLabel + 1),
    }),
    (error) => error.status === 400 && error.code === "INVALID_ADDRESS_LENGTH"
  );
  assert.equal(requestCount, 0);
});

test("Address service uses backend routes, JWT, exact bodies, and refetches after mutations", async () => {
  values.clear();
  sessionStorage.values.clear();
  setAuthenticatedBuyer();
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    const method = options.method || "GET";
    const body = method === "DELETE" ? null : JSON.stringify(address);
    return new Response(body, {
      status: method === "POST" ? 201 : method === "DELETE" ? 204 : 200,
      headers: body ? { "content-type": "application/json" } : {},
    });
  };

  const input = {
    ...address,
    addressId: undefined,
    addressLabel: " ",
    postalCode: " ",
    isDefaultShipping: true,
  };
  await getMyAddresses();
  await createAddress(input);
  await updateAddress(15, input);
  await deleteAddress(15);

  assert.deepEqual(
    requests.map(({ url, options }) => [options.method || "GET", url]),
    [
      ["GET", ADDRESS_ENDPOINTS.addresses],
      ["POST", ADDRESS_ENDPOINTS.addresses],
      ["GET", ADDRESS_ENDPOINTS.addresses],
      ["PUT", "/api/user/addresses/15"],
      ["GET", ADDRESS_ENDPOINTS.addresses],
      ["DELETE", "/api/user/addresses/15"],
      ["GET", ADDRESS_ENDPOINTS.addresses],
    ]
  );
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    addressLabel: null,
    streetAddress: "42 Example Street",
    city: "Famagusta",
    stateProvince: null,
    postalCode: null,
    country: "Cyprus",
    isDefaultShipping: true,
    isDefaultBilling: false,
  });
  for (const { options } of requests) {
    assert.match(new Headers(options.headers).get("Authorization") || "", /^Bearer /);
  }
});

test("Address UI has no browser address database or fabricated temporary identifiers", async () => {
  const [service, shipping, modal, layout, addressesPage] = await Promise.all([
    readFile(new URL("../src/services/addressService.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/CheckoutShippingPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/address/AddressFormModal.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/CheckoutLayout.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/buyer/AddressesPage.jsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(service, /localStorage|createAddressId|userId/);
  assert.doesNotMatch(shipping, /addressId:\s*`|Date\.now\(\).*addressId/);
  assert.match(shipping, /recipientName/);
  assert.match(shipping, /createShippingSnapshot\(selectedAddress, recipient\)/);
  assert.match(shipping, /from "\.\.\/\.\.\/services\/addressService"/);
  assert.match(addressesPage, /from "\.\.\/\.\.\/services\/addressService"/);
  assert.match(addressesPage, /useMemo/);
  assert.match(addressesPage, /initialData=\{modalInitialData\}/);
  assert.doesNotMatch(modal, /receiverName|phoneNumber|district|buildingNo|mapUrl|geolocation/);
  assert.match(layout, /subtotal/);
  assert.match(layout, /discount/);
  assert.match(layout, /total/);
  assert.doesNotMatch(layout, /calculateCheckoutEstimate|formatCurrency\(tax\)/);
  assert.match(layout, /item\.productName/);
  assert.match(layout, /item\.unitPrice/);
  assert.match(layout, /item\.subtotal/);
});

test("Address failures do not return a fake successful address list", async () => {
  values.clear();
  setAuthenticatedBuyer();
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "Address unavailable" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });

  await assert.rejects(createAddress({ ...address, addressId: undefined }), (error) => error.status === 404);
  assert.equal(localStorage.getItem("addresses"), null);
});
