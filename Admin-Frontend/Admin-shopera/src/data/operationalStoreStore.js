import { adminStoreApprovalHistoryData } from "./adminStoreApprovalHistoryData";
import { adminStoresData } from "./adminStoresData";

export const operationalStores = structuredClone(adminStoresData);
export const operationalStoreApprovalHistory = structuredClone(
  adminStoreApprovalHistoryData,
);
