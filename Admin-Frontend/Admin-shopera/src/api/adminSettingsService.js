import { api } from "./apiClient.js";

export const getAdminSettingsProfile = () => api.get("/api/profile");

export const updateAdminSettingsProfile = ({ fullName, phoneNumber = "" }) =>
  api.patch("/api/profile", {
    fullName,
    phoneNumber: phoneNumber.trim() || null,
  });
