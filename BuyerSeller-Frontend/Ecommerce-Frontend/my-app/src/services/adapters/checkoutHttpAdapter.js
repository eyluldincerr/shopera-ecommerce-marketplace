import { ORDER_ENDPOINTS } from "../../config/apiEndpoints.js";
import axiosClient, { HttpClientError } from "../axiosClient.js";
import { requireEndpoint } from "../backendErrors.js";
import { mapOrderDto } from "../mappers/orderMapper.js";

const unwrap = (response) => response?.data ?? response;

export const checkoutHttpAdapter = {
  async submit(request, options = {}) {
    const response = await axiosClient.post(
      requireEndpoint(ORDER_ENDPOINTS.checkout, "order.checkout"),
      request,
      { signal: options.signal }
    );

    if (response?.status !== 201) {
      throw new HttpClientError("Checkout did not create an order.", {
        code: "INVALID_CHECKOUT_STATUS",
        data: unwrap(response),
      });
    }

    return mapOrderDto(unwrap(response));
  },
};

export default checkoutHttpAdapter;
