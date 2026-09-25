import { api } from "./apiClient.js";

const read = (value, ...keys) => {
  for (const key of keys) {
    if (value?.[key] !== undefined) {
      return value[key];
    }
  }
  return undefined;
};

const normalizeText = (value) =>
  value === undefined || value === null
    ? ""
    : String(value).trim();

const normalizeBoolean = (value) =>
  value === true ||
  value === 1 ||
  String(value ?? "").trim().toLowerCase() === "true";

const normalizeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const mapPromotionPlan = (dto = {}) => ({
  promotionPlanID: Number(read(dto, "promotionPlanID", "PromotionPlanID")) || 0,
  planName: normalizeText(read(dto, "planName", "PlanName")),
  planDescription: normalizeText(read(dto, "planDescription", "PlanDescription")),
  planType: normalizeText(read(dto, "planType", "PlanType")).toUpperCase(),
  isActive: normalizeBoolean(read(dto, "isActive", "IsActive")),
  config: normalizeText(read(dto, "config", "Config")),
  createdDate: normalizeDate(read(dto, "createdDate", "CreatedDate")),
  updatedDate: normalizeDate(read(dto, "updatedDate", "UpdatedDate")),
});

export const mapPromotionCampaign = (dto = {}) => ({
  campaignID: Number(read(dto, "campaignID", "CampaignID")) || 0,
  promotionPlanID: Number(read(dto, "promotionPlanID", "PromotionPlanID")) || 0,
  promotionPlanName: normalizeText(
    read(dto, "promotionPlanName", "PromotionPlanName"),
  ),
  campaignName: normalizeText(read(dto, "campaignName", "CampaignName")),
  campaignDescription: normalizeText(
    read(dto, "campaignDescription", "CampaignDescription"),
  ),
  bannerImageUrl: normalizeText(read(dto, "bannerImageUrl", "BannerImageUrl")),
  hasBannerImage: normalizeBoolean(
    read(dto, "hasBannerImage", "HasBannerImage"),
  ),
  bannerContentType: normalizeText(
    read(dto, "bannerContentType", "BannerContentType"),
  ),
  bannerAltText: normalizeText(read(dto, "bannerAltText", "BannerAltText")),
  linkURL: normalizeText(read(dto, "linkURL", "LinkURL")),
  displayOrder: Number(read(dto, "displayOrder", "DisplayOrder")) || 0,
  startDate: normalizeDate(read(dto, "startDate", "StartDate")),
  endDate: normalizeDate(read(dto, "endDate", "EndDate")),
  isActive: normalizeBoolean(read(dto, "isActive", "IsActive")),
  status: normalizeText(read(dto, "status", "Status")).toUpperCase(),
  createdDate: normalizeDate(read(dto, "createdDate", "CreatedDate")),
  updatedDate: normalizeDate(read(dto, "updatedDate", "UpdatedDate")),
});

const mapList = (value, mapper) =>
  Array.isArray(value) ? value.map(mapper) : [];

const toIso = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

export const createCampaignFormData = (values) => {
  const formData = new FormData();

  formData.append("PromotionPlanID", String(values.promotionPlanID || ""));
  formData.append("CampaignName", normalizeText(values.campaignName));
  formData.append(
    "CampaignDescription",
    normalizeText(values.campaignDescription),
  );
  formData.append("BannerAltText", normalizeText(values.bannerAltText));
  formData.append("LinkURL", normalizeText(values.linkURL));
  formData.append("DisplayOrder", String(Math.max(0, Number(values.displayOrder) || 0)));
  formData.append("StartDate", toIso(values.startDate));
  formData.append("EndDate", toIso(values.endDate));
  formData.append("IsActive", "false");

  if (
    values.bannerImageFile &&
    typeof values.bannerImageFile === "object" &&
    typeof values.bannerImageFile.name === "string"
  ) {
    formData.append("BannerImageFile", values.bannerImageFile);
  }

  return formData;
};

export const getPromotionPlans = async () =>
  mapList(await api.get("/api/admin/promotions/plans"), mapPromotionPlan);

export const getPromotionPlan = async (planID) =>
  mapPromotionPlan(await api.get(`/api/admin/promotions/plans/${planID}`));

export const createPromotionPlan = async (values) =>
  mapPromotionPlan(
    await api.post("/api/admin/promotions/plans", {
      planName: normalizeText(values.planName),
      planDescription: normalizeText(values.planDescription) || null,
      planType: normalizeText(values.planType || "BANNER").toUpperCase(),
      isActive: Boolean(values.isActive),
      config: normalizeText(values.config) || null,
    }),
  );

export const updatePromotionPlan = async (planID, values) =>
  mapPromotionPlan(
    await api.put(`/api/admin/promotions/plans/${planID}`, {
      planName: normalizeText(values.planName),
      planDescription: normalizeText(values.planDescription) || null,
      planType: normalizeText(values.planType || "BANNER").toUpperCase(),
      isActive: Boolean(values.isActive),
      config: normalizeText(values.config) || null,
    }),
  );

export const deletePromotionPlan = async (planID) =>
  api.delete(`/api/admin/promotions/plans/${planID}`);

export const getPromotionCampaigns = async () =>
  mapList(
    await api.get("/api/admin/promotions/campaigns", {
      query: { includeInactive: true },
    }),
    mapPromotionCampaign,
  );

export const getPromotionCampaign = async (campaignID) =>
  mapPromotionCampaign(
    await api.get(`/api/admin/promotions/campaigns/${campaignID}`),
  );

export const createPromotionCampaign = async (values) =>
  mapPromotionCampaign(
    await api.post(
      "/api/admin/promotions/campaigns",
      createCampaignFormData(values),
    ),
  );

export const updatePromotionCampaign = async (campaignID, values) =>
  mapPromotionCampaign(
    await api.put(
      `/api/admin/promotions/campaigns/${campaignID}`,
      createCampaignFormData(values),
    ),
  );

export const deletePromotionCampaign = async (campaignID) =>
  api.delete(`/api/admin/promotions/campaigns/${campaignID}`);

export const updatePromotionCampaignStatus = async (campaignID, status) =>
  api.patch(
    `/api/admin/promotions/campaigns/${campaignID}/status`,
    normalizeText(status).toUpperCase(),
  );

export const getPromotionImageUrl = (campaign) => {
  if (!campaign?.bannerImageUrl) return "";
  const version = campaign.updatedDate?.getTime?.() || campaign.createdDate?.getTime?.() || 0;
  const separator = campaign.bannerImageUrl.includes("?") ? "&" : "?";
  return `${campaign.bannerImageUrl}${separator}v=${version}`;
};

const mapPublicDestinationStore = (dto = {}) => ({
  storeId: Number(read(dto, "storeId", "StoreId", "StoreID")) || 0,
  storeName: normalizeText(read(dto, "storeName", "StoreName")),
  storeDescription: normalizeText(read(dto, "storeDescription", "StoreDescription")),
  storeLogoUrl: normalizeText(read(dto, "storeLogoUrl", "StoreLogoUrl", "StoreLogoURL")),
  visibleProductCount: Number(read(dto, "visibleProductCount", "VisibleProductCount")) || 0,
});

const mapPublicDestinationCategory = (dto = {}) => ({
  categoryId: Number(read(dto, "categoryId", "CategoryId", "CategoryID")) || 0,
  categoryName: normalizeText(read(dto, "categoryName", "CategoryName")),
  description: normalizeText(read(dto, "description", "Description")),
});

const mapPublicDestinationProduct = (dto = {}) => {
  const store = read(dto, "store", "Store") || {};

  return {
    productId: Number(read(dto, "productId", "ProductId", "ProductID")) || 0,
    productName: normalizeText(read(dto, "productName", "ProductName")),
    storeId:
      Number(
        read(dto, "storeId", "StoreId", "StoreID") ??
          read(store, "storeId", "StoreId", "StoreID"),
      ) || 0,
    storeName: normalizeText(
      read(dto, "storeName", "StoreName") ??
        read(store, "storeName", "StoreName"),
    ),
    status: normalizeText(read(dto, "status", "Status")).toUpperCase(),
  };
};

export const getPromotionDestinationStores = async () => {
  const stores = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await api.get("/api/stores", {
      query: { page, pageSize: 100 },
    });

    const items = Array.isArray(response)
      ? response
      : Array.isArray(response?.items)
        ? response.items
        : [];

    stores.push(...items.map(mapPublicDestinationStore));

    if (Array.isArray(response)) {
      break;
    }

    totalPages = Math.max(1, Number(response?.totalPages) || 1);
    page += 1;
  } while (page <= totalPages && page <= 20);

  return stores
    .filter((store) => store.storeId && store.storeName)
    .sort((first, second) => first.storeName.localeCompare(second.storeName));
};

export const getPromotionDestinationCategories = async () => {
  const response = await api.get("/api/categories");
  const items = Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : [];

  return items
    .map(mapPublicDestinationCategory)
    .filter((category) => category.categoryId && category.categoryName)
    .sort((first, second) => first.categoryName.localeCompare(second.categoryName));
};

export const searchPromotionDestinationProducts = async ({
  search = "",
  storeId = "",
  pageSize = 40,
} = {}) => {
  const response = await api.get("/api/products", {
    query: {
      search: normalizeText(search),
      storeId: Number(storeId) || undefined,
      page: 1,
      pageSize: Math.min(Math.max(Number(pageSize) || 40, 1), 100),
      sort: "name_asc",
    },
  });

  const items = Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : [];

  return items
    .map(mapPublicDestinationProduct)
    .filter((product) => product.productId && product.productName);
};

export const getPromotionDestinationProduct = async (productId) => {
  const numericProductId = Number(productId);
  if (!Number.isInteger(numericProductId) || numericProductId < 1) {
    return null;
  }

  try {
    return mapPublicDestinationProduct(
      await api.get(`/api/products/${numericProductId}`),
    );
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
};
