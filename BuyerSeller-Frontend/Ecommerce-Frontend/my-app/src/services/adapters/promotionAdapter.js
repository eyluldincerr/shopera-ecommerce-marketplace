import { PROMOTION_ENDPOINTS } from "../../config/apiEndpoints.js";
import axiosClient from "../axiosClient.js";
import { requireEndpoint } from "../backendErrors.js";
import {
  mapPromotionCampaignDto,
  mapPromotionCampaignListDto,
  mapPromotionPlanDto,
  mapPromotionPlanListDto,
} from "../mappers/promotionMapper.js";

const unwrap = (response) => response?.data ?? response;

const buildUrl = (template, params) => {
  let url = template;
  for (const [key, value] of Object.entries(params || {})) {
    url = url.replace(`:${key}`, encodeURIComponent(String(value)));
  }
  return url;
};

export const promotionAdapter = {
  // ---- Public ----
  async getActiveCampaigns(options = {}) {
    const response = await axiosClient.get(
      requireEndpoint(PROMOTION_ENDPOINTS.activeCampaigns, "promotion.active"),
      { signal: options.signal }
    );
    return mapPromotionCampaignListDto(unwrap(response));
  },

  // ---- Admin: Plans ----
  async getPlans(options = {}) {
    const response = await axiosClient.get(
      requireEndpoint(PROMOTION_ENDPOINTS.adminPlans, "promotion.plans"),
      { signal: options.signal }
    );
    return mapPromotionPlanListDto(unwrap(response));
  },

  async getPlan(planId, options = {}) {
    const url = buildUrl(requireEndpoint(PROMOTION_ENDPOINTS.adminPlan, "promotion.plan"), { planId });
    const response = await axiosClient.get(url, { signal: options.signal });
    return mapPromotionPlanDto(unwrap(response));
  },

  async createPlan(planData, options = {}) {
    const response = await axiosClient.post(
      requireEndpoint(PROMOTION_ENDPOINTS.adminPlans, "promotion.createPlan"),
      planData,
      { signal: options.signal }
    );
    return mapPromotionPlanDto(unwrap(response));
  },

  async updatePlan(planId, planData, options = {}) {
    const url = buildUrl(requireEndpoint(PROMOTION_ENDPOINTS.adminPlan, "promotion.updatePlan"), { planId });
    const response = await axiosClient.put(url, planData, { signal: options.signal });
    return mapPromotionPlanDto(unwrap(response));
  },

  async deletePlan(planId, options = {}) {
    const url = buildUrl(requireEndpoint(PROMOTION_ENDPOINTS.adminPlan, "promotion.deletePlan"), { planId });
    await axiosClient.delete(url, { signal: options.signal });
  },

  // ---- Admin: Campaigns ----
  async getCampaigns(includeInactive = false, options = {}) {
    const url = requireEndpoint(PROMOTION_ENDPOINTS.adminCampaigns, "promotion.campaigns");
    const response = await axiosClient.get(url, {
      params: { includeInactive },
      signal: options.signal
    });
    return mapPromotionCampaignListDto(unwrap(response));
  },

  async getCampaign(campaignId, options = {}) {
    const url = buildUrl(requireEndpoint(PROMOTION_ENDPOINTS.adminCampaign, "promotion.campaign"), { campaignId });
    const response = await axiosClient.get(url, { signal: options.signal });
    return mapPromotionCampaignDto(unwrap(response));
  },

  async createCampaign(formData, options = {}) {
    const response = await axiosClient.post(
      requireEndpoint(PROMOTION_ENDPOINTS.adminCampaigns, "promotion.createCampaign"),
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        signal: options.signal
      }
    );
    return mapPromotionCampaignDto(unwrap(response));
  },

  async updateCampaign(campaignId, formData, options = {}) {
    const url = buildUrl(requireEndpoint(PROMOTION_ENDPOINTS.adminCampaign, "promotion.updateCampaign"), { campaignId });
    const response = await axiosClient.put(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal: options.signal
    });
    return mapPromotionCampaignDto(unwrap(response));
  },

  async deleteCampaign(campaignId, options = {}) {
    const url = buildUrl(requireEndpoint(PROMOTION_ENDPOINTS.adminCampaign, "promotion.deleteCampaign"), { campaignId });
    await axiosClient.delete(url, { signal: options.signal });
  },

  async updateCampaignStatus(campaignId, status, options = {}) {
    const url = buildUrl(requireEndpoint(PROMOTION_ENDPOINTS.adminCampaignStatus, "promotion.updateStatus"), { campaignId });
    await axiosClient.patch(url, status, {
      headers: { "Content-Type": "application/json" },
      signal: options.signal
    });
  },

  // Helper to get image URL
  getCampaignImageUrl(campaignId) {
    const template = requireEndpoint(PROMOTION_ENDPOINTS.campaignImage, "promotion.image");
    return buildUrl(template, { campaignId });
  }
};

export default promotionAdapter;