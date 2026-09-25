export const createAdminCategoryPayload = ({
  categoryName,
  description = null,
  parentCategoryId = null,
}) => ({ categoryName, description, parentCategoryId });

export const createAdminCategoryUpdatePayload = (values = {}) => {
  const payload = {};
  for (const field of ["categoryName", "description", "parentCategoryId"]) {
    if (Object.prototype.hasOwnProperty.call(values, field)) {
      payload[field] = values[field];
    }
  }
  return payload;
};
