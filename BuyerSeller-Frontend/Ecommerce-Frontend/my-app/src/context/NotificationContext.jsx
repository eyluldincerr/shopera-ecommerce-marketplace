import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NotificationContext } from "./notificationContext";
import { getCurrentSession } from "../services/authService";
import { createNotificationRealtimeClient } from "../services/notificationRealtimeService.js";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead as markAllNotificationsAsRead,
  markAsRead as markNotificationAsRead,
  removeLegacyNotificationStorage,
  subscribe,
} from "../services/notificationService";

const EMPTY_STATE = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: "",
};

const EMPTY_NOTIFICATION_RESPONSE = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  hasMore: false,
  unreadCount: 0,
  filterCounts: {
    All: 0,
    Unread: 0,
  },
  categories: [],
};

const DROPDOWN_PAGE_SIZE = 6;
const REFRESH_INTERVAL_MS = 30000;

const getActiveNotificationUserId = () => {
  const session = getCurrentSession();
  const supportedRoles = new Set(["Buyer", "Seller", "Admin"]);

  return session?.userId && supportedRoles.has(session.role)
    ? session.userId
    : null;
};

const dedupeAndSortNotifications = (notifications) => {
  const notificationsById = new Map();

  notifications.forEach((notification) => {
    if (!notificationsById.has(notification.notificationId)) {
      notificationsById.set(notification.notificationId, notification);
    }
  });

  return Array.from(notificationsById.values()).sort((first, second) => {
    return new Date(second.createdDate).getTime() - new Date(first.createdDate).getTime();
  });
};

const countUnread = (notifications) => {
  return Math.max(
    0,
    notifications.reduce(
      (total, notification) => total + (notification.isRead ? 0 : 1),
      0
    )
  );
};

export function NotificationProvider({ children }) {
  const [notificationUserId, setNotificationUserId] = useState(getActiveNotificationUserId);
  const [state, setState] = useState(EMPTY_STATE);
  const [realtimeRevision, setRealtimeRevision] = useState(0);
  const activeRequestRef = useRef(0);

  const applyNotifications = useCallback((notifications) => {
    const sortedNotifications = dedupeAndSortNotifications(notifications);
    const unreadNotifications = sortedNotifications.filter(
      (notification) => !notification.isRead
    );
    const nextNotifications = unreadNotifications.slice(0, DROPDOWN_PAGE_SIZE);

    setState((currentState) => ({
      ...currentState,
      notifications: nextNotifications,
      unreadCount: countUnread(sortedNotifications),
      isLoading: false,
      error: "",
    }));
  }, []);

  const refreshNotifications = useCallback(async (options = {}) => {
    if (!notificationUserId) {
      setState(EMPTY_STATE);
      return;
    }

    const silent = options?.silent === true;
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setState((currentState) => ({
      ...currentState,
      isLoading: silent ? currentState.isLoading : true,
      error: "",
    }));

    try {
      const [nextNotifications, nextUnreadCount] = await Promise.all([
        getNotifications({
          page: 1,
          pageSize: DROPDOWN_PAGE_SIZE,
          unreadOnly: true,
        }),
        getUnreadCount(),
      ]);

      if (activeRequestRef.current !== requestId) {
        return;
      }

      const normalizedNotifications = dedupeAndSortNotifications(
        nextNotifications.items || []
      );

      setState({
        notifications: normalizedNotifications,
        unreadCount: Math.max(0, Number(nextUnreadCount) || 0),
        isLoading: false,
        error: "",
      });
    } catch (error) {
      if (activeRequestRef.current !== requestId) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        isLoading: false,
        error: error?.message || "Notifications could not be loaded.",
      }));
    }
  }, [notificationUserId]);

  const fetchNotifications = useCallback(
    async (options = {}) => {
      if (!notificationUserId) {
        return EMPTY_NOTIFICATION_RESPONSE;
      }

      return getNotifications(options);
    },
    [notificationUserId]
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationUserId || !notificationId) {
        return;
      }

      setState((currentState) => {
        const selectedNotification = currentState.notifications.find(
          (notification) =>
            String(notification.notificationId) === String(notificationId)
        );

        return {
          ...currentState,
          notifications: currentState.notifications.filter(
            (notification) =>
              String(notification.notificationId) !== String(notificationId)
          ),
          unreadCount: selectedNotification?.isRead
            ? currentState.unreadCount
            : Math.max(0, currentState.unreadCount - 1),
        };
      });

      try {
        await markNotificationAsRead(notificationId);
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          error: error?.message || "Notification could not be updated.",
        }));
        await refreshNotifications();
      }
    },
    [notificationUserId, refreshNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!notificationUserId) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      notifications: [],
      unreadCount: 0,
    }));

    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: error?.message || "Notifications could not be updated.",
      }));
      await refreshNotifications();
    }
  }, [notificationUserId, refreshNotifications]);

  useEffect(() => {
    const syncNotificationUser = () => {
      setNotificationUserId(getActiveNotificationUserId());
    };

    window.addEventListener("authChanged", syncNotificationUser);
    window.addEventListener("storage", syncNotificationUser);

    return () => {
      window.removeEventListener("authChanged", syncNotificationUser);
      window.removeEventListener("storage", syncNotificationUser);
    };
  }, []);

  useEffect(() => {
    if (!notificationUserId) {
      return undefined;
    }

    const realtimeClient = createNotificationRealtimeClient({
      onEvent: () => {
        setRealtimeRevision((currentRevision) => currentRevision + 1);
        void refreshNotifications({ silent: true });
      },
    });

    void realtimeClient.start();

    return () => {
      void realtimeClient.stop();
    };
  }, [notificationUserId, refreshNotifications]);

  useEffect(() => {
    if (!notificationUserId) {
      setState(EMPTY_STATE);
      return undefined;
    }

    removeLegacyNotificationStorage();

    const handleNotificationUpdate = (notifications) => {
      applyNotifications(notifications);
    };
    const unsubscribe = subscribe(handleNotificationUpdate);
    const refreshOnFocus = () => {
      void refreshNotifications();
    };

    void refreshNotifications();
    window.addEventListener("focus", refreshOnFocus);
    const intervalId = window.setInterval
      ? window.setInterval(
          () => void refreshNotifications(),
          REFRESH_INTERVAL_MS
        )
      : null;

    return () => {
      unsubscribe();
      window.removeEventListener("focus", refreshOnFocus);
      if (intervalId !== null && window.clearInterval) {
        window.clearInterval(intervalId);
      }
    };
  }, [applyNotifications, notificationUserId, refreshNotifications]);

  const value = useMemo(
    () => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      isLoading: state.isLoading,
      error: state.error,
      realtimeRevision,
      refreshNotifications,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      markAllAsRead,
      markAsRead,
      fetchNotifications,
      refreshNotifications,
      realtimeRevision,
      state.error,
      state.isLoading,
      state.notifications,
      state.unreadCount,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
