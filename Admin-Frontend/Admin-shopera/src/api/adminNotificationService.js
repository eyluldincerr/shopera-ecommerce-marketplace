import { adminNotificationsData } from "../data/adminNotificationsData";
import { operationalUserAccounts } from "../data/operationalAccountStore";
import {
  getAuthenticatedUser,
  isRealApiMode,
  requireAuthenticatedAdmin,
} from "../auth/authSession";
import { api } from "./apiClient.js";

let notificationRecords =
  adminNotificationsData.map((notification) => ({
    ...notification,
  }));

const requireAdminNotificationBackend = () => {
  throw new Error("Backend integration is not configured.");
};

const waitForMockRequest = (duration = 100) => {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
};

const cloneNotification = (notification) => {
  return {
    ...notification,
  };
};

const normalizeRequiredId = (value, fieldName) => {
  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue <= 0
  ) {
    throw new Error(
      `${fieldName} must be a valid positive integer.`
    );
  }

  return numericValue;
};

const normalizeOptionalId = (value, fieldName) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return normalizeRequiredId(value, fieldName);
};

const requireCurrentAdminRecipient = (recipientUserId) => {
  const admin = requireAuthenticatedAdmin();
  const normalizedRecipientUserId = normalizeRequiredId(
    recipientUserId,
    "Recipient user ID",
  );
  if (normalizedRecipientUserId !== Number(admin.userId)) {
    throw new Error("Administrators may access only their own notifications.");
  }
  return normalizedRecipientUserId;
};

const normalizeRequiredText = (
  value,
  fieldName
) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
};

const normalizeNotificationType = (value) => {
  return normalizeRequiredText(
    value,
    "Notification type"
  ).toUpperCase();
};

const normalizeRelatedEntityType = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value).trim().toUpperCase();
};

const emitNotificationUpdate = () => {
  window.dispatchEvent(
    new Event("admin-notifications-updated")
  );
};

const getNextNotificationId = () => {
  if (notificationRecords.length === 0) {
    return 1;
  }

  return (
    Math.max(
      ...notificationRecords.map((notification) =>
        Number(notification.notificationId)
      )
    ) + 1
  );
};

const validateUserExists = (userId, fieldName) => {
  const userExists = operationalUserAccounts.some(
    (account) =>
      Number(account.userId) === Number(userId)
  );

  if (!userExists) {
    throw new Error(
      `${fieldName} does not reference an existing user account.`
    );
  }
};

const getActiveAdminAccounts = () => {
  return operationalUserAccounts.filter(
    (account) =>
      account.role === "ADMIN" &&
      account.accountStatus === "ACTIVE"
  );
};

const createNotificationRecord = (
  notificationInput
) => {
  const recipientUserId = normalizeRequiredId(
    notificationInput.recipientUserId,
    "Recipient user ID"
  );

  const actorUserId = normalizeOptionalId(
    notificationInput.actorUserId,
    "Actor user ID"
  );

  validateUserExists(
    recipientUserId,
    "Recipient user ID"
  );

  if (actorUserId !== null) {
    validateUserExists(actorUserId, "Actor user ID");
  }

  const notificationType =
    normalizeNotificationType(
      notificationInput.notificationType
    );

  const title = normalizeRequiredText(
    notificationInput.title,
    "Notification title"
  );

  const message = normalizeRequiredText(
    notificationInput.message,
    "Notification message"
  );

  const relatedEntityType =
    normalizeRelatedEntityType(
      notificationInput.relatedEntityType
    );

  const relatedEntityId = normalizeOptionalId(
    notificationInput.relatedEntityId,
    "Related entity ID"
  );

  const hasRelatedEntityType =
    relatedEntityType !== null;

  const hasRelatedEntityId =
    relatedEntityId !== null;

  if (
    hasRelatedEntityType !== hasRelatedEntityId
  ) {
    throw new Error(
      "Related entity type and related entity ID must either both be provided or both be empty."
    );
  }

  const isRead =
    notificationInput.isRead === true;

  const createdDate =
    notificationInput.createdDate ||
    new Date().toISOString();

  const readDate = isRead
    ? notificationInput.readDate ||
      new Date().toISOString()
    : null;

  const notificationRecord = {
    notificationId: getNextNotificationId(),
    recipientUserId,
    actorUserId,
    notificationType,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
    isRead,
    createdDate,
    readDate,
  };

  notificationRecords = [
    ...notificationRecords,
    notificationRecord,
  ];

  return cloneNotification(notificationRecord);
};

export const getAdminNotifications = async (
  recipientUserId
) => {
  requireAuthenticatedAdmin();
  if (isRealApiMode()) return api.get("/api/Admin/notifications");
  void recipientUserId;
  return [];
};

export const getAdminUnreadNotificationCount =
  async (recipientUserId) => {
    if (isRealApiMode()) {
      const response = await api.get("/api/Admin/notifications/unread-count");
      return Number(response.unreadCount || 0);
    }
    const notifications =
      await getAdminNotifications(recipientUserId);

    return notifications.filter(
      (notification) =>
        notification.isRead === false
    ).length;
  };

export const markAdminNotificationAsRead =
  async (notificationId, recipientUserId) => {
    if (isRealApiMode()) {
      await api.put(`/api/Admin/notifications/${Number(notificationId)}/read`);
      return null;
    }
    void notificationId;
    void recipientUserId;
    requireAdminNotificationBackend();

    const normalizedNotificationId =
      normalizeRequiredId(
        notificationId,
        "Notification ID"
      );

    const normalizedRecipientUserId =
      requireCurrentAdminRecipient(recipientUserId);

    const notificationIndex =
      notificationRecords.findIndex(
        (notification) =>
          Number(notification.notificationId) ===
            normalizedNotificationId &&
          Number(notification.recipientUserId) ===
            normalizedRecipientUserId
      );

    if (notificationIndex === -1) {
      throw new Error(
        "Notification could not be found."
      );
    }

    const currentNotification =
      notificationRecords[notificationIndex];

    if (currentNotification.isRead) {
      return cloneNotification(currentNotification);
    }

    const updatedNotification = {
      ...currentNotification,
      isRead: true,
      readDate: new Date().toISOString(),
    };

    notificationRecords = [
      ...notificationRecords.slice(
        0,
        notificationIndex
      ),
      updatedNotification,
      ...notificationRecords.slice(
        notificationIndex + 1
      ),
    ];

    emitNotificationUpdate();

    return cloneNotification(updatedNotification);
  };

export const markAllAdminNotificationsAsRead =
  async (recipientUserId) => {
    if (isRealApiMode()) {
      const response = await api.put("/api/Admin/notifications/read-all");
      return Number(response.updatedCount || 0);
    }
    void recipientUserId;
    requireAdminNotificationBackend();

    const normalizedRecipientUserId =
      requireCurrentAdminRecipient(recipientUserId);

    const readDate = new Date().toISOString();

    let updatedCount = 0;

    notificationRecords = notificationRecords.map(
      (notification) => {
        const belongsToAdmin =
          Number(notification.recipientUserId) ===
          normalizedRecipientUserId;

        if (
          !belongsToAdmin ||
          notification.isRead
        ) {
          return notification;
        }

        updatedCount += 1;

        return {
          ...notification,
          isRead: true,
          readDate,
        };
      }
    );

    if (updatedCount > 0) {
      emitNotificationUpdate();
    }

    return updatedCount;
  };

/*
  This is used when the underlying admin action has
  already been completed.

  Example:
  A STORE_APPLICATION_PENDING notification becomes
  obsolete after the related store is approved or
  rejected.

  All matching admin notification rows remain in the
  database, but IsRead and ReadDate are updated.
*/
export const resolveAdminNotificationsForEntity =
  async ({
    relatedEntityType,
    relatedEntityId,
    notificationTypes = [],
  }) => {
    requireAuthenticatedAdmin();
    await waitForMockRequest();

    const normalizedRelatedEntityType =
      normalizeRequiredText(
        relatedEntityType,
        "Related entity type"
      ).toUpperCase();

    const normalizedRelatedEntityId =
      normalizeRequiredId(
        relatedEntityId,
        "Related entity ID"
      );

    const normalizedNotificationTypes =
      Array.isArray(notificationTypes)
        ? notificationTypes
            .map((notificationType) =>
              String(notificationType || "")
                .trim()
                .toUpperCase()
            )
            .filter(Boolean)
        : [];

    const activeAdminUserIds = new Set(
      getActiveAdminAccounts().map((account) =>
        Number(account.userId)
      )
    );

    const readDate = new Date().toISOString();

    let updatedCount = 0;

    notificationRecords = notificationRecords.map(
      (notification) => {
        const belongsToActiveAdmin =
          activeAdminUserIds.has(
            Number(notification.recipientUserId)
          );

        const matchesEntity =
          String(
            notification.relatedEntityType || ""
          ).toUpperCase() ===
            normalizedRelatedEntityType &&
          Number(notification.relatedEntityId) ===
            normalizedRelatedEntityId;

        const matchesNotificationType =
          normalizedNotificationTypes.length === 0 ||
          normalizedNotificationTypes.includes(
            String(
              notification.notificationType || ""
            ).toUpperCase()
          );

        if (
          !belongsToActiveAdmin ||
          !matchesEntity ||
          !matchesNotificationType ||
          notification.isRead
        ) {
          return notification;
        }

        updatedCount += 1;

        return {
          ...notification,
          isRead: true,
          readDate,
        };
      }
    );

    if (updatedCount > 0) {
      emitNotificationUpdate();
    }

    return updatedCount;
  };

export const createNotification = async (
  notificationInput
) => {
  await waitForMockRequest();

  const authenticatedUser = getAuthenticatedUser();
  if (
    notificationInput.actorUserId !== null &&
    notificationInput.actorUserId !== undefined &&
    Number(notificationInput.actorUserId) !== Number(authenticatedUser?.userId)
  ) {
    throw new Error(
      "Notification actor must match the authenticated session user."
    );
  }

  const createdNotification =
    createNotificationRecord(notificationInput);

  emitNotificationUpdate();

  return createdNotification;
};

/*
  Kept as an alias because the current store service
  already imports this function name. The function can
  create a notification for any USER_ACCOUNT role.
*/
export const createAdminNotification =
  createNotification;

export const createNotificationForAllAdmins =
  async ({
    actorUserId = null,
    notificationType,
    title,
    message,
    relatedEntityType = null,
    relatedEntityId = null,
    createdDate = null,
  }) => {
    await waitForMockRequest();

    const authenticatedUser = getAuthenticatedUser();
    if (
      actorUserId !== null &&
      actorUserId !== undefined &&
      Number(actorUserId) !== Number(authenticatedUser?.userId)
    ) {
      throw new Error(
        "Notification actor must match the authenticated session user."
      );
    }

    const adminAccounts = getActiveAdminAccounts();

    const createdNotifications = adminAccounts.map(
      (adminAccount) =>
        createNotificationRecord({
          recipientUserId: adminAccount.userId,
          actorUserId,
          notificationType,
          title,
          message,
          relatedEntityType,
          relatedEntityId,
          isRead: false,
          createdDate:
            createdDate || new Date().toISOString(),
          readDate: null,
        })
    );

    if (createdNotifications.length > 0) {
      emitNotificationUpdate();
    }

    return createdNotifications;
  };
