import axiosClient from "./axiosClient.js";
import { NOTIFICATION_ENDPOINTS } from "../config/apiEndpoints.js";
import { getNotificationPresentation } from "./notificationPresentationService.js";
import { requireCurrentSession } from "./authService.js";

const subscribersByRecipient = new Map();
const LEGACY_BUYER_PREFIX = "shopera-buyer-notifications:";
const LEGACY_SELLER_SUFFIX = ":notifications";
const LEGACY_SELLER_PREFIX = "shopera:seller:";

const getAuthenticatedSession = () =>
  requireCurrentSession(["Buyer", "Seller", "Admin"]);

const replaceEndpointToken = (template, token, value) =>
  template.replace(token, encodeURIComponent(String(value)));

const normalizeDateValue = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeNotification = (notification = {}) => {
  const notificationType = String(
    notification.notificationType || "SYSTEM"
  ).trim();
  const presentation = getNotificationPresentation(notificationType);

  return {
    notificationId: notification.notificationId,
    notificationType,
    title: String(notification.title || "Notification"),
    message: String(notification.message || ""),
    relatedEntityType: notification.relatedEntityType
      ? String(notification.relatedEntityType)
      : null,
    relatedEntityId:
      notification.relatedEntityId === undefined ||
      notification.relatedEntityId === null ||
      notification.relatedEntityId === ""
        ? null
        : notification.relatedEntityId,
    relatedEntityReference: notification.relatedEntityReference
      ? String(notification.relatedEntityReference)
      : null,
    category: presentation.category,
    isRead: notification.isRead === true,
    createdDate:
      normalizeDateValue(notification.createdDate) || new Date().toISOString(),
    readDate: normalizeDateValue(notification.readDate),
    relatedEntityAvailable: notification.relatedEntityAvailable !== false,
  };
};

const sortNewestFirst = (notifications) =>
  [...notifications].sort(
    (first, second) =>
      new Date(second.createdDate).getTime() -
      new Date(first.createdDate).getTime()
  );

const dedupeNotifications = (notifications) => {
  const notificationsById = new Map();

  notifications.forEach((notification) => {
    const key = String(notification.notificationId ?? "");
    if (key && !notificationsById.has(key)) {
      notificationsById.set(key, notification);
    }
  });

  return Array.from(notificationsById.values());
};

const normalizeList = (notifications) =>
  sortNewestFirst(
    dedupeNotifications(
      (Array.isArray(notifications) ? notifications : []).map(
        normalizeNotification
      )
    )
  );

const normalizeCategory = (category) => String(category || "").trim();

const filterNotifications = (notifications, options = {}) => {
  const category = normalizeCategory(options.category);
  const unreadOnly = Boolean(options.unreadOnly);

  return notifications.filter((notification) => {
    if (unreadOnly && notification.isRead) {
      return false;
    }

    return !category || notification.category === category;
  });
};

const getCategoryCounts = (notifications) =>
  notifications.reduce((counts, notification) => {
    const category = normalizeCategory(notification.category) || "System";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});

const createNotificationResponse = (notifications, options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const fallbackPageSize = notifications.length || 1;
  const pageSize = Math.max(1, Number(options.pageSize) || fallbackPageSize);
  const filteredNotifications = filterNotifications(notifications, options);
  const total = filteredNotifications.length;
  const startIndex = (page - 1) * pageSize;
  const items = filteredNotifications.slice(startIndex, startIndex + pageSize);
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;
  const categoryCounts = getCategoryCounts(notifications);
  const categories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((first, second) => first.category.localeCompare(second.category));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    hasMore: startIndex + items.length < total,
    unreadCount,
    filterCounts: {
      All: notifications.length,
      Unread: unreadCount,
      ...categoryCounts,
    },
    categories,
  };
};

const publishSnapshot = (recipientUserId, notifications) => {
  const subscribers = subscribersByRecipient.get(String(recipientUserId));
  if (!subscribers?.size) {
    return;
  }

  subscribers.forEach((callback) => callback(notifications));
};

export const removeLegacyNotificationStorage = () => {
  if (typeof localStorage === "undefined") {
    return;
  }

  const session = (() => {
    try {
      return getAuthenticatedSession();
    } catch {
      return null;
    }
  })();

  if (session?.userId) {
    localStorage.removeItem(`${LEGACY_BUYER_PREFIX}${session.userId}`);
    localStorage.removeItem(
      `${LEGACY_SELLER_PREFIX}${encodeURIComponent(session.userId)}${LEGACY_SELLER_SUFFIX}`
    );
  }

  if (typeof localStorage.key !== "function") {
    return;
  }

  const keysToRemove = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key?.startsWith(LEGACY_BUYER_PREFIX) ||
      (key?.startsWith(LEGACY_SELLER_PREFIX) &&
        key.endsWith(LEGACY_SELLER_SUFFIX))
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const fetchAuthoritativeNotifications = async () => {
  const session = getAuthenticatedSession();
  removeLegacyNotificationStorage();
  const response = await axiosClient.get(NOTIFICATION_ENDPOINTS.list);
  const notifications = normalizeList(response.data);
  publishSnapshot(session.userId, notifications);
  return notifications;
};

export const getNotifications = async (options = {}) => {
  const notifications = await fetchAuthoritativeNotifications();

  if (options.asArray) {
    const filtered = filterNotifications(notifications, options);
    const limit = Number(options.limit);
    return Number.isFinite(limit) && limit > 0
      ? filtered.slice(0, limit)
      : filtered;
  }

  return createNotificationResponse(notifications, options);
};

export const getUnreadCount = async () => {
  getAuthenticatedSession();
  removeLegacyNotificationStorage();
  const response = await axiosClient.get(NOTIFICATION_ENDPOINTS.unreadCount);
  return Math.max(0, Number(response.data) || 0);
};

export const markAsRead = async (notificationId) => {
  getAuthenticatedSession();
  if (!notificationId) {
    return null;
  }

  const endpoint = replaceEndpointToken(
    NOTIFICATION_ENDPOINTS.read,
    ":notificationId",
    notificationId
  );
  await axiosClient.patch(endpoint);
  const notifications = await fetchAuthoritativeNotifications();

  return (
    notifications.find(
      (notification) =>
        String(notification.notificationId) === String(notificationId)
    ) || null
  );
};

export const markAllAsRead = async () => {
  getAuthenticatedSession();
  await axiosClient.patch(NOTIFICATION_ENDPOINTS.readAll);
  return fetchAuthoritativeNotifications();
};

export const refreshNotificationSnapshot = async () =>
  fetchAuthoritativeNotifications();

export const subscribe = (callback) => {
  if (typeof callback !== "function") {
    return () => {};
  }

  let session;
  try {
    session = getAuthenticatedSession();
  } catch {
    return () => {};
  }

  const recipientKey = String(session.userId);
  const subscribers = subscribersByRecipient.get(recipientKey) || new Set();
  subscribers.add(callback);
  subscribersByRecipient.set(recipientKey, subscribers);

  return () => {
    subscribers.delete(callback);
    if (!subscribers.size) {
      subscribersByRecipient.delete(recipientKey);
    }
  };
};

export const unsubscribe = (callback) => {
  subscribersByRecipient.forEach((subscribers, recipientKey) => {
    subscribers.delete(callback);
    if (!subscribers.size) {
      subscribersByRecipient.delete(recipientKey);
    }
  });
};
