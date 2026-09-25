import { useEffect, useState } from "react";

import {
  initialCheckoutState,
  readCheckoutState,
  writeCheckoutState,
} from "../services/checkoutService.js";

export function useCheckoutData() {
  const [checkoutState, setCheckoutState] = useState(readCheckoutState);

  useEffect(() => {
    writeCheckoutState(checkoutState);
  }, [checkoutState]);

  const updateSection = (section, field, value) => {
    setCheckoutState((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
      ...(section === "shipping" ? { selectedAddressId: "" } : {}),
    }));
  };

  return {
    ...initialCheckoutState,
    ...checkoutState,
    updateShipping: (field, value) =>
      updateSection("shipping", field, value),
  };
}
