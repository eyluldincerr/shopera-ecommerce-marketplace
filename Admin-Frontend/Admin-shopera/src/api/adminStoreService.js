import {
  operationalStoreApprovalHistory,
  operationalStores,
} from "../data/operationalStoreStore";
import {
  getAuthenticatedUserId,
  requireAuthenticatedAdmin,
} from "../auth/authSession";
import { isRealApiMode } from "../auth/authSession";
import { getAuthenticatedUser } from "../auth/authSession";
import { api } from "./apiClient.js";

import {
  getAdminAccountRecordById,
} from "./adminAccountService";

import {
  createAdminNotification,
  createNotificationForAllAdmins,
  resolveAdminNotificationsForEntity,
} from "./adminNotificationService";

const adminStores = operationalStores;
const adminStoreApprovalHistory = operationalStoreApprovalHistory;

const getAllAdminStoresFromBackend = async () => {
  const stores = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await api.get("/api/Admin/stores", {
      query: { page, pageSize: 100 },
    });

    if (Array.isArray(response)) {
      return response;
    }

    stores.push(...(Array.isArray(response?.items) ? response.items : []));
    totalPages = Math.max(Number(response?.totalPages || 1), 1);
    page += 1;
  } while (page <= totalPages);

  return stores;
};

const requireAdminStoreBackend = () => {
  throw new Error("Backend integration is not configured.");
};

const allowedStoreStatuses = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "CLOSED",
];

const allowedApprovalStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
];

const cloneStore = (store) => ({ ...store });

const cloneApprovalHistoryRecord = (historyRecord) => ({
  ...historyRecord,
});

const normalizePositiveInteger = (value, fieldName) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new Error(
      `${fieldName} must be a valid positive integer.`
    );
  }

  return numericValue;
};

const normalizeDecisionNote = (
  decisionNote,
  fallbackValue = null
) => {
  const normalizedDecisionNote = String(
    decisionNote || fallbackValue || ""
  ).trim();

  if (!normalizedDecisionNote) {
    return null;
  }

  if (normalizedDecisionNote.length > 500) {
    throw new Error(
      "Decision note cannot exceed 500 characters."
    );
  }

  return normalizedDecisionNote;
};

const createInitials = (fullName) => {
  return String(fullName || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0])
    .join("")
    .toUpperCase();
};

const findStoreIndex = (storeId) => {
  const numericStoreId = Number(storeId);

  return adminStores.findIndex(
    (store) => Number(store.storeId) === numericStoreId
  );
};

const getRequiredStoreIndex = (storeId) => {
  const storeIndex = findStoreIndex(storeId);

  if (storeIndex === -1) {
    throw new Error("Brand could not be found.");
  }

  return storeIndex;
};

const normalizeStoreStatus = (status) => {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (!allowedStoreStatuses.includes(normalizedStatus)) {
    throw new Error("Invalid brand status.");
  }

  return normalizedStatus;
};

const normalizeApprovalStatus = (status) => {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (!allowedApprovalStatuses.includes(normalizedStatus)) {
    throw new Error("Invalid approval status.");
  }

  return normalizedStatus;
};

const createStoreView = (store, sellerAccount) => {
  if (!store) {
    return null;
  }

  return {
    ...cloneStore(store),
    userId: store.sellerUserId,

    /*
      These fields come from USER_ACCOUNT through
      STORE.SellerUserID. They are view-model fields,
      not additional STORE database columns.
    */
    fullName:
      sellerAccount?.fullName ||
      "Unknown brand owner",

    email:
      sellerAccount?.email ||
      store.supportEmail ||
      "Not provided",

    phoneNumber:
      sellerAccount?.phoneNumber ||
      store.supportPhone ||
      null,

    registrationDate:
      sellerAccount?.registrationDate ||
      store.createdDate,

    accountStatus:
      sellerAccount?.accountStatus ||
      "INACTIVE",

    role:
      sellerAccount?.role ||
      "SELLER",

    initials: createInitials(
      sellerAccount?.fullName ||
        store.storeName
    ),
  };
};

const getStoreViewByRecord = async (store) => {
  const sellerAccount =
    await getAdminAccountRecordById(
      store.sellerUserId
    );

  return createStoreView(
    store,
    sellerAccount
  );
};

const validateAdminAccount = async (adminUserId) => {
  const authenticatedAdminUserId = getAuthenticatedUserId();
  const normalizedAdminUserId =
    normalizePositiveInteger(
      adminUserId,
      "Administrator user ID"
    );

  if (normalizedAdminUserId !== authenticatedAdminUserId) {
    throw new Error(
      "Administrator actions must use the authenticated session user."
    );
  }

  const adminAccount =
    await getAdminAccountRecordById(
      normalizedAdminUserId
    );

  if (adminAccount.role !== "ADMIN") {
    throw new Error(
      "The selected user is not an administrator."
    );
  }

  if (adminAccount.accountStatus !== "ACTIVE") {
    throw new Error(
      "The administrator account is not active."
    );
  }

  return adminAccount;
};

const getNextApprovalHistoryId = () => {
  if (adminStoreApprovalHistory.length === 0) {
    return 1;
  }

  return (
    Math.max(
      ...adminStoreApprovalHistory.map(
        (historyRecord) =>
          Number(
            historyRecord.storeApprovalHistoryId
          )
      )
    ) + 1
  );
};

const addStoreApprovalHistoryRecord = ({
  storeId,
  oldStatus,
  newStatus,
  changedByAdminUserId,
  decisionNote = null,
  changedDate = null,
}) => {
  const normalizedStoreId =
    normalizePositiveInteger(
      storeId,
      "Brand ID"
    );

  const normalizedOldStatus =
    oldStatus === null
      ? null
      : normalizeApprovalStatus(oldStatus);

  const normalizedNewStatus =
    normalizeApprovalStatus(newStatus);

  if (
    normalizedOldStatus ===
    normalizedNewStatus
  ) {
    return null;
  }

  const historyRecord = {
    storeApprovalHistoryId:
      getNextApprovalHistoryId(),

    storeId:
      normalizedStoreId,

    oldStatus:
      normalizedOldStatus,

    newStatus:
      normalizedNewStatus,

    changedByAdminUserId:
      normalizePositiveInteger(
        changedByAdminUserId,
        "Administrator user ID"
      ),

    changedDate:
      changedDate ||
      new Date().toISOString(),

    decisionNote:
      normalizeDecisionNote(
        decisionNote
      ),
  };

  adminStoreApprovalHistory.push(historyRecord);

  return cloneApprovalHistoryRecord(
    historyRecord
  );
};

const notifyBrandOwner = async ({
  store,
  adminUserId,
  notificationType,
  title,
  message,
}) => {
  return createAdminNotification({
    recipientUserId:
      store.sellerUserId,

    actorUserId:
      adminUserId,

    notificationType,
    title,
    message,

    relatedEntityType:
      "STORE",

    relatedEntityId:
      store.storeId,

    isRead: false,

    createdDate:
      new Date().toISOString(),

    readDate: null,
  });
};

const resolvePendingStoreApplicationNotifications =
  async (storeId) => {
    return resolveAdminNotificationsForEntity({
      relatedEntityType: "STORE",

      relatedEntityId:
        storeId,

      notificationTypes: [
        "STORE_APPLICATION_PENDING",
      ],
    });
  };

/* =====================================================
   STORE RECORD ACCESS
===================================================== */

export const getAdminStoreRecords = async () => {
  requireAuthenticatedAdmin();
  if (isRealApiMode()) return getAllAdminStoresFromBackend();
  return adminStores.map(cloneStore);
};

export const getAdminStoreById = async (storeId) => {
  if (isRealApiMode() && getAuthenticatedUser()?.role === "ADMIN") return api.get(`/api/Admin/stores/${Number(storeId)}`);
  const storeIndex =
    getRequiredStoreIndex(storeId);

  return getStoreViewByRecord(
    adminStores[storeIndex]
  );
};

export const getAdminStoreBySellerUserId =
  async (sellerUserId) => {
    if (isRealApiMode() && getAuthenticatedUser()?.role === "ADMIN") return api.get(`/api/Admin/stores/seller/${Number(sellerUserId)}`);
    const numericSellerUserId =
      normalizePositiveInteger(
        sellerUserId,
        "Brand owner user ID"
      );

    const store = adminStores.find(
      (currentStore) =>
        Number(
          currentStore.sellerUserId
        ) === numericSellerUserId
    );

    if (!store) {
      throw new Error(
        "Brand could not be found for this user."
      );
    }

    return getStoreViewByRecord(store);
  };

export const updateAdminStoreStatus = async (
  storeId,
  status,
  decisionNote = null
) => {
  requireAuthenticatedAdmin();

  const normalizedStatus = normalizeStoreStatus(status);

  if (isRealApiMode()) {
    return api.put(`/api/Admin/stores/${Number(storeId)}/status`, {
      status: normalizedStatus,
      decisionNote: decisionNote || null,
    });
  }

  const storeIndex = getRequiredStoreIndex(storeId);
  const currentStore = adminStores[storeIndex];

  const updatedStore = {
    ...currentStore,
    storeStatus: normalizedStatus,
    approvalStatus:
      normalizedStatus === "SUSPENDED"
        ? "SUSPENDED"
        : currentStore.approvalStatus === "SUSPENDED"
          ? "APPROVED"
          : currentStore.approvalStatus,
    updatedDate: new Date().toISOString(),
  };

  adminStores[storeIndex] = updatedStore;
  return getStoreViewByRecord(updatedStore);
};

/* =====================================================
   STORE APPROVAL HISTORY
===================================================== */

export const getAdminStoreApprovalHistory =
  async () => {
    requireAuthenticatedAdmin();

    return [];
  };

export const getAdminStoreApprovalHistoryByStoreId =
  async (storeId) => {
    requireAuthenticatedAdmin();
    if (isRealApiMode()) return api.get(`/api/Admin/stores/${Number(storeId)}/history`);
    void storeId;

    return [];
  };

/* =====================================================
   STORE VERIFICATION
===================================================== */

export const getAdminStoreApplications =
  async () => {
    requireAuthenticatedAdmin();
    if (isRealApiMode()) return api.get("/api/Admin/pending-sellers");
    return [];
  };

export const getAdminStoreApplicationById =
  async (storeId) => {
    requireAuthenticatedAdmin();
    if (isRealApiMode()) return api.get(`/api/Admin/stores/${Number(storeId)}`);
    void storeId;
    requireAdminStoreBackend();
  };

export const approveAdminStoreApplication =
  async (
    storeId,
    adminUserId = getAuthenticatedUserId(),
    decisionNote = null
  ) => {
    if (isRealApiMode()) {
      await api.put(`/api/Admin/stores/${Number(storeId)}/approval`, {
        decision: "APPROVED", decisionNote,
      });
      return getAdminStoreById(storeId);
    }
    void storeId;
    void adminUserId;
    void decisionNote;
    requireAdminStoreBackend();
    const adminAccount =
      await validateAdminAccount(
        adminUserId
      );

    const storeIndex =
      getRequiredStoreIndex(
        storeId
      );

    const currentStore =
      adminStores[storeIndex];

    if (
      currentStore.approvalStatus !==
      "PENDING"
    ) {
      throw new Error(
        "Only pending brand applications can be approved."
      );
    }

    const changedDate =
      new Date().toISOString();

    const updatedStore = {
      ...currentStore,

      approvalStatus:
        "APPROVED",

      approvedByAdminUserId:
        adminAccount.userId,

      storeStatus:
        "ACTIVE",

      updatedDate:
        changedDate,
    };

    adminStores[storeIndex] =
      updatedStore;

    addStoreApprovalHistoryRecord({
      storeId:
        updatedStore.storeId,

      oldStatus:
        currentStore.approvalStatus,

      newStatus:
        "APPROVED",

      changedByAdminUserId:
        adminAccount.userId,

      changedDate,

      decisionNote:
        normalizeDecisionNote(
          decisionNote,
          "The brand application was approved after administrator verification."
        ),
    });

    await notifyBrandOwner({
      store:
        updatedStore,

      adminUserId:
        adminAccount.userId,

      notificationType:
        "STORE_APPROVED",

      title:
        "Brand Application Approved",

      message:
        `${updatedStore.storeName} has been approved and can now operate on the marketplace.`,
    });

    await resolvePendingStoreApplicationNotifications(
      updatedStore.storeId
    );

    return getStoreViewByRecord(
      updatedStore
    );
  };

export const rejectAdminStoreApplication =
  async (
    storeId,
    adminUserId = getAuthenticatedUserId(),
    decisionNote =
      "The application did not meet the marketplace verification requirements."
  ) => {
    if (isRealApiMode()) {
      await api.put(`/api/Admin/stores/${Number(storeId)}/approval`, {
        decision: "REJECTED", decisionNote,
      });
      return getAdminStoreById(storeId);
    }
    void storeId;
    void adminUserId;
    void decisionNote;
    requireAdminStoreBackend();
    const adminAccount =
      await validateAdminAccount(
        adminUserId
      );

    const storeIndex =
      getRequiredStoreIndex(
        storeId
      );

    const currentStore =
      adminStores[storeIndex];

    if (
      currentStore.approvalStatus !==
      "PENDING"
    ) {
      throw new Error(
        "Only pending brand applications can be rejected."
      );
    }

    const normalizedDecisionNote =
      normalizeDecisionNote(
        decisionNote
      );

    if (!normalizedDecisionNote) {
      throw new Error(
        "A rejection reason is required."
      );
    }

    const changedDate =
      new Date().toISOString();

    const updatedStore = {
      ...currentStore,

      approvalStatus:
        "REJECTED",

      approvedByAdminUserId:
        adminAccount.userId,

      storeStatus:
        "INACTIVE",

      updatedDate:
        changedDate,
    };

    adminStores[storeIndex] =
      updatedStore;

    addStoreApprovalHistoryRecord({
      storeId:
        updatedStore.storeId,

      oldStatus:
        currentStore.approvalStatus,

      newStatus:
        "REJECTED",

      changedByAdminUserId:
        adminAccount.userId,

      changedDate,

      decisionNote:
        normalizedDecisionNote,
    });

    await notifyBrandOwner({
      store:
        updatedStore,

      adminUserId:
        adminAccount.userId,

      notificationType:
        "STORE_REJECTED",

      title:
        "Brand Application Rejected",

      message:
        `${updatedStore.storeName} was not approved. Reason: ${normalizedDecisionNote}`,
    });

    await resolvePendingStoreApplicationNotifications(
      updatedStore.storeId
    );

    return getStoreViewByRecord(
      updatedStore
    );
  };

export const returnAdminStoreApplicationToPending =
  async (
    storeId,
    adminUserId = getAuthenticatedUserId(),
    decisionNote = null
  ) => {
    if (isRealApiMode()) throw new Error("Returning a store application to pending is not supported by the backend.");
    void storeId;
    void adminUserId;
    void decisionNote;
    requireAdminStoreBackend();
    const adminAccount =
      await validateAdminAccount(
        adminUserId
      );

    const storeIndex =
      getRequiredStoreIndex(
        storeId
      );

    const currentStore =
      adminStores[storeIndex];

    if (
      currentStore.approvalStatus ===
      "PENDING"
    ) {
      return getStoreViewByRecord(
        currentStore
      );
    }

    const changedDate =
      new Date().toISOString();

    const updatedStore = {
      ...currentStore,

      approvalStatus:
        "PENDING",

      approvedByAdminUserId:
        null,

      storeStatus:
        "INACTIVE",

      updatedDate:
        changedDate,
    };

    adminStores[storeIndex] =
      updatedStore;

    addStoreApprovalHistoryRecord({
      storeId:
        updatedStore.storeId,

      oldStatus:
        currentStore.approvalStatus,

      newStatus:
        "PENDING",

      changedByAdminUserId:
        adminAccount.userId,

      changedDate,

      decisionNote:
        normalizeDecisionNote(
          decisionNote,
          "The brand application was returned for another administrator review."
        ),
    });

    await createNotificationForAllAdmins({
      actorUserId:
        adminAccount.userId,

      notificationType:
        "STORE_APPLICATION_PENDING",

      title:
        "Brand Application Requires Review",

      message:
        `${updatedStore.storeName} has been returned to pending status and requires administrator review.`,

      relatedEntityType:
        "STORE",

      relatedEntityId:
        updatedStore.storeId,

      createdDate:
        changedDate,
    });

    return getStoreViewByRecord(
      updatedStore
    );
  };

/* =====================================================
   ADMIN STORE READ ACCESS
   Admin may also moderate Store operational status.
===================================================== */

export const getAdminStores = async () => {
  requireAuthenticatedAdmin();
  if (isRealApiMode()) return getAllAdminStoresFromBackend();
  return [];
};
