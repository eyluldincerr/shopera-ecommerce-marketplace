import { ADDRESS_ENDPOINTS } from "../../config/apiEndpoints.js";
import axiosClient from "../axiosClient.js";
import { requireEndpoint } from "../backendErrors.js";
import {
  mapAddressDto,
  mapAddressListDto,
  mapAddressWriteRequest,
} from "../mappers/addressMapper.js";

const unwrap = (response) => response?.data ?? response;

const addressEndpoint = (addressId) => {
  const endpoint = requireEndpoint(ADDRESS_ENDPOINTS.address, "address.item");

  if (!endpoint.includes(":addressId")) {
    throw new Error("BACKEND_CONTRACT_INVALID:address.item");
  }

  return endpoint.replace(":addressId", encodeURIComponent(String(addressId)));
};

export const addressHttpAdapter = {
  async list(options = {}) {
    const response = await axiosClient.get(
      requireEndpoint(ADDRESS_ENDPOINTS.addresses, "address.list"),
      { signal: options.signal }
    );

    return mapAddressListDto(unwrap(response));
  },

  async create(address, options = {}) {
    const response = await axiosClient.post(
      requireEndpoint(ADDRESS_ENDPOINTS.addresses, "address.create"),
      mapAddressWriteRequest(address),
      { signal: options.signal }
    );

    return mapAddressDto(unwrap(response));
  },

  async update(addressId, address, options = {}) {
    const response = await axiosClient.put(
      addressEndpoint(addressId),
      mapAddressWriteRequest(address),
      { signal: options.signal }
    );

    return mapAddressDto(unwrap(response));
  },

  async delete(addressId, options = {}) {
    await axiosClient.delete(addressEndpoint(addressId), {
      signal: options.signal,
    });
  },
};

export default addressHttpAdapter;
