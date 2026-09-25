// src/hooks/useWishlist.js

import { useContext } from "react";
import { WishlistContext } from "../context/wishlistContext";

export default function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider"
    );
  }

  return context;
}
