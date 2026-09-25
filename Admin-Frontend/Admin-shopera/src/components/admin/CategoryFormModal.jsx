import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FolderPlus,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";

const MAX_CATEGORY_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CATEGORY_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const normalizeId = (value) => {
  const numericValue = Number(value);

  return Number.isInteger(numericValue) &&
    numericValue > 0
    ? numericValue
    : null;
};

const getDescendantCategoryIds = (
  categories,
  categoryId
) => {
  const numericCategoryId =
    normalizeId(categoryId);

  if (!numericCategoryId) {
    return new Set();
  }

  const descendantIds = new Set();
  const pendingParentIds = [
    numericCategoryId,
  ];

  while (pendingParentIds.length > 0) {
    const currentParentId =
      pendingParentIds.shift();

    categories.forEach(
      (currentCategory) => {
        const currentCategoryId =
          normalizeId(
            currentCategory.categoryId
          );

        const currentParentCategoryId =
          normalizeId(
            currentCategory.parentCategoryId
          );

        if (
          currentParentCategoryId ===
            currentParentId &&
          currentCategoryId &&
          !descendantIds.has(
            currentCategoryId
          )
        ) {
          descendantIds.add(
            currentCategoryId
          );

          pendingParentIds.push(
            currentCategoryId
          );
        }
      }
    );
  }

  return descendantIds;
};

function CategoryFormModal({
  isOpen,
  mode = "create",
  category = null,
  categories = [],
  isProcessing = false,
  onSubmit,
  onCancel,
}) {
  const [
    categoryName,
    setCategoryName,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    parentCategoryId,
    setParentCategoryId,
  ] = useState("");

  const [
    validationMessage,
    setValidationMessage,
  ] = useState("");

  const [
    imageFile,
    setImageFile,
  ] = useState(null);

  const [
    removeImage,
    setRemoveImage,
  ] = useState(false);

  const [
    imagePreviewUrl,
    setImagePreviewUrl,
  ] = useState("");

  const imageInputRef = useRef(null);

  const isEditMode =
    mode === "edit";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCategoryName(
      category?.categoryName || ""
    );

    setDescription(
      category?.description || ""
    );

    setParentCategoryId(
      category?.parentCategoryId ===
          null ||
        category?.parentCategoryId ===
          undefined
        ? ""
        : String(
            category.parentCategoryId
          )
    );

    setImageFile(null);
    setRemoveImage(false);
    setImagePreviewUrl(
      category?.imageUrl || ""
    );

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    setValidationMessage("");
  }, [
    isOpen,
    category,
    mode,
  ]);

  useEffect(() => {
    if (!imageFile) {
      return undefined;
    }

    if (
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageFile]);

  const availableParentCategories =
    useMemo(() => {
      const currentCategoryId =
        normalizeId(
          category?.categoryId
        );

      const descendantCategoryIds =
        getDescendantCategoryIds(
          categories,
          currentCategoryId
        );

      return categories
        .filter(
          (currentCategory) => {
            const currentOptionId =
              normalizeId(
                currentCategory.categoryId
              );

            if (!currentOptionId) {
              return false;
            }

            if (
              currentOptionId ===
              currentCategoryId
            ) {
              return false;
            }

            if (
              descendantCategoryIds.has(
                currentOptionId
              )
            ) {
              return false;
            }

            return true;
          }
        )
        .sort(
          (
            firstCategory,
            secondCategory
          ) =>
            String(
              firstCategory.categoryName ||
                ""
            ).localeCompare(
              String(
                secondCategory.categoryName ||
                  ""
              )
            )
        );
    }, [
      categories,
      category,
    ]);

  if (!isOpen) {
    return null;
  }

  const clearValidation = () => {
    setValidationMessage("");
  };

  const handleCancel = () => {
    if (
      !isProcessing &&
      typeof onCancel === "function"
    ) {
      onCancel();
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      return;
    }

    if (!ALLOWED_CATEGORY_IMAGE_TYPES.has(file.type)) {
      setValidationMessage(
        "Category image must be JPG, PNG or WebP."
      );
      event.target.value = "";
      return;
    }

    if (file.size > MAX_CATEGORY_IMAGE_BYTES) {
      setValidationMessage(
        "Category image cannot exceed 5 MB."
      );
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    clearValidation();
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setRemoveImage(true);
    setImagePreviewUrl("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    clearValidation();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    if (
      typeof onSubmit !== "function"
    ) {
      setValidationMessage(
        "The category form could not be submitted."
      );

      return;
    }

    const normalizedCategoryName =
      categoryName.trim();

    if (!normalizedCategoryName) {
      setValidationMessage(
        "Category name is required."
      );

      return;
    }

    if (
      normalizedCategoryName.length >
      150
    ) {
      setValidationMessage(
        "Category name cannot exceed 150 characters."
      );

      return;
    }

    let normalizedParentCategoryId =
      null;

    if (parentCategoryId !== "") {
      normalizedParentCategoryId =
        normalizeId(
          parentCategoryId
        );

      if (
        !normalizedParentCategoryId
      ) {
        setValidationMessage(
          "A valid parent category is required."
        );

        return;
      }

      const parentExists =
        availableParentCategories.some(
          (currentCategory) =>
            Number(
              currentCategory.categoryId
            ) ===
            normalizedParentCategoryId
        );

      if (!parentExists) {
        setValidationMessage(
          "The selected parent category is not valid."
        );

        return;
      }
    }

    onSubmit({
      categoryName:
        normalizedCategoryName,

      description:
        description.trim(),

      parentCategoryId:
        normalizedParentCategoryId,

      imageFile,
      removeImage,
    });
  };

  return (
    <div
      className="admin-modal-overlay"
      onClick={handleCancel}
      role="presentation"
    >
      <form
        className="admin-category-form-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-category-form-title"
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={handleCancel}
          disabled={isProcessing}
          aria-label="Close category form"
        >
          <X size={19} />
        </button>

        <div className="admin-category-form-icon">
          <FolderPlus size={25} />
        </div>

        <h2 id="admin-category-form-title">
          {isEditMode
            ? "Edit Category"
            : "Create Category"}
        </h2>

        <p className="admin-category-form-description">
          {isEditMode
            ? "Update the category fields and parent relationship."
            : "Create a main category or a subcategory."}
        </p>

        <div className="admin-category-form-fields">
          <label htmlFor="admin-category-name">
            Category name
          </label>

          <input
            id="admin-category-name"
            type="text"
            value={categoryName}
            maxLength={150}
            disabled={isProcessing}
            placeholder="Example: Electronics"
            autoComplete="off"
            onChange={(event) => {
              setCategoryName(
                event.target.value
              );

              clearValidation();
            }}
          />

          <div className="admin-category-character-count">
            {categoryName.length}/150
          </div>

          <label htmlFor="admin-parent-category">
            Parent category
          </label>

          <select
            id="admin-parent-category"
            value={parentCategoryId}
            disabled={isProcessing}
            onChange={(event) => {
              setParentCategoryId(
                event.target.value
              );

              clearValidation();
            }}
          >
            <option value="">
              No parent — main category
            </option>

            {availableParentCategories.map(
              (currentCategory) => (
                <option
                  value={
                    currentCategory.categoryId
                  }
                  key={
                    currentCategory.categoryId
                  }
                >
                  {
                    currentCategory.categoryName
                  }
                </option>
              )
            )}
          </select>

          <p className="admin-category-hierarchy-note">
            The current category and its
            subcategories cannot be selected
            as the parent.
          </p>

          <label htmlFor="admin-category-description">
            Description
          </label>

          <textarea
            id="admin-category-description"
            value={description}
            rows={5}
            disabled={isProcessing}
            placeholder="Describe the products included in this category."
            onChange={(event) => {
              setDescription(
                event.target.value
              );

              clearValidation();
            }}
          />

          <div className="admin-category-image-field">
            <div className="admin-category-image-label-row">
              <div>
                <span className="admin-category-image-label">
                  Category image
                </span>
                <small>Optional · JPG, PNG or WebP · max 5 MB</small>
              </div>

              {imagePreviewUrl && (
                <button
                  type="button"
                  className="admin-category-image-remove"
                  onClick={handleRemoveImage}
                  disabled={isProcessing}
                >
                  <Trash2 size={14} />
                  Remove image
                </button>
              )}
            </div>

            <label
              className={`admin-category-image-picker ${
                imagePreviewUrl ? "has-preview" : ""
              }`}
              htmlFor="admin-category-image"
            >
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt={`${categoryName || "Category"} preview`}
                />
              ) : (
                <span className="admin-category-image-empty">
                  <ImagePlus size={24} />
                  <strong>Upload category image</strong>
                  <small>Recommended: 1200 × 800 px</small>
                </span>
              )}
            </label>

            <input
              ref={imageInputRef}
              id="admin-category-image"
              className="admin-category-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isProcessing}
              onChange={handleImageChange}
            />

            {imagePreviewUrl && (
              <button
                type="button"
                className="admin-category-image-change"
                onClick={() => imageInputRef.current?.click()}
                disabled={isProcessing}
              >
                <ImagePlus size={14} />
                Choose another image
              </button>
            )}
          </div>

          <div className="admin-category-manager-field">
            <span>
              Administrator authority
            </span>

            <strong>
              Derived securely from the authenticated session by the backend
            </strong>
          </div>

          <div
            className="admin-category-validation"
            role={
              validationMessage
                ? "alert"
                : undefined
            }
          >
            {validationMessage}
          </div>
        </div>

        <div className="admin-confirm-actions">
          <button
            type="button"
            className="admin-modal-cancel-button"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="admin-modal-confirm-button admin-modal-confirm-success"
            disabled={isProcessing}
          >
            {isProcessing
              ? "Saving..."
              : isEditMode
              ? "Save Changes"
              : "Create Category"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CategoryFormModal;
