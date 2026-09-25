import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { CartContext } from "./cartContext";
import {
  addCartItem,
  clearBuyerCart,
  getBuyerCart,
  removeCartItem,
  updateCartItemQuantity,
} from "../services/cartService";
import { getCurrentSession } from "../services/authService";
import {
  clearSelectedCoupon,
  validateCoupon,
} from "../services/couponService.js";
import { calculateCheckoutEstimate } from "../services/checkoutService.js";
import { getCommerceConflictMessage } from "../services/commerceErrorMessages.js";

const isBuyerSession = () => getCurrentSession()?.role === "Buyer";

const getCartErrorMessage = (error, t) => {
  const commerceMessage = getCommerceConflictMessage(error, t, "cart");

  if (commerceMessage) {
    return commerceMessage;
  }

  switch (error?.status) {
    case 400:
      return t("cart.errors.validation");
    case 401:
      return t("cart.errors.sessionExpired");
    case 403:
      return t("cart.errors.buyerRequired");
    case 404:
      return t("cart.errors.itemUnavailable");
    case 409:
      return t("cart.errors.conflict");
    default:
      return error?.isNetworkError
        ? t("cart.errors.network")
        : t("cart.errors.updateFailed");
  }
};

function CartContextProvider({ children }) {
  const { t } = useTranslation();
  const [cart, setCart] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isCartMutating, setIsCartMutating] = useState(false);
  const [cartError, setCartError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const mutationInFlight = useRef(false);
  const loadSequence = useRef(0);

  const resetCart = useCallback(() => {
    loadSequence.current += 1;
    setCart(null);
    setIsCartOpen(false);
    setCartError("");
    setIsCartLoading(false);
    setIsCartMutating(false);
    mutationInFlight.current = false;
    setAppliedCoupon(null);
    clearSelectedCoupon();
  }, []);

  const refreshCart = useCallback(async ({ silent = false } = {}) => {
    if (!isBuyerSession()) {
      resetCart();
      return null;
    }

    const requestId = ++loadSequence.current;
    const sessionUserId = getCurrentSession()?.userId;

    if (!silent) {
      setIsCartLoading(true);
    }

    try {
      const nextCart = await getBuyerCart();

      if (
        requestId === loadSequence.current &&
        getCurrentSession()?.userId === sessionUserId &&
        isBuyerSession()
      ) {
        setCart(nextCart);
        setCartError("");
      }

      return nextCart;
    } catch (error) {
      if (requestId === loadSequence.current && isBuyerSession()) {
        setCartError(getCartErrorMessage(error, t));
      }
      throw error;
    } finally {
      if (requestId === loadSequence.current) {
        setIsCartLoading(false);
      }
    }
  }, [resetCart, t]);

  useEffect(() => {
    const syncCartForSession = () => {
      if (!isBuyerSession()) {
        resetCart();
        return;
      }

      refreshCart().catch(() => {});
    };

    syncCartForSession();
    window.addEventListener("authChanged", syncCartForSession);
    window.addEventListener("storage", syncCartForSession);

    return () => {
      window.removeEventListener("authChanged", syncCartForSession);
      window.removeEventListener("storage", syncCartForSession);
    };
  }, [refreshCart, resetCart]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const runMutation = useCallback(async (operation) => {
    if (mutationInFlight.current) {
      return null;
    }

    mutationInFlight.current = true;
    setIsCartMutating(true);
    setCartError("");

    try {
      const nextCart = await operation();

      if (nextCart) {
        setCart(nextCart);
        setCartError("");
        setAppliedCoupon(null);
        clearSelectedCoupon();
      }

      return nextCart;
    } catch (error) {
      if (error?.status === 409) {
        await refreshCart({ silent: true }).catch(() => {});
      }

      setCartError(getCartErrorMessage(error, t));
      return null;
    } finally {
      mutationInFlight.current = false;
      setIsCartMutating(false);
    }
  }, [refreshCart, t]);

  const addToCart = useCallback(async (item = {}) => {
    // Open immediately so the Buyer can see mutation feedback while the
    // request is running and any controlled 409 message when it completes.
    setIsCartOpen(true);

    return runMutation(async () =>
      addCartItem(item.variantId, item.quantity ?? 1)
    );
  }, [runMutation]);

  const updateQuantity = useCallback((variantId, quantity) =>
    runMutation(() => updateCartItemQuantity(variantId, quantity)),
  [runMutation]);

  const removeFromCart = useCallback((variantId) =>
    runMutation(async () => {
      await removeCartItem(variantId);
      return refreshCart({ silent: true });
    }),
  [refreshCart, runMutation]);

  const increaseQuantity = useCallback((variantId) => {
    const item = cart?.items.find(
      (current) => current.variantId === Number(variantId)
    );

    return item
      ? updateQuantity(variantId, item.quantity + 1)
      : Promise.resolve(null);
  }, [cart?.items, updateQuantity]);

  const decreaseQuantity = useCallback((variantId) => {
    const item = cart?.items.find(
      (current) => current.variantId === Number(variantId)
    );

    if (!item) {
      return Promise.resolve(null);
    }

    return item.quantity <= 1
      ? removeFromCart(variantId)
      : updateQuantity(variantId, item.quantity - 1);
  }, [cart?.items, removeFromCart, updateQuantity]);

  const clearCart = useCallback(async () => {
    const nextCart = await runMutation(() => clearBuyerCart(cart));

    if (nextCart) {
      setAppliedCoupon(null);
      clearSelectedCoupon();
    }

    return nextCart;
  }, [cart, runMutation]);

  const cartItems = useMemo(() => cart?.items || [], [cart]);

  const applyCoupon = async (couponCode) => {
    if (!String(couponCode ?? "").trim()) {
      return { success: false, message: t("cart.enterCoupon") };
    }

    try {
      const coupon = await validateCoupon(couponCode);
      await refreshCart({ silent: true }).catch(() => {});
      setAppliedCoupon(coupon);
      setCartError("");
      return {
        success: true,
        coupon,
        message: t("cart.couponApplied", { code: coupon.couponCode }),
      };
    } catch (error) {
      setAppliedCoupon(null);
      const message =
        getCommerceConflictMessage(error, t, "cart") ||
        (error?.isNetworkError
          ? t("cart.errors.network")
          : t("cart.errors.couponApplyFailed"));
      return { success: false, message };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    clearSelectedCoupon();
  };

  const cartCount = cart?.totalQuantity ?? cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );
  const quote = useMemo(() => calculateCheckoutEstimate({
    cartItems: cartItems.map((item) => ({
      ...item,
      price: item.unitPrice,
      stockQuantity: item.availableStock,
    })),
  }), [cartItems]);
  const currencyCode = cart?.currencyCode || "EUR";
  const subtotal = Number(cart?.totalAmount) || 0;
  const tax = 0;
  const discount = Math.min(
    Math.max(Number(appliedCoupon?.discountAmount) || 0, 0),
    subtotal
  );
  const total = Math.max(subtotal - discount, 0);

  const value = {
    cart,
    cartItems,
    isCartOpen,
    isCartLoading,
    isCartMutating,
    cartError,
    cartCount,
    subtotal,
    tax,
    discount,
    total,
    quote,
    currencyCode,
    appliedCoupon,
    openCart,
    closeCart,
    refreshCart,
    clearCart,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    applyCoupon,
    removeCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export default CartContextProvider;
