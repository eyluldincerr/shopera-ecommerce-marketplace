import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  ExternalLink,
  ImagePlus,
  PackageSearch,
  Save,
  Search,
  Send,
  Store,
  Tag,
} from "lucide-react";

import {
  getPromotionDestinationCategories,
  getPromotionDestinationProduct,
  getPromotionDestinationStores,
  getPromotionImageUrl,
  searchPromotionDestinationProducts,
} from "../../api/adminPromotionService.js";
import {
  HERO_DURATION_OPTIONS,
  PROMOTION_DESTINATION_TYPES,
  buildPromotionDestination,
  createRelativeHeroWindow,
  formatHeroClock,
  getClosestHeroDurationHours,
  inferPromotionDestination,
} from "../../utils/promotionDestination.js";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const validateLink = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  if (normalized.startsWith("/") && !normalized.startsWith("//")) {
    return "";
  }

  try {
    const url = new URL(normalized);
    return ["http:", "https:"].includes(url.protocol)
      ? ""
      : "Use a Shopera path beginning with / or an http/https URL.";
  } catch {
    return "Use a Shopera path beginning with / or an http/https URL.";
  }
};

const destinationTypeOptions = [
  {
    value: PROMOTION_DESTINATION_TYPES.STORE,
    label: "Store",
    description: "Send customers to a live Shopera storefront.",
  },
  {
    value: PROMOTION_DESTINATION_TYPES.CATEGORY,
    label: "Category",
    description: "Open a real Shopera category.",
  },
  {
    value: PROMOTION_DESTINATION_TYPES.PRODUCT,
    label: "Product",
    description: "Promote one publicly available product.",
  },
  {
    value: PROMOTION_DESTINATION_TYPES.SEARCH,
    label: "Search",
    description: "Open Shopera search with a keyword already filled in.",
  },
  {
    value: PROMOTION_DESTINATION_TYPES.NONE,
    label: "No link",
    description: "Use the banner only as an announcement.",
  },
  {
    value: PROMOTION_DESTINATION_TYPES.CUSTOM,
    label: "Custom URL",
    description: "Advanced: use another safe Shopera route or website.",
  },
];


function PromotionForm({
  initialValues = null,
  plans = [],
  onSubmit,
  submitting = false,
  currentStatus = "DRAFT",
}) {
  const [submitIntent, setSubmitIntent] = useState("draft");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [clockNow, setClockNow] = useState(() => new Date());
  const [durationSelection, setDurationSelection] = useState("2");
  const [formData, setFormData] = useState({
    promotionPlanID: "",
    campaignName: "",
    campaignDescription: "",
    bannerAltText: "",
    displayOrder: 0,
    bannerImageFile: null,
  });
  const [destination, setDestination] = useState(() =>
    inferPromotionDestination(initialValues?.linkURL),
  );
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [destinationLoading, setDestinationLoading] = useState(true);
  const [destinationLoadError, setDestinationLoadError] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const bannerPlans = useMemo(
    () => plans.filter((plan) => plan.planType === "BANNER"),
    [plans],
  );
  const activeBannerPlans = useMemo(
    () => bannerPlans.filter((plan) => plan.isActive),
    [bannerPlans],
  );
  const defaultBannerPlan = useMemo(
    () =>
      activeBannerPlans.find(
        (plan) => String(plan.planName || "").trim().toLowerCase() === "homepage hero banner",
      ) || activeBannerPlans[0] || null,
    [activeBannerPlans],
  );
  const secondaryActionLabel = initialValues ? "Save changes" : "Save draft";
  const inferredDurationHours = useMemo(
    () =>
      initialValues
        ? getClosestHeroDurationHours(initialValues.startDate, initialValues.endDate)
        : 2,
    [initialValues],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!initialValues) {
      setFormData((current) => ({
        ...current,
        promotionPlanID: defaultBannerPlan
          ? String(defaultBannerPlan.promotionPlanID)
          : "",
      }));
      setDestination(inferPromotionDestination(""));
      setDurationSelection("2");
      return;
    }

    setFormData({
      promotionPlanID: String(initialValues.promotionPlanID || ""),
      campaignName: initialValues.campaignName || "",
      campaignDescription: initialValues.campaignDescription || "",
      bannerAltText: initialValues.bannerAltText || "",
      displayOrder: initialValues.displayOrder ?? 0,
      bannerImageFile: null,
    });
    setDestination(inferPromotionDestination(initialValues.linkURL));
    setDurationSelection("keep");
  }, [initialValues, defaultBannerPlan]);

  useEffect(() => {
    let isMounted = true;

    const loadDestinations = async () => {
      try {
        setDestinationLoading(true);
        setDestinationLoadError("");
        const [loadedStores, loadedCategories] = await Promise.all([
          getPromotionDestinationStores(),
          getPromotionDestinationCategories(),
        ]);

        if (!isMounted) return;
        setStores(loadedStores);
        setCategories(loadedCategories);
      } catch (error) {
        console.error("Promotion destinations could not be loaded:", error);
        if (isMounted) {
          setDestinationLoadError(
            error.message || "Shopera destinations could not be loaded.",
          );
        }
      } finally {
        if (isMounted) setDestinationLoading(false);
      }
    };

    loadDestinations();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (destination.type !== PROMOTION_DESTINATION_TYPES.PRODUCT) {
      return undefined;
    }

    let isCancelled = false;
    const timerId = window.setTimeout(async () => {
      try {
        setProductLoading(true);
        const [matchingProducts, currentProduct] = await Promise.all([
          searchPromotionDestinationProducts({
            search: productSearch,
            storeId: destination.productStoreId,
          }),
          destination.productId
            ? getPromotionDestinationProduct(destination.productId)
            : Promise.resolve(null),
        ]);

        if (isCancelled) return;

        const byId = new Map(
          matchingProducts.map((product) => [product.productId, product]),
        );
        if (currentProduct?.productId) {
          byId.set(currentProduct.productId, currentProduct);
        }

        setProducts(
          [...byId.values()].sort((first, second) =>
            first.productName.localeCompare(second.productName),
          ),
        );
      } catch (error) {
        if (!isCancelled) {
          console.error("Promotion products could not be loaded:", error);
          setProducts([]);
        }
      } finally {
        if (!isCancelled) setProductLoading(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timerId);
    };
  }, [destination.productId, destination.productStoreId, destination.type, productSearch]);

  useEffect(() => {
    if (!formData.bannerImageFile) {
      setPreviewUrl(initialValues ? getPromotionImageUrl(initialValues) : "");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(formData.bannerImageFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [formData.bannerImageFile, initialValues]);

  const selectedStore = useMemo(
    () => stores.find((store) => String(store.storeId) === String(destination.storeId)),
    [destination.storeId, stores],
  );
  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => String(category.categoryId) === String(destination.categoryId),
      ),
    [categories, destination.categoryId],
  );
  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) => String(product.productId) === String(destination.productId),
      ),
    [destination.productId, products],
  );

  const resolvedLink = useMemo(
    () => buildPromotionDestination(destination),
    [destination],
  );

  const destinationSummary = useMemo(() => {
    switch (destination.type) {
      case PROMOTION_DESTINATION_TYPES.STORE:
        return selectedStore
          ? `${selectedStore.storeName} · Store`
          : "Choose a live store";
      case PROMOTION_DESTINATION_TYPES.CATEGORY:
        return selectedCategory
          ? `${selectedCategory.categoryName} · Category`
          : "Choose a category";
      case PROMOTION_DESTINATION_TYPES.PRODUCT:
        return selectedProduct
          ? `${selectedProduct.productName} · ${selectedProduct.storeName || "Product"}`
          : "Choose a product";
      case PROMOTION_DESTINATION_TYPES.SEARCH:
        return destination.searchTerm.trim()
          ? `Search: ${destination.searchTerm.trim()}`
          : "Enter a search phrase";
      case PROMOTION_DESTINATION_TYPES.CUSTOM:
        return resolvedLink || "Enter a custom URL";
      case PROMOTION_DESTINATION_TYPES.NONE:
      default:
        return "No click action";
    }
  }, [destination, resolvedLink, selectedCategory, selectedProduct, selectedStore]);

  const previewDurationHours =
    durationSelection === "keep"
      ? inferredDurationHours
      : Number(durationSelection) || 2;
  const relativeWindow = useMemo(
    () => createRelativeHeroWindow(previewDurationHours, clockNow),
    [clockNow, previewDurationHours],
  );

  const updateField = (event) => {
    const { name, value } = event.target;
    setErrorMessage("");
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateDestinationField = (name, value) => {
    setErrorMessage("");
    setDestination((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateDestinationType = (event) => {
    setErrorMessage("");
    setDestination((current) => ({
      ...current,
      type: event.target.value,
    }));
  };

  const updateImage = (event) => {
    setErrorMessage("");
    const file = event.target.files?.[0] || null;

    if (!file) {
      setFormData((current) => ({
        ...current,
        bannerImageFile: null,
      }));
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      event.target.value = "";
      setErrorMessage("Banner image must be a JPG, PNG, or WebP file.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      event.target.value = "";
      setErrorMessage("Banner image must be 8 MB or smaller.");
      return;
    }

    setFormData((current) => ({
      ...current,
      bannerImageFile: file,
    }));
  };

  const validate = (intent) => {
    if (!Number(formData.promotionPlanID)) {
      return "The homepage hero system is not configured yet. Ask a developer to create one active BANNER plan.";
    }

    const selectedPlan = bannerPlans.find(
      (plan) => String(plan.promotionPlanID) === String(formData.promotionPlanID),
    );
    if (intent === "publish" && selectedPlan && !selectedPlan.isActive) {
      return "The homepage hero system plan is inactive. Activate it before publishing.";
    }

    if (!formData.campaignName.trim()) {
      return "Hero title is required.";
    }

    if (formData.campaignName.trim().length > 200) {
      return "Hero title must be 200 characters or fewer.";
    }

    if (formData.campaignDescription.trim().length > 1000) {
      return "Description must be 1000 characters or fewer.";
    }

    if (formData.bannerAltText.trim().length > 255) {
      return "Alternative text must be 255 characters or fewer.";
    }

    if (destination.type === PROMOTION_DESTINATION_TYPES.STORE && !selectedStore) {
      return destinationLoading
        ? "Wait for Shopera stores to finish loading."
        : "Choose a live Shopera store.";
    }

    if (
      destination.type === PROMOTION_DESTINATION_TYPES.CATEGORY &&
      !selectedCategory
    ) {
      return destinationLoading
        ? "Wait for Shopera categories to finish loading."
        : "Choose a Shopera category.";
    }

    if (
      destination.type === PROMOTION_DESTINATION_TYPES.PRODUCT &&
      !selectedProduct
    ) {
      return productLoading
        ? "Wait for products to finish loading."
        : "Choose a publicly available product.";
    }

    if (
      destination.type === PROMOTION_DESTINATION_TYPES.SEARCH &&
      !destination.searchTerm.trim()
    ) {
      return "Enter a search phrase for this hero destination.";
    }

    if (destination.type === PROMOTION_DESTINATION_TYPES.CUSTOM) {
      const linkError = validateLink(destination.customUrl);
      if (linkError) return linkError;
    }

    if (
      durationSelection !== "keep" &&
      !HERO_DURATION_OPTIONS.includes(Number(durationSelection))
    ) {
      return "Choose a valid banner duration.";
    }

    const hasExistingImage = Boolean(initialValues?.hasBannerImage);
    if (intent === "publish" && !hasExistingImage && !formData.bannerImageFile) {
      return "Upload a banner image before publishing.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const requestedIntent =
      event.nativeEvent?.submitter?.value === "publish" ? "publish" : "draft";
    setSubmitIntent(requestedIntent);
    const validationError = validate(requestedIntent);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const shouldRestartTiming =
      !initialValues ||
      durationSelection !== "keep" ||
      (requestedIntent === "publish" && String(currentStatus).toUpperCase() !== "ACTIVE");

    let startDate = initialValues?.startDate || null;
    let endDate = initialValues?.endDate || null;

    if (shouldRestartTiming) {
      const requestedDuration =
        durationSelection === "keep"
          ? inferredDurationHours
          : Number(durationSelection);
      const window = createRelativeHeroWindow(requestedDuration, new Date());
      startDate = window.startDate;
      endDate = window.endDate;
    }

    await onSubmit(
      {
        ...formData,
        linkURL: resolvedLink,
        startDate,
        endDate,
        promotionPlanID: Number(formData.promotionPlanID),
        displayOrder: Math.max(0, Number(formData.displayOrder) || 0),
      },
      { publish: requestedIntent === "publish" },
    );
  };

  return (
    <form className="admin-promotion-form" onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <div className="admin-page-notice admin-page-notice-error" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="admin-promotion-form-grid">
        <section className="admin-promotion-form-card">
          <div className="admin-promotion-form-card-heading">
            <div>
              <h2>Hero content</h2>
              <p>What customers will see on the Shopera home page.</p>
            </div>
            <span className="admin-promotion-form-status">{currentStatus}</span>
          </div>

          <input
            type="hidden"
            name="promotionPlanID"
            value={formData.promotionPlanID}
            readOnly
          />

          <div className="admin-promotion-field">
            <label htmlFor="campaignName">Hero title</label>
            <input
              id="campaignName"
              name="campaignName"
              type="text"
              maxLength={200}
              value={formData.campaignName}
              onChange={updateField}
              placeholder="Summer technology deals"
              disabled={submitting}
              required
            />
            <small>{formData.campaignName.length}/200 characters</small>
          </div>

          <div className="admin-promotion-field">
            <label htmlFor="campaignDescription">Description</label>
            <textarea
              id="campaignDescription"
              name="campaignDescription"
              rows={4}
              maxLength={1000}
              value={formData.campaignDescription}
              onChange={updateField}
              placeholder="A short supporting message for this promotion."
              disabled={submitting}
            />
          </div>

          <div className="admin-promotion-field">
            <label htmlFor="bannerAltText">Image alternative text</label>
            <input
              id="bannerAltText"
              name="bannerAltText"
              type="text"
              maxLength={255}
              value={formData.bannerAltText}
              onChange={updateField}
              placeholder="Promotional banner showing summer electronics offers"
              disabled={submitting}
            />
            <small>Describe the image for customers using screen readers.</small>
          </div>
        </section>

        <section className="admin-promotion-form-card">
          <div className="admin-promotion-form-card-heading">
            <div>
              <h2>Banner image</h2>
              <p>Recommended size: 1600 × 520 px. JPG, PNG or WebP, up to 8 MB.</p>
            </div>
          </div>

          <label className="admin-promotion-image-picker" htmlFor="bannerImageFile">
            <input
              id="bannerImageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={updateImage}
              disabled={submitting}
            />
            <ImagePlus size={22} aria-hidden="true" />
            <span>{formData.bannerImageFile ? "Choose a different image" : "Choose banner image"}</span>
          </label>

          <div className="admin-promotion-preview" aria-label="Homepage hero preview">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={formData.bannerAltText || formData.campaignName || "Hero preview"}
              />
            ) : (
              <div className="admin-promotion-preview-empty">
                <ImagePlus size={34} aria-hidden="true" />
                <span>Your banner preview will appear here</span>
              </div>
            )}

            <div className="admin-promotion-preview-overlay">
              <span>Shopera promotion</span>
              <strong>{formData.campaignName || "Your hero title"}</strong>
              <p>{formData.campaignDescription || "Your promotional message will appear here."}</p>
              {resolvedLink && <em>Shop now</em>}
            </div>
          </div>
        </section>

        <section className="admin-promotion-form-card admin-promotion-destination-card">
          <div className="admin-promotion-form-card-heading">
            <div>
              <h2>Click destination</h2>
              <p>Choose where the Buyer goes. Shopera builds the route for you.</p>
            </div>
            <ExternalLink size={19} aria-hidden="true" />
          </div>

          {destinationLoadError && (
            <div className="admin-promotion-inline-warning" role="status">
              {destinationLoadError} Custom URL and no-link options still work.
            </div>
          )}

          <div className="admin-promotion-field">
            <label htmlFor="destinationType">When clicked, go to</label>
            <select
              id="destinationType"
              value={destination.type}
              onChange={updateDestinationType}
              disabled={submitting}
            >
              {destinationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>
              {destinationTypeOptions.find((option) => option.value === destination.type)?.description}
            </small>
          </div>

          {destination.type === PROMOTION_DESTINATION_TYPES.STORE && (
            <div className="admin-promotion-field">
              <label htmlFor="destinationStore">
                <Store size={15} aria-hidden="true" /> Live store
              </label>
              <select
                id="destinationStore"
                value={destination.storeId}
                onChange={(event) => updateDestinationField("storeId", event.target.value)}
                disabled={submitting || destinationLoading}
              >
                <option value="">
                  {destinationLoading ? "Loading live stores..." : "Choose a store"}
                </option>
                {stores.map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.storeName} · {store.visibleProductCount} products
                  </option>
                ))}
              </select>
              <small>{stores.length} publicly available Shopera stores.</small>
            </div>
          )}

          {destination.type === PROMOTION_DESTINATION_TYPES.CATEGORY && (
            <div className="admin-promotion-field">
              <label htmlFor="destinationCategory">
                <Tag size={15} aria-hidden="true" /> Category
              </label>
              <select
                id="destinationCategory"
                value={destination.categoryId}
                onChange={(event) =>
                  updateDestinationField("categoryId", event.target.value)
                }
                disabled={submitting || destinationLoading}
              >
                <option value="">
                  {destinationLoading ? "Loading categories..." : "Choose a category"}
                </option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {destination.type === PROMOTION_DESTINATION_TYPES.PRODUCT && (
            <div className="admin-promotion-product-destination">
              <div className="admin-promotion-field">
                <label htmlFor="destinationProductStore">Store filter</label>
                <select
                  id="destinationProductStore"
                  value={destination.productStoreId}
                  onChange={(event) => {
                    updateDestinationField("productStoreId", event.target.value);
                    updateDestinationField("productId", "");
                  }}
                  disabled={submitting || destinationLoading}
                >
                  <option value="">All live stores</option>
                  {stores.map((store) => (
                    <option key={store.storeId} value={store.storeId}>
                      {store.storeName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-promotion-field">
                <label htmlFor="destinationProductSearch">
                  <Search size={15} aria-hidden="true" /> Find product
                </label>
                <input
                  id="destinationProductSearch"
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search product name, brand or store"
                  disabled={submitting}
                />
              </div>

              <div className="admin-promotion-field">
                <label htmlFor="destinationProduct">
                  <PackageSearch size={15} aria-hidden="true" /> Product
                </label>
                <select
                  id="destinationProduct"
                  value={destination.productId}
                  onChange={(event) =>
                    updateDestinationField("productId", event.target.value)
                  }
                  disabled={submitting || productLoading}
                >
                  <option value="">
                    {productLoading ? "Loading products..." : "Choose a product"}
                  </option>
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.productName}{product.storeName ? ` · ${product.storeName}` : ""}
                    </option>
                  ))}
                </select>
                <small>Only products visible to Buyers are returned.</small>
              </div>
            </div>
          )}

          {destination.type === PROMOTION_DESTINATION_TYPES.SEARCH && (
            <div className="admin-promotion-field">
              <label htmlFor="destinationSearch">Search phrase</label>
              <input
                id="destinationSearch"
                type="search"
                maxLength={120}
                value={destination.searchTerm}
                onChange={(event) =>
                  updateDestinationField("searchTerm", event.target.value)
                }
                placeholder="gaming laptop"
                disabled={submitting}
              />
            </div>
          )}

          {destination.type === PROMOTION_DESTINATION_TYPES.CUSTOM && (
            <div className="admin-promotion-field">
              <label htmlFor="destinationCustom">Custom URL</label>
              <div className="admin-promotion-link-input">
                <ExternalLink size={17} aria-hidden="true" />
                <input
                  id="destinationCustom"
                  type="text"
                  maxLength={500}
                  value={destination.customUrl}
                  onChange={(event) =>
                    updateDestinationField("customUrl", event.target.value)
                  }
                  placeholder="/search?sort=newest or https://example.com"
                  disabled={submitting}
                />
              </div>
              <small>Use a Shopera route beginning with / or a safe http/https URL.</small>
            </div>
          )}

          <div className="admin-promotion-destination-preview" aria-live="polite">
            <div>
              <span>Buyer destination</span>
              <strong>{destinationSummary}</strong>
            </div>
            <code>{resolvedLink || "No destination"}</code>
          </div>
        </section>

        <section className="admin-promotion-form-card admin-promotion-schedule-card">
          <div className="admin-promotion-form-card-heading">
            <div>
              <h2>Run time & priority</h2>
              <p>Choose how many hours this banner should stay live.</p>
            </div>
            <Clock3 size={19} aria-hidden="true" />
          </div>

          <div className="admin-promotion-duration-panel">
            <div className="admin-promotion-field">
              <label htmlFor="durationHours">Banner duration</label>
              <select
                id="durationHours"
                value={durationSelection}
                onChange={(event) => {
                  setErrorMessage("");
                  setDurationSelection(event.target.value);
                }}
                disabled={submitting}
              >
                {initialValues && <option value="keep">Keep current timing</option>}
                {HERO_DURATION_OPTIONS.map((hours) => (
                  <option key={hours} value={hours}>
                    {hours} {hours === 1 ? "hour" : "hours"}
                  </option>
                ))}
              </select>
              <small>
                {durationSelection === "keep"
                  ? currentStatus === "ACTIVE"
                    ? "The live banner keeps its current end time."
                    : `Publishing restarts it for about ${inferredDurationHours} ${inferredDurationHours === 1 ? "hour" : "hours"}.`
                  : "The timer starts from the moment this banner is saved or published."}
              </small>
            </div>

            <div className="admin-promotion-duration-summary" aria-live="polite">
              <Clock3 size={18} aria-hidden="true" />
              <div>
                <span>{durationSelection === "keep" ? "Current run" : "Starts immediately"}</span>
                <strong>
                  {durationSelection === "keep" && initialValues?.endDate
                    ? `Until ${formatHeroClock(initialValues.endDate)}`
                    : `${formatHeroClock(relativeWindow.startDate)} → ${formatHeroClock(relativeWindow.endDate)}`}
                </strong>
              </div>
            </div>
          </div>

          <div className="admin-promotion-field admin-promotion-order-field">
            <label htmlFor="displayOrder">Display order</label>
            <input
              id="displayOrder"
              name="displayOrder"
              type="number"
              min="0"
              step="1"
              value={formData.displayOrder}
              onChange={updateField}
              disabled={submitting}
            />
            <small>Lower numbers appear first when several hero banners are live.</small>
          </div>
        </section>
      </div>

      <div className="admin-promotion-form-actions">
        <button
          type="submit"
          name="intent"
          value="draft"
          className="admin-promotion-secondary-button"
          onClick={() => setSubmitIntent("draft")}
          disabled={submitting}
        >
          <Save size={17} aria-hidden="true" />
          {submitting && submitIntent === "draft" ? "Saving..." : secondaryActionLabel}
        </button>

        <button
          type="submit"
          name="intent"
          value="publish"
          className="admin-promotion-primary-button"
          onClick={() => setSubmitIntent("publish")}
          disabled={submitting}
        >
          <Send size={17} aria-hidden="true" />
          {submitting && submitIntent === "publish" ? "Publishing..." : "Save & publish"}
        </button>
      </div>
    </form>
  );
}

export default PromotionForm;
