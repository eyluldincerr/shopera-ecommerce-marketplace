import { getAdminAccounts } from "./adminAccountService.js";

import { operationalProducts } from "../data/operationalProductStore.js";
import {
  requireAuthenticatedAdmin,
  isRealApiMode,
  getAuthenticatedUser,
} from "../auth/authSession.js";
import { api } from "./apiClient.js";
import {
  createAdminCategoryPayload,
  createAdminCategoryUpdatePayload,
} from "./adminCategoryPayload.js";

let adminCategories = [];

const requireAdminCategoryBackend = () => {
  throw new Error("Backend integration is not configured.");
};

const normalizeEnum = (value) => {
  return String(value || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
};

const cloneCategory = (category) => {
  return category
    ? {
        ...category,
      }
    : null;
};

const normalizeCategoryName = (
  categoryName
) => {
  return String(categoryName || "").trim();
};

const normalizeDescription = (
  description
) => {
  const normalizedDescription =
    String(description || "").trim();

  return normalizedDescription || null;
};

const normalizeId = (
  value,
  {
    label = "ID",
    allowNull = false,
  } = {}
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    if (allowNull) {
      return null;
    }

    throw new Error(
      `${label} is required.`
    );
  }

  const numericValue =
    Number(value);

  if (
    !Number.isInteger(
      numericValue
    ) ||
    numericValue <= 0
  ) {
    throw new Error(
      `${label} must be a positive whole number.`
    );
  }

  return numericValue;
};

const getAdminAccount = (
  accounts,
  adminUserId
) => {
  const numericAdminUserId =
    Number(adminUserId);

  return accounts.find(
    (account) =>
      Number(account.userId) ===
        numericAdminUserId &&
      normalizeEnum(
        account.role
      ) === "ADMIN"
  );
};

const categoryNameExists = (
  categoryName,
  excludedCategoryId = null
) => {
  const normalizedName =
    normalizeCategoryName(
      categoryName
    ).toLowerCase();

  const numericExcludedCategoryId =
    excludedCategoryId === null
      ? null
      : Number(
          excludedCategoryId
        );

  return adminCategories.some(
    (category) =>
      Number(category.categoryId) !==
        numericExcludedCategoryId &&
      normalizeCategoryName(
        category.categoryName
      ).toLowerCase() ===
        normalizedName
  );
};

const getParentCategory = (
  parentCategoryId
) => {
  if (
    parentCategoryId === null
  ) {
    return null;
  }

  return (
    adminCategories.find(
      (category) =>
        Number(
          category.categoryId
        ) ===
        Number(
          parentCategoryId
        )
    ) || null
  );
};

const parentRelationshipCreatesCycle = (
  categoryId,
  parentCategoryId
) => {
  if (
    parentCategoryId === null
  ) {
    return false;
  }

  const numericCategoryId =
    Number(categoryId);

  let currentParentId =
    Number(parentCategoryId);

  const visitedCategoryIds =
    new Set();

  while (currentParentId) {
    if (
      currentParentId ===
      numericCategoryId
    ) {
      return true;
    }

    if (
      visitedCategoryIds.has(
        currentParentId
      )
    ) {
      return true;
    }

    visitedCategoryIds.add(
      currentParentId
    );

    const currentParent =
      adminCategories.find(
        (category) =>
          Number(
            category.categoryId
          ) === currentParentId
      );

    if (!currentParent) {
      return false;
    }

    currentParentId =
      currentParent.parentCategoryId ===
        null ||
      currentParent.parentCategoryId ===
        undefined
        ? null
        : Number(
            currentParent.parentCategoryId
          );
  }

  return false;
};

const getCategoryChildCount = (
  categoryId
) => {
  const numericCategoryId =
    Number(categoryId);

  return adminCategories.filter(
    (category) =>
      Number(
        category.parentCategoryId
      ) === numericCategoryId
  ).length;
};

const getCategoryProductCount = (
  categoryId
) => {
  const numericCategoryId =
    Number(categoryId);

  return operationalProducts.filter(
    (product) =>
      Number(product.categoryId) ===
      numericCategoryId
  ).length;
};

const createCategorySummary = (
  category,
  accounts
) => {
  const parentCategory =
    getParentCategory(
      category.parentCategoryId
    );

  const managingAdmin =
    getAdminAccount(
      accounts,
      category.managedByAdminUserId
    );

  const childCount =
    getCategoryChildCount(
      category.categoryId
    );

  const productCount =
    getCategoryProductCount(
      category.categoryId
    );

  return {
    ...cloneCategory(category),

    /*
      Calculated view fields.
      These are not CATEGORY table columns.
    */
    parentCategoryName:
      parentCategory?.categoryName ||
      null,

    managedByAdminName:
      managingAdmin?.fullName ||
      `Admin #${category.managedByAdminUserId}`,

    childCount,
    productCount,

    canDelete:
      childCount === 0 &&
      productCount === 0,
  };
};

/* =====================================================
   INTERNAL CATEGORY LOOKUP
===================================================== */

/*
  Used by the product service.

  Returns the current CATEGORY record without
  exposing the mutable internal array.
*/
export const getAdminCategoryRecordById = (
  categoryId
) => {
  const numericCategoryId =
    Number(categoryId);

  const category =
    adminCategories.find(
      (currentCategory) =>
        Number(
          currentCategory.categoryId
        ) === numericCategoryId
    );

  return cloneCategory(category);
};

/* =====================================================
   READ OPERATIONS
===================================================== */

export const getAdminCategories =
  async () => {
    if (isRealApiMode() && getAuthenticatedUser()?.role === "ADMIN") return api.get("/api/Admin/categories");
    const accounts =
      await getAdminAccounts();

    return adminCategories
      .map((category) =>
        createCategorySummary(
          category,
          accounts
        )
      )
      .sort(
        (
          firstCategory,
          secondCategory
        ) =>
          firstCategory.categoryName.localeCompare(
            secondCategory.categoryName
          )
      );
  };

export const getAdminCategoryById =
  async (categoryId) => {
    requireAuthenticatedAdmin();
    if (isRealApiMode()) return api.get(`/api/Admin/categories/${Number(categoryId)}`);

    const numericCategoryId =
      normalizeId(
        categoryId,
        {
          label: "Category ID",
        }
      );

    const category =
      adminCategories.find(
        (currentCategory) =>
          Number(
            currentCategory.categoryId
          ) === numericCategoryId
      );

    if (!category) {
      throw new Error(
        "Category could not be found."
      );
    }

    const accounts =
      await getAdminAccounts();

    return createCategorySummary(
      category,
      accounts
    );
  };

/* =====================================================
   CREATE
===================================================== */

export const createAdminCategory =
  async ({
    categoryName,
    description = null,
    parentCategoryId = null,
  }) => {
    const authenticatedAdmin =
      requireAuthenticatedAdmin();
    if (isRealApiMode()) return api.post(
      "/api/Admin/categories",
      createAdminCategoryPayload({ categoryName, description, parentCategoryId }),
    );
    void authenticatedAdmin;
    requireAdminCategoryBackend();

    const normalizedName =
      normalizeCategoryName(
        categoryName
      );

    if (!normalizedName) {
      throw new Error(
        "Category name is required."
      );
    }

    if (
      normalizedName.length >
      150
    ) {
      throw new Error(
        "Category name cannot exceed 150 characters."
      );
    }

    if (
      categoryNameExists(
        normalizedName
      )
    ) {
      throw new Error(
        "A category with this name already exists."
      );
    }

    const normalizedParentCategoryId =
      normalizeId(
        parentCategoryId,
        {
          label:
            "Parent category ID",

          allowNull: true,
        }
      );

    if (
      normalizedParentCategoryId !==
      null
    ) {
      const parentCategory =
        getParentCategory(
          normalizedParentCategoryId
        );

      if (!parentCategory) {
        throw new Error(
          "Parent category could not be found."
        );
      }
    }

    const normalizedAdminUserId =
      normalizeId(
        authenticatedAdmin.userId,
        {
          label:
            "Managing administrator ID",
        }
      );

    const accounts =
      await getAdminAccounts();

    if (
      !getAdminAccount(
        accounts,
        normalizedAdminUserId
      )
    ) {
      throw new Error(
        "Managing administrator could not be found."
      );
    }

    const nextCategoryId =
      adminCategories.length === 0
        ? 1
        : Math.max(
            ...adminCategories.map(
              (category) =>
                Number(
                  category.categoryId
                )
            )
          ) + 1;

    const newCategory = {
      categoryId:
        nextCategoryId,

      categoryName:
        normalizedName,

      description:
        normalizeDescription(
          description
        ),

      parentCategoryId:
        normalizedParentCategoryId,

      managedByAdminUserId:
        normalizedAdminUserId,
    };

    adminCategories = [
      ...adminCategories,
      newCategory,
    ];

    return createCategorySummary(
      newCategory,
      accounts
    );
  };

/* =====================================================
   UPDATE
===================================================== */

export const updateAdminCategory =
  async (
    categoryId,
    categoryValues = {}
  ) => {
    const authenticatedAdmin =
      requireAuthenticatedAdmin();
    if (isRealApiMode()) {
      return api.patch(
        `/api/Admin/categories/${Number(categoryId)}`,
        createAdminCategoryUpdatePayload(categoryValues),
      );
    }
    void authenticatedAdmin;
    requireAdminCategoryBackend();

    const numericCategoryId =
      normalizeId(
        categoryId,
        {
          label: "Category ID",
        }
      );

    const categoryIndex =
      adminCategories.findIndex(
        (category) =>
          Number(
            category.categoryId
          ) === numericCategoryId
      );

    if (categoryIndex === -1) {
      throw new Error(
        "Category could not be found."
      );
    }

    const existingCategory =
      adminCategories[
        categoryIndex
      ];

    const normalizedName =
      normalizeCategoryName(
        categoryValues.categoryName ??
          existingCategory.categoryName
      );

    if (!normalizedName) {
      throw new Error(
        "Category name is required."
      );
    }

    if (
      normalizedName.length >
      150
    ) {
      throw new Error(
        "Category name cannot exceed 150 characters."
      );
    }

    if (
      categoryNameExists(
        normalizedName,
        numericCategoryId
      )
    ) {
      throw new Error(
        "A category with this name already exists."
      );
    }

    const hasParentCategoryValue =
      Object.prototype.hasOwnProperty.call(
        categoryValues,
        "parentCategoryId"
      );

    const normalizedParentCategoryId =
      hasParentCategoryValue
        ? normalizeId(
            categoryValues.parentCategoryId,
            {
              label:
                "Parent category ID",

              allowNull: true,
            }
          )
        : existingCategory.parentCategoryId;

    if (
      normalizedParentCategoryId !==
      null
    ) {
      const parentCategory =
        getParentCategory(
          normalizedParentCategoryId
        );

      if (!parentCategory) {
        throw new Error(
          "Parent category could not be found."
        );
      }

      if (
        parentRelationshipCreatesCycle(
          numericCategoryId,
          normalizedParentCategoryId
        )
      ) {
        throw new Error(
          "This parent category would create a category cycle."
        );
      }
    }

    const normalizedAdminUserId =
      normalizeId(
        authenticatedAdmin.userId,
        {
          label:
            "Managing administrator ID",
        }
      );

    const accounts =
      await getAdminAccounts();

    if (
      !getAdminAccount(
        accounts,
        normalizedAdminUserId
      )
    ) {
      throw new Error(
        "Managing administrator could not be found."
      );
    }

    const hasDescriptionValue =
      Object.prototype.hasOwnProperty.call(
        categoryValues,
        "description"
      );

    adminCategories[
      categoryIndex
    ] = {
      ...existingCategory,

      categoryName:
        normalizedName,

      description:
        hasDescriptionValue
          ? normalizeDescription(
              categoryValues.description
            )
          : existingCategory.description,

      parentCategoryId:
        normalizedParentCategoryId,

      managedByAdminUserId:
        normalizedAdminUserId,
    };

    return createCategorySummary(
      adminCategories[
        categoryIndex
      ],
      accounts
    );
  };


export const uploadAdminCategoryImage = async (categoryId, imageFile) => {
  requireAuthenticatedAdmin();

  if (!isRealApiMode()) {
    requireAdminCategoryBackend();
  }

  const numericCategoryId = normalizeId(categoryId, {
    label: "Category ID",
  });

  if (!(imageFile instanceof File)) {
    throw new Error("A category image file is required.");
  }

  const formData = new FormData();
  formData.append("image", imageFile);

  return api.put(
    `/api/Admin/categories/${numericCategoryId}/image`,
    formData,
  );
};

export const deleteAdminCategoryImage = async (categoryId) => {
  requireAuthenticatedAdmin();

  if (!isRealApiMode()) {
    requireAdminCategoryBackend();
  }

  const numericCategoryId = normalizeId(categoryId, {
    label: "Category ID",
  });

  return api.delete(
    `/api/Admin/categories/${numericCategoryId}/image`,
  );
};

/* =====================================================
   DELETE
===================================================== */

export const deleteAdminCategory =
  async (categoryId) => {
    requireAuthenticatedAdmin();
    if (isRealApiMode()) return api.delete(`/api/Admin/categories/${Number(categoryId)}`);
    void categoryId;
    requireAdminCategoryBackend();

    const numericCategoryId =
      normalizeId(
        categoryId,
        {
          label: "Category ID",
        }
      );

    const category =
      adminCategories.find(
        (currentCategory) =>
          Number(
            currentCategory.categoryId
          ) === numericCategoryId
      );

    if (!category) {
      throw new Error(
        "Category could not be found."
      );
    }

    const childCount =
      getCategoryChildCount(
        numericCategoryId
      );

    if (childCount > 0) {
      throw new Error(
        "Category cannot be deleted while it has subcategories."
      );
    }

    const productCount =
      getCategoryProductCount(
        numericCategoryId
      );

    if (productCount > 0) {
      throw new Error(
        "Category cannot be deleted while products reference it."
      );
    }

    adminCategories =
      adminCategories.filter(
        (currentCategory) =>
          Number(
            currentCategory.categoryId
          ) !== numericCategoryId
      );

    return {
      success: true,

      deletedCategoryId:
        numericCategoryId,
    };
  };
