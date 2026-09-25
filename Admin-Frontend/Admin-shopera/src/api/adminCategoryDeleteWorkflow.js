export const deleteCategoryAndRefresh = async ({
  category,
  deleteCategory,
  loadCategories,
  notifyUpdated,
}) => {
  await deleteCategory(category.categoryId);
  await loadCategories({ showLoading: false });
  notifyUpdated();
  return category.categoryName;
};
