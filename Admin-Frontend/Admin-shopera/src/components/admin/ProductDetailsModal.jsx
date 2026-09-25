import {
  CalendarDays,
  DollarSign,
  Hash,
  Image,
  Layers,
  Package,
  ShieldCheck,
  Store,
  Tag,
  X,
} from "lucide-react";

import AdminStatusBadge from "./AdminStatusBadge";
import {
  hasMeaningfulProductInfo,
  humanizeProductInfoKey,
  parseStructuredProductInfo,
} from "../../utils/productInfoFormatting.js";

const currencyFormatter =
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  });


function StructuredProductInfo({ value }) {
  const parsedValue =
    parseStructuredProductInfo(value);

  if (!hasMeaningfulProductInfo(parsedValue)) {
    return null;
  }

  if (
    typeof parsedValue === "string" ||
    typeof parsedValue === "number" ||
    typeof parsedValue === "boolean"
  ) {
    return (
      <p className="admin-product-structured-text">
        {String(parsedValue)}
      </p>
    );
  }

  if (Array.isArray(parsedValue)) {
    const items = parsedValue.filter(
      hasMeaningfulProductInfo,
    );

    return (
      <ul className="admin-product-structured-bullets">
        {items.map((item, index) => (
          <li key={index}>
            <StructuredProductInfo value={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (Array.isArray(parsedValue.groups)) {
    const groups = parsedValue.groups.filter(
      hasMeaningfulProductInfo,
    );

    return (
      <div className="admin-product-structured-groups">
        {groups.map((group, index) => (
          <div
            className="admin-product-structured-group"
            key={`${group?.name || "group"}-${index}`}
          >
            {group?.name && (
              <span className="admin-product-structured-group-title">
                {group.name}
              </span>
            )}

            <StructuredProductInfo
              value={group?.items || group}
            />
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(parsedValue.items)) {
    const items = parsedValue.items.filter(
      hasMeaningfulProductInfo,
    );

    return (
      <dl className="admin-product-structured-list">
        {items.map((item, index) => {
          if (
            item &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            ("label" in item || "value" in item)
          ) {
            const label = String(
              item.label || "",
            ).trim();

            return (
              <div
                className="admin-product-structured-row"
                key={`${label || "item"}-${index}`}
              >
                {label && <dt>{label}</dt>}
                <dd>
                  <StructuredProductInfo
                    value={item.value}
                  />
                </dd>
              </div>
            );
          }

          return (
            <div
              className="admin-product-structured-row"
              key={index}
            >
              <dd>
                <StructuredProductInfo value={item} />
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  const entries = Object.entries(parsedValue).filter(
    ([, entryValue]) =>
      hasMeaningfulProductInfo(entryValue),
  );

  return (
    <dl className="admin-product-structured-list">
      {entries.map(([key, entryValue]) => (
        <div
          className="admin-product-structured-row"
          key={key}
        >
          <dt>{humanizeProductInfoKey(key)}</dt>
          <dd>
            <StructuredProductInfo
              value={entryValue}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

function ProductDetailsModal({
  isOpen,
  product,
  onClose,
  onRequestAction,
}) {
  if (!isOpen || !product) {
    return null;
  }

  const formattedCreatedDate =
    formatDate(product.createdDate);

  const isDeleted =
    product.status === "DELETED";

  const isActive =
    product.status === "ACTIVE";

  const isInactive =
    product.status === "INACTIVE";

  const storeCanOperate =
    product.storeCanOperate === true;

  const isSaleEnabled =
    product.isSaleEnabled === true;

  const productInformationSections = [
    {
      label: "Product Details",
      value:
        product.productInfo
          ?.productDetails,
    },
    {
      label: "Specifications",
      value:
        product.productInfo
          ?.specifications,
    },
    {
      label: "What's in the Box",
      value:
        product.productInfo
          ?.whatsInTheBox,
    },
    {
      label: "Warranty Information",
      value:
        product.productInfo
          ?.warrantyInformation,
    },
    {
      label: "Return Policy",
      value:
        product.productInfo
          ?.returnPolicy,
    },
    {
      label: "Care Instructions",
      value:
        product.productInfo
          ?.careInstructions,
    },
    {
      label: "Additional Information",
      value:
        product.productInfo
          ?.additionalInformation,
    },
  ].filter((section) =>
    hasMeaningfulProductInfo(section.value),
  );

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="admin-product-details-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-product-details-title"
      >
        <button
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div className="admin-product-details-header">
          <div className="admin-product-main-image">
            {product.primaryImageUrl ? (
              <img
                src={
                  product.primaryImageUrl
                }
                alt={
                  product.primaryImageAlt
                }
              />
            ) : (
              <Package size={34} />
            )}
          </div>

          <div>
            <h2 id="admin-product-details-title">
              {product.productName}
            </h2>

            <p>
              {product.shortDescription ||
                "No short description provided."}
            </p>

            <div className="admin-user-modal-badges">
              <AdminStatusBadge
                status={product.status}
              />

              <AdminStatusBadge
                status={
                  product.productCondition
                }
              />

              <AdminStatusBadge
                status={
                  storeCanOperate
                    ? "OPERATIONAL"
                    : "NOT_OPERATIONAL"
                }
              />
            </div>
          </div>
        </div>

        <section className="admin-product-summary-grid">
          <article className="admin-product-summary-card">
            <DollarSign size={19} />

            <div>
              <span>Price Range</span>

              <strong>
                {product.minimumPrice === null
                  ? "No variants"
                  : product.minimumPrice ===
                      product.maximumPrice
                    ? currencyFormatter.format(
                        product.minimumPrice
                      )
                    : `${currencyFormatter.format(
                        product.minimumPrice
                      )} – ${currencyFormatter.format(
                        product.maximumPrice
                      )}`}
              </strong>
            </div>
          </article>

          <article className="admin-product-summary-card">
            <Layers size={19} />

            <div>
              <span>Variants</span>

              <strong>
                {product.variantCount}
              </strong>
            </div>
          </article>

          <article className="admin-product-summary-card">
            <Package size={19} />

            <div>
              <span>Total Stock</span>

              <strong>
                {product.totalStock}
              </strong>
            </div>
          </article>

          <article className="admin-product-summary-card">
            <Image size={19} />

            <div>
              <span>Images</span>

              <strong>
                {product.images?.length || 0}
              </strong>
            </div>
          </article>

          <article className="admin-product-summary-card">
            <ShieldCheck size={19} />

            <div>
              <span>Sale Availability</span>

              <strong>
                {isSaleEnabled
                  ? "Enabled"
                  : "Disabled"}
              </strong>
            </div>
          </article>
        </section>

        <section className="admin-product-information-grid">
          <div className="admin-product-information-item">
            <Hash size={18} />

            <div>
              <span>Product ID</span>

              <strong>
                #{product.productId}
              </strong>
            </div>
          </div>

          <div className="admin-product-information-item">
            <Store size={18} />

            <div>
              <span>Brand Store</span>

              <strong>
                {product.sellerName ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-product-information-item">
            <ShieldCheck size={18} />

            <div>
              <span>
                Store Approval Status
              </span>

              <AdminStatusBadge
                status={
                  product.storeApprovalStatus
                }
              />
            </div>
          </div>

          <div className="admin-product-information-item">
            <Store size={18} />

            <div>
              <span>Store Status</span>

              <AdminStatusBadge
                status={
                  product.storeStatus
                }
              />
            </div>
          </div>

          <div className="admin-product-information-item">
            <Tag size={18} />

            <div>
              <span>Category</span>

              <strong>
                {product.categoryName}
              </strong>
            </div>
          </div>

          <div className="admin-product-information-item">
            <CalendarDays size={18} />

            <div>
              <span>Created Date</span>

              <strong>
                {formattedCreatedDate}
              </strong>
            </div>
          </div>

          <div className="admin-product-information-item">
            <Package size={18} />

            <div>
              <span>Product Brand</span>

              <strong>
                {product.brand ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-product-information-item">
            <Hash size={18} />

            <div>
              <span>Model Number</span>

              <strong>
                {product.modelNumber ||
                  "Not provided"}
              </strong>
            </div>
          </div>

          <div className="admin-product-information-item">
            <ShieldCheck size={18} />

            <div>
              <span>
                Product Condition
              </span>

              <AdminStatusBadge
                status={
                  product.productCondition
                }
              />
            </div>
          </div>

          <div className="admin-product-information-item">
            <ShieldCheck size={18} />

            <div>
              <span>
                Store Operational
              </span>

              <strong>
                {storeCanOperate
                  ? "Yes"
                  : "No"}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-product-description-section">
          <h3>Product Description</h3>

          <p>
            {product.description ||
              "No product description provided."}
          </p>
        </section>

        {product.conditionDescription && (
          <section className="admin-product-description-section">
            <h3>
              Condition Description
            </h3>

            <p>
              {
                product.conditionDescription
              }
            </p>
          </section>
        )}

        {product.images?.length > 0 && (
          <section className="admin-product-gallery-section">
            <div className="admin-product-section-heading">
              <div>
                <Image size={18} />

                <h3>Product Images</h3>
              </div>

              <span>
                {product.images.length} images
              </span>
            </div>

            <div className="admin-product-image-gallery">
              {product.images.map(
                (imageRecord) => (
                  <article
                    className="admin-product-gallery-item"
                    key={
                      imageRecord.imageId
                    }
                  >
                    <img
                      src={
                        imageRecord.imageUrl
                      }
                      alt={
                        imageRecord.altText ||
                        product.productName
                      }
                    />

                    <div>
                      <span>
                        Display order:{" "}
                        {
                          imageRecord.displayOrder
                        }
                      </span>

                      {imageRecord.isPrimary && (
                        <strong>
                          Primary Image
                        </strong>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}

        <section className="admin-product-variants-section">
          <div className="admin-product-section-heading">
            <div>
              <Layers size={18} />

              <h3>Product Variants</h3>
            </div>

            <span>
              {product.variants?.length || 0}{" "}
              variants
            </span>
          </div>

          <p className="admin-product-empty-message">
            Product variants are shown for read-only marketplace oversight.
          </p>

          {product.variants?.length > 0 ? (
            <div className="admin-product-variants-table-wrapper">
              <table className="admin-product-variants-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Variant</th>
                    <th>Size</th>
                    <th>Color</th>
                    <th>Storage</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {product.variants.map(
                    (variant) => {
                      return (
                        <tr
                          key={
                            variant.variantId
                          }
                        >
                          <td>
                            {variant.sku}
                          </td>

                          <td>
                            {variant.variantName ||
                              "Default"}
                          </td>

                          <td>
                            {variant.size ||
                              "—"}
                          </td>

                          <td>
                            {variant.color ||
                              "—"}
                          </td>

                          <td>
                            {variant.storageCapacity ||
                              "—"}
                          </td>

                          <td>
                            {currencyFormatter.format(
                              variant.price
                            )}
                          </td>

                          <td>
                            {
                              variant.stockQuantity
                            }
                          </td>

                          <td>
                            <AdminStatusBadge
                              status={
                                variant.status
                              }
                            />
                          </td>

                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-product-empty-message">
              This product has no variants.
            </p>
          )}
        </section>

        {productInformationSections.length >
          0 && (
          <section className="admin-product-extended-section">
            <div className="admin-product-section-heading">
              <div>
                <Package size={18} />

                <h3>
                  Extended Product
                  Information
                </h3>
              </div>
            </div>

            <div className="admin-product-extended-grid">
              {productInformationSections.map(
                (section) => (
                  <article
                    key={section.label}
                  >
                    <strong>
                      {section.label}
                    </strong>

                    <StructuredProductInfo
                      value={section.value}
                    />
                  </article>
                )
              )}
            </div>
          </section>
        )}

        {onRequestAction && (
          <div className="admin-product-details-actions">
            {isDeleted ? (
              <button
                type="button"
                className="admin-product-action-activate"
                onClick={() =>
                  onRequestAction("restore", product)
                }
              >
                Restore Product
              </button>
            ) : (
              <>
                {isActive && (
                  <button
                    type="button"
                    className="admin-product-action-inactive"
                    onClick={() =>
                      onRequestAction("deactivate", product)
                    }
                  >
                    Deactivate Product
                  </button>
                )}

                {isInactive && (
                  <button
                    type="button"
                    className="admin-product-action-activate"
                    onClick={() =>
                      onRequestAction("activate", product)
                    }
                  >
                    Activate Product
                  </button>
                )}

                <button
                  type="button"
                  className="admin-product-action-delete"
                  onClick={() =>
                    onRequestAction("delete", product)
                  }
                >
                  Soft Delete Product
                </button>
              </>
            )}
          </div>
        )}

        {isDeleted && (
          <p className="admin-product-deleted-message">
            This product has DELETED status
            and is retained only for
            historical records.
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductDetailsModal;
