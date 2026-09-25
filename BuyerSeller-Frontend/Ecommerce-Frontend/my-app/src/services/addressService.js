import { HttpClientError } from "./axiosClient.js";
import { getCurrentSession } from "./authService.js";
import addressHttpAdapter from "./adapters/addressHttpAdapter.js";
import {
  ADDRESS_FIELD_LIMITS,
  mapAddressWriteRequest,
} from "./mappers/addressMapper.js";

const requireBuyerAddressSession = () => {
  const session = getCurrentSession();

  if (!session) {
    throw new HttpClientError("Please sign in again.", {
      status: 401,
      code: "ADDRESS_SESSION_REQUIRED",
    });
  }

  if (session.role !== "Buyer") {
    throw new HttpClientError("A Buyer account is required.", {
      status: 403,
      code: "ADDRESS_BUYER_REQUIRED",
    });
  }
};

const requireAddressId = (addressId) => {
  const normalized = Number(addressId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new HttpClientError("A valid address is required.", {
      status: 400,
      code: "INVALID_ADDRESS_ID",
    });
  }

  return normalized;
};

const validateAddress = (address) => {
  const request = mapAddressWriteRequest(address);
  const missing = [
    ["streetAddress", request.streetAddress],
    ["city", request.city],
    ["country", request.country],
  ].find(([, value]) => !value);

  if (missing) {
    throw new HttpClientError(`A valid ${missing[0]} is required.`, {
      status: 400,
      code: "INVALID_ADDRESS",
    });
  }

  const tooLong = Object.entries(ADDRESS_FIELD_LIMITS).find(
    ([field, maxLength]) =>
      String(request[field] ?? "").length > maxLength
  );

  if (tooLong) {
    throw new HttpClientError(
      `${tooLong[0]} must not exceed ${tooLong[1]} characters.`,
      { status: 400, code: "INVALID_ADDRESS_LENGTH" }
    );
  }

  return request;
};

export const getMyAddresses = async (options = {}) => {
  requireBuyerAddressSession();
  return addressHttpAdapter.list(options);
};

export const createAddress = async (address, options = {}) => {
  requireBuyerAddressSession();
  const createdAddress = await addressHttpAdapter.create(validateAddress(address), options);
  const addresses = await addressHttpAdapter.list(options);

  return { address: createdAddress, addresses };
};

export const updateAddress = async (addressId, address, options = {}) => {
  requireBuyerAddressSession();
  const updatedAddress = await addressHttpAdapter.update(
    requireAddressId(addressId),
    validateAddress(address),
    options
  );
  const addresses = await addressHttpAdapter.list(options);

  return { address: updatedAddress, addresses };
};

export const deleteAddress = async (addressId, options = {}) => {
  requireBuyerAddressSession();
  await addressHttpAdapter.delete(requireAddressId(addressId), options);
  return addressHttpAdapter.list(options);
};

export const setDefaultShippingAddress = async (addressId, options = {}) => {
  requireBuyerAddressSession();
  const normalizedId = requireAddressId(addressId);
  const addresses = await addressHttpAdapter.list(options);
  const address = addresses.find((item) => item.addressId === normalizedId);

  if (!address) {
    throw new HttpClientError("Address is unavailable.", {
      status: 404,
      code: "ADDRESS_NOT_FOUND",
    });
  }

  return updateAddress(
    normalizedId,
    { ...address, isDefaultShipping: true },
    options
  );
};
