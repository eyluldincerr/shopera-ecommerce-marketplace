// src/hooks/useCart.js

import { useContext } from "react";
import { CartContext } from "../context/cartContext";

function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartContextProvider");
  }

  return context;
}

export default useCart;
