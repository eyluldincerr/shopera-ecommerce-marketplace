// src/utils/formatCurrency.js

export const formatCurrency = (amount, currency = "EUR") => {
  if (amount === null || amount === undefined) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};