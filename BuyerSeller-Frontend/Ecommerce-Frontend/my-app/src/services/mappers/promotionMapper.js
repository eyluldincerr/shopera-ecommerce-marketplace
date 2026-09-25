const read = (dto, ...keys) => {
  for (const key of keys) {
    if (dto?.[key] !== undefined) return dto[key];
  }
  return undefined;
};

const text = (value) => (value === undefined || value === null ? "" : String(value).trim());
const nullableText = (value) => {
  const normalized = text(value);
  return normalized || null;
};
const boolean = (value) => value === true || value === 1 || String(value).trim().toLowerCase() === "true";
const date = (value) => (value ? new Date(value) : null);

export const mapPromotionPlanDto = (dto = {}) => ({
  promotionPlanID: read(dto, "promotionPlanID", "PromotionPlanID"),
  planName: text(read(dto, "planName", "PlanName")),
  planDescription: nullableText(read(dto, "planDescription", "PlanDescription")),
  planType: text(read(dto, "planType", "PlanType")),
  isActive: boolean(read(dto, "isActive", "IsActive")),
  config: nullableText(read(dto, "config", "Config")),
  createdDate: date(read(dto, "createdDate", "CreatedDate")),
  updatedDate: date(read(dto, "updatedDate", "UpdatedDate")),
});

export const mapPromotionPlanListDto = (dto) => {
  const values = Array.isArray(dto) ? dto : read(dto, "items", "Items", "plans", "Plans");
  return Array.isArray(values) ? values.map(mapPromotionPlanDto) : [];
};

export const mapPromotionCampaignDto = (dto = {}) => ({
  campaignID: read(dto, "campaignID", "CampaignID"),
  promotionPlanID: read(dto, "promotionPlanID", "PromotionPlanID"),
  promotionPlanName: text(read(dto, "promotionPlanName", "PromotionPlanName")),
  campaignName: text(read(dto, "campaignName", "CampaignName")),
  campaignDescription: nullableText(read(dto, "campaignDescription", "CampaignDescription")),
  bannerImageUrl: nullableText(read(dto, "bannerImageUrl", "BannerImageUrl")),
  bannerContentType: nullableText(read(dto, "bannerContentType", "BannerContentType")),
  bannerAltText: nullableText(read(dto, "bannerAltText", "BannerAltText")),
  linkURL: nullableText(read(dto, "linkURL", "LinkURL")),
  displayOrder: read(dto, "displayOrder", "DisplayOrder") ?? 0,
  startDate: date(read(dto, "startDate", "StartDate")),
  endDate: date(read(dto, "endDate", "EndDate")),
  isActive: boolean(read(dto, "isActive", "IsActive")),
  status: text(read(dto, "status", "Status")),
  createdDate: date(read(dto, "createdDate", "CreatedDate")),
  updatedDate: date(read(dto, "updatedDate", "UpdatedDate")),
});

export const mapPromotionCampaignListDto = (dto) => {
  const values = Array.isArray(dto) ? dto : read(dto, "items", "Items", "campaigns", "Campaigns");
  return Array.isArray(values) ? values.map(mapPromotionCampaignDto) : [];
};

export const mapPromotionCampaignWriteRequest = (campaign) => {
  const formData = new FormData();
  if (campaign.promotionPlanID) formData.append("PromotionPlanID", String(campaign.promotionPlanID));
  if (campaign.campaignName) formData.append("CampaignName", campaign.campaignName);
  if (campaign.campaignDescription) formData.append("CampaignDescription", campaign.campaignDescription);
  if (campaign.bannerAltText) formData.append("BannerAltText", campaign.bannerAltText);
  if (campaign.linkURL) formData.append("LinkURL", campaign.linkURL);
  if (campaign.displayOrder !== undefined) formData.append("DisplayOrder", String(campaign.displayOrder));
  if (campaign.startDate) formData.append("StartDate", campaign.startDate.toISOString());
  if (campaign.endDate) formData.append("EndDate", campaign.endDate.toISOString());
  if (campaign.isActive !== undefined) formData.append("IsActive", String(campaign.isActive));
  if (campaign.bannerImageFile) formData.append("BannerImageFile", campaign.bannerImageFile);
  return formData;
};