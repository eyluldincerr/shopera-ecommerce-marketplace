export const formatAddressLine = (address) => {
  return [address?.streetAddress, address?.stateProvince]
    .filter(Boolean)
    .join(", ");
};

export const formatLocationLine = (address) => {
  return [address?.city, address?.country, address?.postalCode]
    .filter(Boolean)
    .join(", ");
};

export const createShippingSnapshot = (address = {}, recipient = {}) => ({
  recipientName: String(recipient.recipientName || "").trim(),
  recipientPhone: String(recipient.recipientPhone || "").trim() || null,
  streetAddress: String(address.streetAddress || "").trim(),
  city: String(address.city || "").trim(),
  stateProvince: String(address.stateProvince || "").trim() || null,
  postalCode: String(address.postalCode || "").trim() || null,
  country: String(address.country || "").trim(),
});

export const isAddressComplete = (address) =>
  [
    address?.streetAddress,
    address?.city,
    address?.country,
  ].every((value) => String(value || "").trim());
