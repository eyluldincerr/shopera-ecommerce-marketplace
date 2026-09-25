// src/context/WishlistContext.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { WishlistContext } from "./wishlistContext";
import { getCurrentSession } from "../services/authService";
import {
  addWishlistVariant,
  clearLegacyWishlistStorage,
  clearWishlistItems,
  getWishlist,
  getWishlistVariantId,
  removeWishlistVariant,
  resolveWishlistVariant,
} from "../services/wishlistService";

const emptyWishlist = () => ({
  wishlistId: null,
  buyerUserId: null,
  createdDate: null,
  itemCount: 0,
  items: [],
});

const getErrorMessage = (error) => {
  if (error?.isNetworkError) {
    return "Wishlist is unavailable right now. Check your connection and try again.";
  }

  return (
    error?.data?.message ||
    error?.data?.detail ||
    "We could not update your favourites. Please try again."
  );
};

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(emptyWishlist);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [isWishlistMutating, setIsWishlistMutating] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const requestVersion = useRef(0);
  const mutationInFlight = useRef(false);

  const applyWishlist = useCallback((nextWishlist) => {
    setWishlist(nextWishlist || emptyWishlist());
  }, []);

  const loadWishlist = useCallback(async () => {
    clearLegacyWishlistStorage();
    const session = getCurrentSession();
    const version = ++requestVersion.current;

    if (session?.role !== "Buyer") {
      applyWishlist(emptyWishlist());
      setWishlistError("");
      setIsWishlistLoading(false);
      return;
    }

    setIsWishlistLoading(true);
    setWishlistError("");

    try {
      const result = await getWishlist();
      if (requestVersion.current === version) {
        applyWishlist(result);
      }
    } catch (error) {
      if (requestVersion.current === version) {
        applyWishlist(emptyWishlist());
        setWishlistError(getErrorMessage(error));
      }
    } finally {
      if (requestVersion.current === version) {
        setIsWishlistLoading(false);
      }
    }
  }, [applyWishlist]);

  useEffect(() => {
    void loadWishlist();

    const handleAuthChanged = () => {
      void loadWishlist();
    };

    window.addEventListener("authChanged", handleAuthChanged);
    return () => window.removeEventListener("authChanged", handleAuthChanged);
  }, [loadWishlist]);

  const isInWishlist = useCallback(
    (variantId) => {
      if (variantId === undefined || variantId === null) {
        return false;
      }

      return wishlist.items.some(
        (item) => String(getWishlistVariantId(item)) === String(variantId)
      );
    },
    [wishlist.items]
  );

  const runMutation = useCallback(
    async (operation) => {
      if (mutationInFlight.current) {
        return null;
      }

      mutationInFlight.current = true;
      setIsWishlistMutating(true);
      setWishlistError("");

      try {
        const result = await operation();
        applyWishlist(result);
        return result;
      } catch (error) {
        setWishlistError(getErrorMessage(error));
        return null;
      } finally {
        mutationInFlight.current = false;
        setIsWishlistMutating(false);
      }
    },
    [applyWishlist]
  );

  const addToWishlist = useCallback(
    async (product, variant) => {
      const selectedVariant = resolveWishlistVariant(product, variant);
      const variantId = getWishlistVariantId(selectedVariant);
      if (!variantId) {
        return null;
      }

      return runMutation(() => addWishlistVariant(variantId));
    },
    [runMutation]
  );

  const removeFromWishlist = useCallback(
    async (variantId) => {
      if (!variantId) {
        return null;
      }

      return runMutation(() => removeWishlistVariant(variantId));
    },
    [runMutation]
  );

  const toggleWishlist = useCallback(
    async (product, variant) => {
      const selectedVariant = resolveWishlistVariant(product, variant);
      const variantId = getWishlistVariantId(selectedVariant);
      if (!variantId) {
        return null;
      }

      return isInWishlist(variantId)
        ? removeFromWishlist(variantId)
        : addToWishlist(product, selectedVariant);
    },
    [addToWishlist, isInWishlist, removeFromWishlist]
  );

  const clearWishlist = useCallback(
    async () => runMutation(clearWishlistItems),
    [runMutation]
  );

  const value = useMemo(
    () => ({
      wishlistItems: wishlist.items,
      wishlistCount: wishlist.itemCount,
      isWishlistLoading,
      isWishlistMutating,
      wishlistError,
      refreshWishlist: loadWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      clearWishlist,
    }),
    [
      wishlist.items,
      wishlist.itemCount,
      isWishlistLoading,
      isWishlistMutating,
      wishlistError,
      loadWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      clearWishlist,
    ]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}
