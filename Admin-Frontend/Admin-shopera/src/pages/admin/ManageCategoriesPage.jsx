import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FolderPlus,
  FolderTree,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import AdminConfirmModal from "../../components/admin/AdminConfirmModal";
import AdminDataTable from "../../components/admin/AdminDataTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import CategoryFormModal from "../../components/admin/CategoryFormModal";

import {
  createAdminCategory,
  deleteAdminCategory,
  deleteAdminCategoryImage,
  getAdminCategories,
  updateAdminCategory,
  uploadAdminCategoryImage,
} from "../../api/adminCategoryService";
import { deleteCategoryAndRefresh } from "../../api/adminCategoryDeleteWorkflow.js";

const initialFormState = {
  isOpen: false,
  mode: "create",
  category: null,
};

const initialConfirmationState = {
  isOpen: false,
  category: null,
};

const isMainCategory = (category) => {
  return (
    category.parentCategoryId === null ||
    category.parentCategoryId === undefined ||
    category.parentCategoryId === ""
  );
};

const canDeleteCategory = (category) => {
  const productCount = Number(
    category.productCount || 0
  );

  const childCount = Number(
    category.childCount || 0
  );

  return (
    category.canDelete !== false &&
    productCount === 0 &&
    childCount === 0
  );
};

function ManageCategoriesPage() {
  const [categories, setCategories] =
    useState([]);

  const [searchValue, setSearchValue] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  const [parentFilter, setParentFilter] =
    useState("ALL");

  const [formState, setFormState] =
    useState(initialFormState);

  const [confirmation, setConfirmation] =
    useState(initialConfirmationState);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadCategories = useCallback(
    async ({ showLoading = true } = {}) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }

        setErrorMessage("");

        const loadedCategories =
          await getAdminCategories();

        setCategories(
          Array.isArray(loadedCategories)
            ? loadedCategories
            : []
        );
      } catch (error) {
        console.error(
          "Categories could not be loaded:",
          error
        );

        setErrorMessage(
          error.message ||
            "Categories could not be loaded."
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const mainCategories = useMemo(() => {
    return categories
      .filter(isMainCategory)
      .sort((firstCategory, secondCategory) =>
        String(firstCategory.categoryName).localeCompare(
          String(secondCategory.categoryName)
        )
      );
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchValue
      .trim()
      .toLowerCase();

    return categories.filter((category) => {
      const categoryName = String(
        category.categoryName || ""
      ).toLowerCase();

      const description = String(
        category.description || ""
      ).toLowerCase();

      const adminName = String(
        category.managedByAdminName || ""
      ).toLowerCase();

      const parentName = String(
        category.parentCategoryName || ""
      ).toLowerCase();

      const matchesSearch =
        normalizedSearch === "" ||
        categoryName.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        adminName.includes(normalizedSearch) ||
        parentName.includes(normalizedSearch) ||
        String(category.categoryId).includes(
          normalizedSearch
        );

      const categoryIsMain =
        isMainCategory(category);

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "MAIN" &&
          categoryIsMain) ||
        (typeFilter === "SUBCATEGORY" &&
          !categoryIsMain);

      let matchesParent = true;

      if (parentFilter === "NONE") {
        matchesParent = categoryIsMain;
      } else if (parentFilter !== "ALL") {
        matchesParent =
          Number(category.parentCategoryId) ===
          Number(parentFilter);
      }

      return (
        matchesSearch &&
        matchesType &&
        matchesParent
      );
    });
  }, [
    categories,
    searchValue,
    typeFilter,
    parentFilter,
  ]);

  const categoryCounts = useMemo(() => {
    return {
      total: categories.length,

      main: categories.filter(
        isMainCategory
      ).length,

      subcategories: categories.filter(
        (category) =>
          !isMainCategory(category)
      ).length,

      withProducts: categories.filter(
        (category) =>
          Number(category.productCount || 0) > 0
      ).length,

      protectedCategories: categories.filter(
        (category) =>
          !canDeleteCategory(category)
      ).length,
    };
  }, [categories]);

  const openCreateModal = () => {
    setSuccessMessage("");
    setErrorMessage("");

    setFormState({
      isOpen: true,
      mode: "create",
      category: null,
    });
  };

  const openEditModal = (category) => {
    setSuccessMessage("");
    setErrorMessage("");

    setFormState({
      isOpen: true,
      mode: "edit",
      category,
    });
  };

  const closeFormModal = () => {
    if (!isProcessing) {
      setFormState(initialFormState);
    }
  };

  const submitCategoryForm = async (
    formValues
  ) => {
    try {
      setIsProcessing(true);
      setErrorMessage("");
      setSuccessMessage("");

      const {
        imageFile = null,
        removeImage = false,
        ...categoryValues
      } = formValues;

      let savedCategory;
      const isEditing =
        formState.mode === "edit" &&
        formState.category;

      if (isEditing) {
        savedCategory =
          await updateAdminCategory(
            formState.category.categoryId,
            categoryValues
          );
      } else {
        savedCategory =
          await createAdminCategory(
            categoryValues
          );
      }

      try {
        if (imageFile) {
          savedCategory =
            await uploadAdminCategoryImage(
              savedCategory.categoryId,
              imageFile
            );
        } else if (
          isEditing &&
          removeImage &&
          formState.category?.hasImage
        ) {
          savedCategory =
            await deleteAdminCategoryImage(
              savedCategory.categoryId
            );
        }
      } catch (imageError) {
        setFormState(initialFormState);

        await loadCategories({
          showLoading: false,
        });

        window.dispatchEvent(
          new Event("admin-data-updated")
        );

        setErrorMessage(
          `${savedCategory.categoryName} was saved, but its image could not be ${
            imageFile ? "uploaded" : "removed"
          }. ${imageError.message || "Edit the category and try the image again."}`
        );

        return;
      }

      setSuccessMessage(
        `${savedCategory.categoryName} was ${
          isEditing ? "updated" : "created"
        } successfully.`
      );

      setFormState(initialFormState);

      await loadCategories({
        showLoading: false,
      });

      window.dispatchEvent(
        new Event("admin-data-updated")
      );
    } catch (error) {
      console.error(
        "Category could not be saved:",
        error
      );

      /*
        Modal açık kalır. Böylece validation
        hatasında girilen değerler kaybolmaz.
      */
      setErrorMessage(
        error.message ||
          "Category could not be saved."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const requestDelete = (category) => {
    setSuccessMessage("");
    setErrorMessage("");

    setConfirmation({
      isOpen: true,
      category,
    });
  };

  const closeConfirmation = () => {
    if (!isProcessing) {
      setConfirmation(
        initialConfirmationState
      );
    }
  };

  const confirmDelete = async () => {
    if (!confirmation.category) {
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage("");
      setSuccessMessage("");

      const categoryName =
        await deleteCategoryAndRefresh({
          category: confirmation.category,
          deleteCategory: deleteAdminCategory,
          loadCategories,
          notifyUpdated: () => window.dispatchEvent(
            new Event("admin-data-updated")
          ),
        });

      setConfirmation(
        initialConfirmationState
      );

      setSuccessMessage(
        `${categoryName} was deleted successfully.`
      );

    } catch (error) {
      console.error(
        "Category could not be deleted:",
        error
      );

      setConfirmation(
        initialConfirmationState
      );

      setErrorMessage(
        error.message ||
          "Category could not be deleted."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFilters = () => {
    setSearchValue("");
    setTypeFilter("ALL");
    setParentFilter("ALL");
  };

  const columns = [
    {
      key: "category",
      header: "Category",

      render: (category) => (
        <div className="admin-category-name-cell">
          <div
            className={
              isMainCategory(category)
                ? "admin-category-icon admin-category-main-icon"
                : "admin-category-icon admin-category-child-icon"
            }
          >
            <FolderTree size={18} />
          </div>

          <div className="admin-category-name-content">
            <strong>
              {category.categoryName}
            </strong>

            <span>
              Category ID: #{category.categoryId}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "parentCategory",
      header: "Parent Category",

      render: (category) =>
        category.parentCategoryName ? (
          <span className="admin-category-parent-badge">
            {category.parentCategoryName}
          </span>
        ) : (
          <span className="admin-category-main-badge">
            Main Category
          </span>
        ),
    },
    {
      key: "description",
      header: "Description",

      render: (category) => (
        <span className="admin-category-description-cell">
          {category.description ||
            "No description"}
        </span>
      ),
    },
    {
      key: "productCount",
      header: "Products",

      render: (category) => (
        <span className="admin-category-count">
          {Number(
            category.productCount || 0
          )}
        </span>
      ),
    },
    {
      key: "childCount",
      header: "Subcategories",

      render: (category) => (
        <span className="admin-category-count">
          {Number(
            category.childCount || 0
          )}
        </span>
      ),
    },
    {
      key: "managedByAdminName",
      header: "Managed By",

      render: (category) => (
        <div className="admin-category-manager">
          <strong>
            Admin #
            {category.managedByAdminUserId}
          </strong>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className:
        "admin-table-actions-column",

      render: (category) => {
        const isProtected =
          !canDeleteCategory(category);

        return (
          <div className="admin-category-actions">
            <button
              type="button"
              className="admin-category-edit-button"
              onClick={() =>
                openEditModal(category)
              }
            >
              <Pencil size={15} />
              Edit
            </button>

            <button
              type="button"
              className="admin-category-delete-button"
              title={
                !isProtected
                  ? "Delete category"
                  : "The backend will validate product and subcategory references before deletion."
              }
              onClick={() =>
                requestDelete(category)
              }
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Category Management"
        description="Manage category records, recursive parent relationships and responsible administrators."
      >
        <button
          type="button"
          className="admin-create-category-button"
          onClick={openCreateModal}
        >
          <FolderPlus size={17} />
          Create Category
        </button>
      </AdminPageHeader>

      <section className="admin-category-overview-grid">
        <article className="admin-category-overview-card">
          <span>Total Categories</span>

          <strong>
            {categoryCounts.total}
          </strong>
        </article>

        <article className="admin-category-overview-card">
          <span>Main Categories</span>

          <strong>
            {categoryCounts.main}
          </strong>
        </article>

        <article className="admin-category-overview-card">
          <span>Subcategories</span>

          <strong>
            {categoryCounts.subcategories}
          </strong>
        </article>

        <article className="admin-category-overview-card">
          <span>Categories with Products</span>

          <strong>
            {categoryCounts.withProducts}
          </strong>
        </article>

        <article className="admin-category-overview-card">
          <span>Protected Categories</span>

          <strong>
            {categoryCounts.protectedCategories}
          </strong>
        </article>
      </section>

      {successMessage && (
        <div className="admin-page-notice admin-page-notice-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="admin-page-notice admin-page-notice-error">
          {errorMessage}
        </div>
      )}

      <section className="admin-category-panel">
        <div className="admin-category-toolbar">
          <div className="admin-users-search">
            <Search size={18} />

            <input
              type="search"
              value={searchValue}
              onChange={(event) =>
                setSearchValue(
                  event.target.value
                )
              }
              placeholder="Search category, description, parent, admin or ID..."
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
            aria-label="Filter categories by hierarchy type"
          >
            <option value="ALL">
              All category types
            </option>

            <option value="MAIN">
              Main categories
            </option>

            <option value="SUBCATEGORY">
              Subcategories
            </option>
          </select>

          <select
            value={parentFilter}
            onChange={(event) =>
              setParentFilter(
                event.target.value
              )
            }
            aria-label="Filter categories by parent category"
          >
            <option value="ALL">
              All parent categories
            </option>

            <option value="NONE">
              No parent
            </option>

            {mainCategories.map(
              (category) => (
                <option
                  value={category.categoryId}
                  key={category.categoryId}
                >
                  {category.categoryName}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            className="admin-reset-filters-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        <div className="admin-users-results-heading">
          <div>
            <FolderTree size={18} />

            <strong>
              {filteredCategories.length} categories found
            </strong>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-page-loading">
            Loading categories...
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredCategories}
            rowKey="categoryId"
            emptyMessage="No categories match the selected filters."
          />
        )}
      </section>

      <CategoryFormModal
        isOpen={formState.isOpen}
        mode={formState.mode}
        category={formState.category}
        categories={categories}
        isProcessing={isProcessing}
        onSubmit={submitCategoryForm}
        onCancel={closeFormModal}
      />

      <AdminConfirmModal
        isOpen={confirmation.isOpen}
        title="Delete category?"
        message={
          confirmation.category
            ? `${confirmation.category.categoryName} will be permanently deleted only if no products or subcategories reference it. The backend will validate this rule.`
            : ""
        }
        confirmLabel="Delete Category"
        variant="danger"
        isProcessing={isProcessing}
        onConfirm={confirmDelete}
        onCancel={closeConfirmation}
      />
    </AdminPageLayout>
  );
}

export default ManageCategoriesPage;
