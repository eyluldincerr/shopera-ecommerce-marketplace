export const toProductInfoText = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (["string", "number", "bigint"].includes(typeof value)) {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map(toProductInfoText)
      .filter(Boolean)
      .join(", ");
  }

  return "";
};

export const formatProductInfoItem = (item) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return toProductInfoText(item);
  }

  const label = toProductInfoText(item.label);
  const value = toProductInfoText(item.value);

  if (label && value) {
    return `${label}: ${value}`;
  }

  return label || value;
};
