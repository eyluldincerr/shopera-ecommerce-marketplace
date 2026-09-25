import { Navigate } from "react-router-dom";

import { useCheckoutData } from "../../hooks/useCheckoutData.js";
import { isShippingValid } from "../../services/checkoutService.js";

function CheckoutLegacyPaymentRedirect() {
  const { shipping } = useCheckoutData();

  return (
    <Navigate
      to={isShippingValid(shipping) ? "/checkout/review" : "/checkout/shipping"}
      replace
    />
  );
}

export default CheckoutLegacyPaymentRedirect;
