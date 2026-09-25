import { CART_ENDPOINTS } from "../../config/apiEndpoints.js";
import axiosClient from "../axiosClient.js";
import { requireEndpoint } from "../backendErrors.js";
import { mapCartDto } from "../mappers/cartMapper.js";

const unwrap = (response) => response?.data ?? response;

const itemEndpoint = (variantId) => {
  const endpoint = requireEndpoint(
    CART_ENDPOINTS.item,
    "cart.item"
  );

  if (!endpoint.includes(":variantId")) {
    throw new Error("BACKEND_CONTRACT_INVALID:cart.item");
  }

  return endpoint.replace(
    ":variantId",
    encodeURIComponent(String(variantId))
  );
};

export const cartHttpAdapter = {
  async getCart(options = {}) {
    const response = await axiosClient.get(
      requireEndpoint(CART_ENDPOINTS.cart, "cart.get"),
      { signal: options.signal }
    );

    return mapCartDto(unwrap(response));
  },

  async addItem(variantId, quantity, options = {}) {
    const response = await axiosClient.post(
      requireEndpoint(CART_ENDPOINTS.items, "cart.items.add"),
      { variantId, quantity },
      { signal: options.signal }
    );

    return mapCartDto(unwrap(response));
  },

  async updateItem(variantId, quantity, options = {}) {
    const response = await axiosClient.put(
      itemEndpoint(variantId),
      { quantity },
      { signal: options.signal }
    );

    return mapCartDto(unwrap(response));
  },

  async deleteItem(variantId, options = {}) {
    await axiosClient.delete(itemEndpoint(variantId), {
      signal: options.signal,
    });
  },

  async clearCart(options = {}) {
    await axiosClient.delete(
      requireEndpoint(CART_ENDPOINTS.items, "cart.items.clear"),
      { signal: options.signal }
    );
  },
};

export default cartHttpAdapter;
