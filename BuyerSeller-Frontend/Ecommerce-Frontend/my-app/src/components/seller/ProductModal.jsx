import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PRODUCT_CONDITION_CODES,
  PRODUCT_STATUS,
} from "../../constants/marketplace";
import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";
import "../../styles/seller/ProductModal.css";

const VARIANT_STATUSES = [
  PRODUCT_STATUS.ACTIVE,
  PRODUCT_STATUS.INACTIVE,
  PRODUCT_STATUS.OUT_OF_STOCK,
];

const SELLER_PRODUCT_STATUSES = [
  PRODUCT_STATUS.DRAFT,
  PRODUCT_STATUS.ACTIVE,
  PRODUCT_STATUS.INACTIVE,
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const createVariant = () => ({
  sku: "",
  variantName: "",
  size: "",
  color: "",
  storageCapacity: "",
  price: "",
  costPrice: "",
  stockQuantity: "0",
  status: PRODUCT_STATUS.ACTIVE,
});

const createImage = (displayOrder = 1) => ({
  imageUrl: "",
  file: null,
  previewUrl: "",
  originalFileName: "",
  fileError: "",
  altText: "",
  displayOrder: String(displayOrder),
  isPrimary: displayOrder === 1,
});

const createItem = () => ({ label: "", value: "" });
const createGroup = () => ({ name: "", items: [createItem()] });

const createForm = (product, categories) => {
  const info = product?.productInfo || {};
  return {
    productName: product?.productName || "",
    shortDescription: product?.shortDescription || "",
    description: product?.description || "",
    brand: product?.brand || "",
    modelNumber: product?.modelNumber || "",
    productCondition: product?.productCondition || "NEW",
    conditionDescription: product?.conditionDescription || "",
    categoryId: String(
      product?.categoryId ?? categories[0]?.categoryId ?? ""
    ),
    status: product?.status || PRODUCT_STATUS.DRAFT,
    productInfo: {
      productDetails: {
        items: info.productDetails?.items?.length
          ? structuredClone(info.productDetails.items)
          : [createItem()],
      },
      specifications: {
        groups: info.specifications?.groups?.length
          ? structuredClone(info.specifications.groups)
          : [createGroup()],
      },
      whatsInTheBox: {
        items: info.whatsInTheBox?.items?.length
          ? structuredClone(info.whatsInTheBox.items)
          : [createItem()],
      },
      warrantyInformation: info.warrantyInformation || "",
      returnPolicy: info.returnPolicy || "",
      careInstructions: info.careInstructions || "",
      additionalInformation: info.additionalInformation || "",
    },
    images: product?.images?.length
      ? product.images.map((image) => ({
          ...image,
          file: null,
          previewUrl: "",
          fileError: "",
          originalFileName: image.originalFileName || "",
          displayOrder: String(image.displayOrder ?? ""),
        }))
      : [createImage()],
    variants: product?.variants?.length
      ? product.variants.map((variant) => ({
          ...createVariant(),
          ...variant,
          price: String(variant.price ?? ""),
          costPrice: String(variant.costPrice ?? ""),
          stockQuantity: String(variant.stockQuantity ?? 0),
        }))
      : [createVariant()],
  };
};

const PlusIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 4v12M4 10h12" />
  </svg>
);

const RemoveIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 6h12M8 3h4l1 3H7l1-3Zm-2 3 1 11h6l1-11M8.5 9v5M11.5 9v5" />
  </svg>
);

const ProductIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10" />
  </svg>
);

function ProductModal({
  isOpen,
  mode = "add",
  product = null,
  onClose,
  onSave,
  onDelete,
  categoryOptions = [],
}) {
  const { t } = useTranslation();
  const submittingRef = useRef(false);
  const previewUrlsRef = useRef(new Set());
  const [formData, setFormData] = useState(() =>
    createForm(product, categoryOptions)
  );
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const overlay = useOverlayAccessibility({
    isOpen,
    onClose,
    preventClose: isSubmitting,
  });

  const clearPreviewUrls = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (isOpen) {
      clearPreviewUrls();
      setFormData(createForm(product, categoryOptions));
      setFormError("");
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }, [categoryOptions, clearPreviewUrls, isOpen, mode, product]);

  useEffect(() => () => clearPreviewUrls(), [clearPreviewUrls]);

  if (!isOpen) {
    return null;
  }

  const updateField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setFormError("");
  };

  const updateInfoField = (name, value) => {
    setFormData((current) => ({
      ...current,
      productInfo: { ...current.productInfo, [name]: value },
    }));
    setFormError("");
  };

  const updateNestedItem = (section, index, name, value) => {
    setFormData((current) => ({
      ...current,
      productInfo: {
        ...current.productInfo,
        [section]: {
          ...current.productInfo[section],
          items: current.productInfo[section].items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, [name]: value } : item
          ),
        },
      },
    }));
  };

  const updateSpecification = (groupIndex, itemIndex, name, value) => {
    setFormData((current) => ({
      ...current,
      productInfo: {
        ...current.productInfo,
        specifications: {
          groups: current.productInfo.specifications.groups.map(
            (group, currentGroupIndex) => {
              if (currentGroupIndex !== groupIndex) {
                return group;
              }
              if (itemIndex === null) {
                return { ...group, [name]: value };
              }
              return {
                ...group,
                items: group.items.map((item, currentItemIndex) =>
                  currentItemIndex === itemIndex
                    ? { ...item, [name]: value }
                    : item
                ),
              };
            }
          ),
        },
      },
    }));
  };

  const updateRow = (section, index, name, value) => {
    setFormData((current) => ({
      ...current,
      [section]: current[section].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [name]: value } : item
      ),
    }));
    setFormError("");
  };

  const handleImageFileChange = (index, file) => {
    if (!file) {
      return;
    }

    const type = String(file.type || "").toLowerCase();
    let fileError = "";

    if (!ACCEPTED_IMAGE_TYPES.has(type)) {
      fileError = "products.modal.imageTypeError";
    } else if (file.size <= 0) {
      fileError = "products.modal.imageEmptyError";
    } else if (file.size > MAX_IMAGE_SIZE) {
      fileError = "products.modal.imageSizeError";
    }

    setFormData((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => {
        if (imageIndex !== index) {
          return image;
        }

        if (fileError) {
          return { ...image, fileError };
        }

        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
          previewUrlsRef.current.delete(image.previewUrl);
        }

        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);

        return {
          ...image,
          file,
          previewUrl,
          originalFileName: file.name,
          fileError: "",
        };
      }),
    }));
    setFormError("");
  };

  const setPrimaryImage = (index) => {
    setFormData((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => ({
        ...image,
        isPrimary: imageIndex === index,
      })),
    }));
    setFormError("");
  };

  const removeImage = (index) => {
    setFormData((current) => {
      const removedImage = current.images[index];
      if (removedImage?.previewUrl) {
        URL.revokeObjectURL(removedImage.previewUrl);
        previewUrlsRef.current.delete(removedImage.previewUrl);
      }

      const nextImages = current.images.filter(
        (_, imageIndex) => imageIndex !== index
      );

      if (nextImages.length && !nextImages.some((image) => image.isPrimary)) {
        nextImages[0] = { ...nextImages[0], isPrimary: true };
      }

      return { ...current, images: nextImages };
    });
    setFormError("");
  };

  const addInfoItem = (section) =>
    setFormData((current) => ({
      ...current,
      productInfo: {
        ...current.productInfo,
        [section]: {
          ...current.productInfo[section],
          items: [...current.productInfo[section].items, createItem()],
        },
      },
    }));

  const removeInfoItem = (section, index) =>
    setFormData((current) => ({
      ...current,
      productInfo: {
        ...current.productInfo,
        [section]: {
          ...current.productInfo[section],
          items: current.productInfo[section].items.filter(
            (_, itemIndex) => itemIndex !== index
          ),
        },
      },
    }));

  const removeSpecificationItem = (groupIndex, itemIndex) =>
    setFormData((current) => ({
      ...current,
      productInfo: {
        ...current.productInfo,
        specifications: {
          groups: current.productInfo.specifications.groups.map(
            (group, currentGroupIndex) =>
              currentGroupIndex === groupIndex
                ? {
                    ...group,
                    items: group.items.filter(
                      (_, currentItemIndex) => currentItemIndex !== itemIndex
                    ),
                  }
                : group
          ),
        },
      },
    }));

  const removeSpecificationGroup = (groupIndex) =>
    setFormData((current) => ({
      ...current,
      productInfo: {
        ...current.productInfo,
        specifications: {
          groups: current.productInfo.specifications.groups.filter(
            (_, currentGroupIndex) => currentGroupIndex !== groupIndex
          ),
        },
      },
    }));

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setFormError("");
    try {
      await onSave(formData);
    } catch (error) {
      if (error.partialProductId) {
        setFormData((current) => ({
          ...current,
          productId: error.partialProductId,
        }));
      }

      const errorKeys = {
        PRODUCT_NAME_REQUIRED: "products.modal.namePlaceholder",
        CATEGORY_REQUIRED: "products.invalidProduct",
        PRODUCT_FIELD_TOO_LONG: "products.invalidProduct",
        INVALID_PRODUCT_INFO: "products.invalidProductInfo",
        CONDITION_DESCRIPTION_REQUIRED: "products.conditionDescriptionRequired",
        VARIANT_REQUIRED: "products.atLeastOneVariant",
        SELLABLE_VARIANT_REQUIRED: "products.atLeastOneVariant",
        DUPLICATE_VARIANT_SKU: "products.duplicateSku",
        DUPLICATE_VARIANT_COMBINATION: "products.duplicateVariantCombination",
        INVALID_VARIANT: "products.invalidVariant",
        INVALID_IMAGES: "products.invalidImages",
        IMAGE_FILE_REQUIRED: "products.modal.imageRequiredError",
        IMAGE_FILE_EMPTY: "products.modal.imageEmptyError",
        IMAGE_FILE_TOO_LARGE: "products.modal.imageSizeError",
        IMAGE_TYPE_NOT_SUPPORTED: "products.modal.imageTypeError",
        IMAGE_FILE_INVALID: "products.modal.imageInvalidError",
      };
      setFormError(
        t(
          errorKeys[error.code] ||
            errorKeys[error.message] ||
            "products.modal.saveError"
        )
      );
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const statusLabel = (status) => {
    const statusKeys = {
      [PRODUCT_STATUS.DRAFT]: "products.draft",
      [PRODUCT_STATUS.ACTIVE]: "products.active",
      [PRODUCT_STATUS.INACTIVE]: "products.inactive",
      [PRODUCT_STATUS.OUT_OF_STOCK]: "products.outOfStock",
      [PRODUCT_STATUS.DELETED]: "products.deleted",
    };
    return t(statusKeys[status] || status);
  };

  const isDelete = mode === "delete";
  const title = isDelete
    ? t("products.modal.deleteTitle")
    : mode === "edit"
      ? t("products.modal.editTitle")
      : t("products.modal.addTitle");
  const sectionLinks = [
    ["product-modal-basic", "products.modal.sections.basic"],
    ["product-modal-information", "products.modal.sections.information"],
    ["product-modal-images", "products.modal.sections.images"],
    ["product-modal-variants", "products.modal.sections.variants"],
  ];

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div
      ref={overlay.overlayRef}
      className="seller-product-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submittingRef.current) {
          onClose();
        }
      }}
    >
      <section
        className={`seller-product-modal__dialog ${
          isDelete ? "seller-product-modal__dialog--delete" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-product-modal-title"
        aria-describedby="seller-product-modal-description"
        tabIndex="-1"
      >
        <header className="seller-product-modal__header">
          <div className="seller-product-modal__heading">
            <span className="seller-product-modal__product-icon">
              <ProductIcon />
            </span>
            <div>
              <h2 id="seller-product-modal-title">{title}</h2>
              <p id="seller-product-modal-description">
                {isDelete
                  ? t("products.modal.deleteDescription", {
                      name: product?.productName,
                    })
                  : t(
                      mode === "edit"
                        ? "products.modal.editDescription"
                        : "products.modal.addDescription"
                    )}
              </p>
            </div>
          </div>
          <button
            ref={isDelete ? overlay.initialFocusRef : undefined}
            type="button"
            className="seller-product-modal__close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t("products.modal.close")}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        {isDelete ? (
          <footer className="seller-product-modal__actions">
            <button
              type="button"
              className="seller-product-modal__button seller-product-modal__button--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="seller-product-modal__button seller-product-modal__button--danger-solid"
              onClick={onDelete}
              disabled={isSubmitting}
            >
              {t("products.modal.deleteProduct")}
            </button>
          </footer>
        ) : (
          <form className="seller-product-modal__form" onSubmit={submit}>
            <nav
              className="seller-product-modal__navigation"
              aria-label={t("products.modal.sectionNavigation")}
            >
              {sectionLinks.map(([sectionId, labelKey], index) => (
                <button
                  key={sectionId}
                  type="button"
                  onClick={() => scrollToSection(sectionId)}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  {t(labelKey)}
                </button>
              ))}
            </nav>

            <div className="seller-product-modal__body">
              <section
                id="product-modal-basic"
                className="seller-product-modal__section"
                aria-labelledby="product-modal-basic-title"
              >
                <div className="seller-product-modal__section-heading">
                  <span aria-hidden="true">01</span>
                  <div>
                    <h3 id="product-modal-basic-title">
                      {t("products.modal.sections.basic")}
                    </h3>
                    <p>{t("products.modal.sectionDescriptions.basic")}</p>
                  </div>
                </div>
                <div className="seller-product-modal__fields">
                  <div className="seller-product-modal__field seller-product-modal__field--full">
                    <label htmlFor="product-name">{t("products.modal.name")}</label>
                    <input
                      ref={overlay.initialFocusRef}
                      id="product-name"
                      value={formData.productName}
                      onChange={(event) =>
                        updateField("productName", event.target.value)
                      }
                      maxLength={200}
                      required
                    />
                  </div>
                  <div className="seller-product-modal__field seller-product-modal__field--full">
                    <label htmlFor="product-short-description">
                      {t("products.modal.shortDescription")}
                    </label>
                    <textarea
                      id="product-short-description"
                      className="seller-product-modal__textarea--short"
                      value={formData.shortDescription}
                      onChange={(event) =>
                        updateField("shortDescription", event.target.value)
                      }
                      maxLength={500}
                    />
                  </div>
                  <div className="seller-product-modal__field seller-product-modal__field--full">
                    <label htmlFor="product-description">
                      {t("products.modal.description")}
                    </label>
                    <textarea
                      id="product-description"
                      value={formData.description}
                      onChange={(event) =>
                        updateField("description", event.target.value)
                      }
                    />
                  </div>
                  {[
                    ["brand", "products.modal.brand", 100],
                    ["modelNumber", "products.modal.modelNumber", 100],
                  ].map(([name, labelKey, maxLength]) => (
                    <div className="seller-product-modal__field" key={name}>
                      <label htmlFor={`product-${name}`}>{t(labelKey)}</label>
                      <input
                        id={`product-${name}`}
                        value={formData[name]}
                        onChange={(event) => updateField(name, event.target.value)}
                        maxLength={maxLength}
                      />
                    </div>
                  ))}
                  <div className="seller-product-modal__field">
                    <label htmlFor="product-category">
                      {t("products.modal.category")}
                    </label>
                    <select
                      id="product-category"
                      value={formData.categoryId}
                      onChange={(event) =>
                        updateField("categoryId", event.target.value)
                      }
                      aria-describedby="product-category-help"
                      required
                    >
                      <option value="">{t("products.modal.selectCategory")}</option>
                      {categoryOptions.map((category) => (
                        <option
                          key={category.categoryId}
                          value={category.categoryId}
                        >
                          {category.categoryName}
                        </option>
                      ))}
                    </select>
                    <small id="product-category-help">
                      {t("products.modal.categoryHelp")}
                    </small>
                    {categoryOptions.length === 0 && (
                      <p className="seller-product-modal__empty-note" role="status">
                        {t("products.modal.noCategories")}
                      </p>
                    )}
                  </div>
                  <div className="seller-product-modal__field">
                    <label htmlFor="product-condition">
                      {t("products.condition")}
                    </label>
                    <select
                      id="product-condition"
                      value={formData.productCondition}
                      onChange={(event) =>
                        updateField("productCondition", event.target.value)
                      }
                    >
                      {PRODUCT_CONDITION_CODES.map((condition) => (
                        <option key={condition} value={condition}>
                          {t(`products.conditionCodes.${condition}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="seller-product-modal__field seller-product-modal__field--full">
                    <label htmlFor="product-condition-description">
                      {t("products.modal.conditionDescription")}
                    </label>
                    <textarea
                      id="product-condition-description"
                      className="seller-product-modal__textarea--short"
                      value={formData.conditionDescription}
                      onChange={(event) =>
                        updateField("conditionDescription", event.target.value)
                      }
                      maxLength={500}
                      required={formData.productCondition !== "NEW"}
                    />
                  </div>
                  <div className="seller-product-modal__field seller-product-modal__field--compact">
                    <label htmlFor="product-status">
                      {t("products.modal.publicationStatus")}
                    </label>
                    <select
                      id="product-status"
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                    >
                      {[...new Set([...SELLER_PRODUCT_STATUSES, formData.status])].map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                            disabled={status === PRODUCT_STATUS.OUT_OF_STOCK}
                          >
                            {statusLabel(status)}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </section>

              <section
                id="product-modal-information"
                className="seller-product-modal__section"
                aria-labelledby="product-modal-information-title"
              >
                <div className="seller-product-modal__section-heading">
                  <span aria-hidden="true">02</span>
                  <div>
                    <h3 id="product-modal-information-title">
                      {t("products.modal.sections.information")}
                    </h3>
                    <p>{t("products.modal.sectionDescriptions.information")}</p>
                  </div>
                </div>

                {["productDetails", "whatsInTheBox"].map((section) => (
                  <fieldset className="seller-product-modal__builder" key={section}>
                    <legend>
                      {t(
                        section === "productDetails"
                          ? "products.modal.productDetails"
                          : "products.modal.whatsInTheBox"
                      )}
                    </legend>
                    <div className="seller-product-modal__repeater">
                      {formData.productInfo[section].items.map((item, index) => (
                        <div className="seller-product-modal__repeater-row" key={index}>
                          <div className="seller-product-modal__field">
                            <label htmlFor={`${section}-label-${index}`}>
                              {t("products.modal.itemLabel")}
                            </label>
                            <input
                              id={`${section}-label-${index}`}
                              value={item.label || ""}
                              onChange={(event) =>
                                updateNestedItem(
                                  section,
                                  index,
                                  "label",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                          <div className="seller-product-modal__field">
                            <label htmlFor={`${section}-value-${index}`}>
                              {t("products.modal.itemValue")}
                            </label>
                            <input
                              id={`${section}-value-${index}`}
                              value={item.value || ""}
                              onChange={(event) =>
                                updateNestedItem(
                                  section,
                                  index,
                                  "value",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                          <button
                            type="button"
                            className="seller-product-modal__button seller-product-modal__button--danger seller-product-modal__button--row-action"
                            onClick={() => removeInfoItem(section, index)}
                            aria-label={t("products.modal.removeItemNumber", {
                              number: index + 1,
                            })}
                          >
                            <RemoveIcon />
                            {t("products.modal.removeItem")}
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="seller-product-modal__button seller-product-modal__button--secondary seller-product-modal__button--add"
                      onClick={() => addInfoItem(section)}
                    >
                      <PlusIcon />
                      {t("products.modal.addItem")}
                    </button>
                  </fieldset>
                ))}

                <fieldset className="seller-product-modal__builder">
                  <legend>{t("products.modal.specifications")}</legend>
                  <div className="seller-product-modal__groups">
                    {formData.productInfo.specifications.groups.map(
                      (group, groupIndex) => (
                        <article className="seller-product-modal__group" key={groupIndex}>
                          <div className="seller-product-modal__group-header">
                            <div className="seller-product-modal__field">
                              <label htmlFor={`specification-group-${groupIndex}`}>
                                {t("products.modal.groupName")}
                              </label>
                              <input
                                id={`specification-group-${groupIndex}`}
                                value={group.name || ""}
                                onChange={(event) =>
                                  updateSpecification(
                                    groupIndex,
                                    null,
                                    "name",
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                            <button
                              type="button"
                              className="seller-product-modal__button seller-product-modal__button--danger"
                              onClick={() => removeSpecificationGroup(groupIndex)}
                            >
                              <RemoveIcon />
                              {t("products.modal.removeGroup")}
                            </button>
                          </div>
                          <div className="seller-product-modal__repeater">
                            {group.items.map((item, itemIndex) => (
                              <div
                                className="seller-product-modal__repeater-row"
                                key={itemIndex}
                              >
                                <div className="seller-product-modal__field">
                                  <label
                                    htmlFor={`specification-${groupIndex}-${itemIndex}-label`}
                                  >
                                    {t("products.modal.itemLabel")}
                                  </label>
                                  <input
                                    id={`specification-${groupIndex}-${itemIndex}-label`}
                                    value={item.label || ""}
                                    onChange={(event) =>
                                      updateSpecification(
                                        groupIndex,
                                        itemIndex,
                                        "label",
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="seller-product-modal__field">
                                  <label
                                    htmlFor={`specification-${groupIndex}-${itemIndex}-value`}
                                  >
                                    {t("products.modal.itemValue")}
                                  </label>
                                  <input
                                    id={`specification-${groupIndex}-${itemIndex}-value`}
                                    value={item.value || ""}
                                    onChange={(event) =>
                                      updateSpecification(
                                        groupIndex,
                                        itemIndex,
                                        "value",
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="seller-product-modal__button seller-product-modal__button--danger seller-product-modal__button--row-action"
                                  onClick={() =>
                                    removeSpecificationItem(groupIndex, itemIndex)
                                  }
                                  aria-label={t("products.modal.removeSpecificationNumber", {
                                    number: itemIndex + 1,
                                  })}
                                >
                                  <RemoveIcon />
                                  {t("products.modal.removeItem")}
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="seller-product-modal__button seller-product-modal__button--secondary seller-product-modal__button--add"
                            onClick={() =>
                              setFormData((current) => {
                                const groups = structuredClone(
                                  current.productInfo.specifications.groups
                                );
                                groups[groupIndex].items.push(createItem());
                                return {
                                  ...current,
                                  productInfo: {
                                    ...current.productInfo,
                                    specifications: { groups },
                                  },
                                };
                              })
                            }
                          >
                            <PlusIcon />
                            {t("products.modal.addSpecification")}
                          </button>
                        </article>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    className="seller-product-modal__button seller-product-modal__button--secondary seller-product-modal__button--add"
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        productInfo: {
                          ...current.productInfo,
                          specifications: {
                            groups: [
                              ...current.productInfo.specifications.groups,
                              createGroup(),
                            ],
                          },
                        },
                      }))
                    }
                  >
                    <PlusIcon />
                    {t("products.modal.addGroup")}
                  </button>
                </fieldset>

                <div className="seller-product-modal__long-fields">
                  {[
                    ["warrantyInformation", "products.modal.warrantyInformation"],
                    ["returnPolicy", "products.modal.returnPolicy"],
                    ["careInstructions", "products.modal.careInstructions"],
                    ["additionalInformation", "products.modal.additionalInformation"],
                  ].map(([name, labelKey]) => (
                    <div className="seller-product-modal__field" key={name}>
                      <label htmlFor={`product-info-${name}`}>{t(labelKey)}</label>
                      <textarea
                        id={`product-info-${name}`}
                        value={formData.productInfo[name]}
                        onChange={(event) =>
                          updateInfoField(name, event.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section
                id="product-modal-images"
                className="seller-product-modal__section"
                aria-labelledby="product-modal-images-title"
              >
                <div className="seller-product-modal__section-heading seller-product-modal__section-heading--with-action">
                  <span aria-hidden="true">03</span>
                  <div>
                    <h3 id="product-modal-images-title">
                      {t("products.modal.sections.images")}
                    </h3>
                    <p>{t("products.modal.sectionDescriptions.images")}</p>
                  </div>
                  <button
                    type="button"
                    className="seller-product-modal__button seller-product-modal__button--secondary"
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        images: [
                          ...current.images,
                          createImage(current.images.length + 1),
                        ],
                      }))
                    }
                  >
                    <PlusIcon />
                    {t("products.modal.addImage")}
                  </button>
                </div>
                <div className="seller-product-modal__cards">
                  {formData.images.map((image, index) => (
                    <fieldset
                      className="seller-product-modal__entity-card seller-product-modal__image-card"
                      key={image.imageId || `image-${index}`}
                    >
                      <legend>{t("products.modal.imageNumber", { number: index + 1 })}</legend>
                      <div className="seller-product-modal__image-layout">
                        <div className="seller-product-modal__preview">
                          {image.previewUrl || image.imageUrl ? (
                            <img
                              key={image.previewUrl || image.imageUrl}
                              src={image.previewUrl || image.imageUrl}
                              alt={image.altText || t("products.modal.imagePreview")}
                              onError={(event) => {
                                event.currentTarget.hidden = true;
                              }}
                            />
                          ) : null}
                          <span aria-hidden="true"><ProductIcon /></span>
                          <small>{t("products.modal.imagePreview")}</small>
                        </div>
                        <div className="seller-product-modal__image-fields">
                          <div className="seller-product-modal__field seller-product-modal__field--full">
                            <label htmlFor={`image-${index}-file`}>
                              {image.imageId || image.file
                                ? t("products.modal.replaceImage")
                                : t("products.modal.chooseImage")}
                            </label>
                            <input
                              id={`image-${index}-file`}
                              className="seller-product-modal__file-input"
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                              aria-describedby={`image-${index}-file-help`}
                              onChange={(event) =>
                                handleImageFileChange(index, event.target.files?.[0])
                              }
                            />
                            <small id={`image-${index}-file-help`}>
                              {image.file?.name ||
                                image.originalFileName ||
                                (image.imageId
                                  ? t("products.modal.storedImage")
                                  : t("products.modal.imageFileHelp"))}
                            </small>
                            {image.fileError && (
                              <p className="seller-product-modal__field-error" role="alert">
                                {t(image.fileError)}
                              </p>
                            )}
                          </div>
                          <div className="seller-product-modal__field">
                            <label htmlFor={`image-${index}-alt-text`}>
                              {t("products.modal.altText")}
                            </label>
                            <input
                              id={`image-${index}-alt-text`}
                              value={image.altText || ""}
                              maxLength={255}
                              onChange={(event) =>
                                updateRow("images", index, "altText", event.target.value)
                              }
                            />
                          </div>
                          <div className="seller-product-modal__field">
                            <label htmlFor={`image-${index}-display-order`}>
                              {t("products.modal.displayOrder")}
                            </label>
                            <input
                              id={`image-${index}-display-order`}
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={image.displayOrder}
                              aria-describedby={`image-${index}-display-order-help`}
                              onChange={(event) =>
                                updateRow(
                                  "images",
                                  index,
                                  "displayOrder",
                                  event.target.value
                                )
                              }
                              required
                            />
                            <small id={`image-${index}-display-order-help`}>
                              {t("products.modal.displayOrderHelp")}
                            </small>
                          </div>
                          <label className="seller-product-modal__switch">
                            <input
                              type="checkbox"
                              checked={image.isPrimary}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setPrimaryImage(index);
                                }
                              }}
                            />
                            <span aria-hidden="true" />
                            {t("products.modal.primaryImage")}
                          </label>
                        </div>
                      </div>
                      <div className="seller-product-modal__entity-actions">
                        <button
                          type="button"
                          className="seller-product-modal__button seller-product-modal__button--danger"
                          onClick={() => removeImage(index)}
                          aria-label={t("products.modal.removeImageNumber", {
                            number: index + 1,
                          })}
                        >
                          <RemoveIcon />
                          {t("products.modal.removeImage")}
                        </button>
                      </div>
                    </fieldset>
                  ))}
                </div>
              </section>

              <section
                id="product-modal-variants"
                className="seller-product-modal__section"
                aria-labelledby="product-modal-variants-title"
              >
                <div className="seller-product-modal__section-heading seller-product-modal__section-heading--with-action">
                  <span aria-hidden="true">04</span>
                  <div>
                    <h3 id="product-modal-variants-title">
                      {t("products.modal.sections.variants")}
                    </h3>
                    <p>{t("products.modal.sectionDescriptions.variants")}</p>
                  </div>
                  <button
                    type="button"
                    className="seller-product-modal__button seller-product-modal__button--secondary"
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        variants: [...current.variants, createVariant()],
                      }))
                    }
                  >
                    <PlusIcon />
                    {t("products.addVariant")}
                  </button>
                </div>
                <div className="seller-product-modal__cards">
                  {formData.variants.map((variant, index) => (
                    <fieldset
                      className="seller-product-modal__entity-card"
                      key={variant.variantId || `variant-${index}`}
                    >
                      <legend>{t("products.modal.variantNumber", { number: index + 1 })}</legend>
                      <div className="seller-product-modal__variant-summary" aria-hidden="true">
                        <span>{variant.sku || t("products.modal.skuNotSet")}</span>
                        <small>
                          {t("products.modal.variantSummary", {
                            price: variant.price || "—",
                            stock: variant.stockQuantity || "0",
                            status: statusLabel(variant.status),
                          })}
                        </small>
                      </div>
                      <div className="seller-product-modal__variant-grid">
                        {[
                          ["sku", "products.modal.sku", 100, true],
                          ["variantName", "products.modal.variantName", 150, false],
                          ["size", "products.modal.size", 50, false],
                          ["color", "products.modal.color", 50, false],
                          ["storageCapacity", "products.modal.storageCapacity", 50, false],
                        ].map(([name, labelKey, maxLength, required]) => (
                          <div
                            className={`seller-product-modal__field seller-product-modal__variant-field--${name}`}
                            key={name}
                          >
                            <label htmlFor={`variant-${index}-${name}`}>{t(labelKey)}</label>
                            <input
                              id={`variant-${index}-${name}`}
                              value={variant[name] || ""}
                              maxLength={maxLength}
                              required={required}
                              onChange={(event) =>
                                updateRow(
                                  "variants",
                                  index,
                                  name,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                        {[
                          ["price", "products.modal.price", "decimal"],
                          ["costPrice", "products.modal.costPrice", "decimal"],
                          ["stockQuantity", "products.modal.stock", "numeric"],
                        ].map(([name, labelKey, inputMode]) => (
                          <div className="seller-product-modal__field" key={name}>
                            <label htmlFor={`variant-${index}-${name}`}>{t(labelKey)}</label>
                            <input
                              id={`variant-${index}-${name}`}
                              type="number"
                              min="0"
                              step={name === "stockQuantity" ? "1" : "0.01"}
                              inputMode={inputMode}
                              value={variant[name]}
                              aria-describedby={
                                name === "costPrice"
                                  ? `variant-${index}-cost-help`
                                  : undefined
                              }
                              required
                              onChange={(event) =>
                                updateRow(
                                  "variants",
                                  index,
                                  name,
                                  event.target.value
                                )
                              }
                            />
                            {name === "costPrice" && (
                              <small id={`variant-${index}-cost-help`}>
                                {t("products.modal.costPriceHelp")}
                              </small>
                            )}
                          </div>
                        ))}
                        <div className="seller-product-modal__field seller-product-modal__variant-status">
                          <label htmlFor={`variant-${index}-status`}>
                            {t("products.modal.variantStatus")}
                          </label>
                          <select
                            id={`variant-${index}-status`}
                            value={variant.status}
                            onChange={(event) =>
                              updateRow(
                                "variants",
                                index,
                                "status",
                                event.target.value
                              )
                            }
                          >
                            {VARIANT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="seller-product-modal__entity-actions">
                        <button
                          type="button"
                          className="seller-product-modal__button seller-product-modal__button--danger"
                          onClick={() =>
                            setFormData((current) => ({
                              ...current,
                              variants: current.variants.filter(
                                (_, currentIndex) => currentIndex !== index
                              ),
                            }))
                          }
                          aria-label={t("products.modal.removeVariantNumber", {
                            number: index + 1,
                          })}
                        >
                          <RemoveIcon />
                          {t("products.removeVariant")}
                        </button>
                      </div>
                    </fieldset>
                  ))}
                </div>
              </section>

              {formError && (
                <p className="seller-product-modal__error" role="alert">
                  {formError}
                </p>
              )}
            </div>

            <footer className="seller-product-modal__actions">
              <button
                type="button"
                className="seller-product-modal__button seller-product-modal__button--secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="seller-product-modal__button seller-product-modal__button--primary"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("common.loading")
                  : mode === "edit"
                    ? t("products.modal.saveChanges")
                    : t("products.addProduct")}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

export default ProductModal;
