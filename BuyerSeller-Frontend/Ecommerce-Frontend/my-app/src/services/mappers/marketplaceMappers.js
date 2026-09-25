export {
  mapProductDto,
  mapProductVariantDto as mapVariantDto,
} from "./productMapper.js";

export const mapValidationErrors = (data) => {
  const source = data?.errors || data?.validationErrors;

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages.map(String) : [String(messages)],
    ])
  );
};
