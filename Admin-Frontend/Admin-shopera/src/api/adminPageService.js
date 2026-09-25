import { api } from "./apiClient.js";
import { requireAuthenticatedAdmin } from "../auth/authSession.js";

export const getAdminPage = async (resource, { page = 1, pageSize = 25, ...filters } = {}) => {
  requireAuthenticatedAdmin();
  return api.get(`/api/Admin/${resource}`, { query: { ...filters, page, pageSize } });
};
