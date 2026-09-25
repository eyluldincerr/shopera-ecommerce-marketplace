import { Navigate } from "react-router-dom";

import useCart from "../hooks/useCart";
import { getCheckoutCompletionOrderPath } from "../services/checkoutService.js";
import { ROUTES } from "./routePolicy.js";

function hasValidCheckoutItem(cartItems) {
  return Array.isArray(cartItems) && cartItems.some((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const quantity = Number(item.Quantity ?? item.quantity);
    const variantId = item.VariantID || item.variantId || item.id;

    return Boolean(variantId) && quantity > 0;
  });
}

function CheckoutRouteGuard({ children }) {
  const { cartItems } = useCart();

  if (!hasValidCheckoutItem(cartItems)) {
    const checkoutCompletionOrderPath = getCheckoutCompletionOrderPath();

    if (checkoutCompletionOrderPath) {
      return <Navigate to={checkoutCompletionOrderPath} replace />;
    }

    return <Navigate to={ROUTES.CART} replace />;
  }

  return children;
}

export default CheckoutRouteGuard;
