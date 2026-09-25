export const parseStructuredProductInfo = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (
    !trimmedValue.startsWith("{") &&
    !trimmedValue.startsWith("[")
  ) {
    return trimmedValue;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return trimmedValue;
  }
};

export const hasMeaningfulProductInfo = (value) => {
  const parsedValue = parseStructuredProductInfo(value);

  if (parsedValue === null || parsedValue === undefined) {
    return false;
  }

  if (typeof parsedValue === "string") {
    return parsedValue.trim().length > 0;
  }

  if (
    typeof parsedValue === "number" ||
    typeof parsedValue === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(parsedValue)) {
    return parsedValue.some(hasMeaningfulProductInfo);
  }

  if (typeof parsedValue === "object") {
    return Object.values(parsedValue).some(hasMeaningfulProductInfo);
  }

  return false;
};

export const humanizeProductInfoKey = (key) =>
  String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
