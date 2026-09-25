const read = (dto, ...keys) => {
  for (const key of keys) {
    if (dto?.[key] !== undefined) {
      return dto[key];
    }
  }

  return undefined;
};

const text = (value) => (value === undefined || value === null ? "" : String(value).trim());

const nullableText = (value) => {
  const normalized = text(value);
  return normalized || null;
};

const integerOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isInteger(number) ? number : null;
};

const boolean = (value) =>
  value === true || value === 1 || String(value).trim().toLowerCase() === "true";

export const ADDRESS_FIELD_LIMITS = Object.freeze({
  addressLabel: 50,
  streetAddress: 255,
  city: 100,
  stateProvince: 100,
  postalCode: 30,
  country: 100,
});

export const mapAddressDto = (dto = {}) => ({
  addressId: integerOrNull(read(dto, "addressId", "AddressID")),
  addressLabel: nullableText(read(dto, "addressLabel", "AddressLabel")),
  streetAddress: text(read(dto, "streetAddress", "StreetAddress")),
  city: text(read(dto, "city", "City")),
  stateProvince: nullableText(read(dto, "stateProvince", "StateProvince")),
  postalCode: nullableText(read(dto, "postalCode", "PostalCode")),
  country: text(read(dto, "country", "Country")),
  isDefaultShipping: boolean(
    read(dto, "isDefaultShipping", "IsDefaultShipping")
  ),
  isDefaultBilling: boolean(
    read(dto, "isDefaultBilling", "IsDefaultBilling")
  ),
});

export const mapAddressListDto = (dto) => {
  const values = Array.isArray(dto)
    ? dto
    : read(dto, "items", "Items", "addresses", "Addresses");

  return Array.isArray(values) ? values.map(mapAddressDto) : [];
};

export const mapAddressWriteRequest = (address = {}) => ({
  addressLabel: nullableText(address.addressLabel),
  streetAddress: text(address.streetAddress),
  city: text(address.city),
  stateProvince: nullableText(address.stateProvince),
  postalCode: nullableText(address.postalCode),
  country: text(address.country),
  isDefaultShipping: boolean(address.isDefaultShipping),
  isDefaultBilling: boolean(address.isDefaultBilling),
});
