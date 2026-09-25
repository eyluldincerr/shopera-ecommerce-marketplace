import { useState } from "react";
import { useTranslation } from "react-i18next";

import useNotifications from "../../hooks/useNotifications";
import useAuthSession from "../../hooks/useAuthSession.js";
import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";
import NotificationPanel from "./NotificationPanel";

const formatUnreadCount = (unreadCount) => (unreadCount > 99 ? "99+" : unreadCount);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

function NotificationBell() {
  const { t } = useTranslation();
  const authUser = useAuthSession() || {};
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const notificationOverlay = useOverlayAccessibility({
    isOpen,
    onClose: () => setIsOpen(false),
  });

  const handleToggle = () => {
    setIsOpen((currentValue) => !currentValue);
  };

  return (
    <div className="notification-bell">
      <button
        type="button"
        className={`navbar__icon-button notification-bell__button ${
          isOpen ? "notification-bell__button--active" : ""
        }`}
        aria-label={t("buyer.notifications.bellLabel", {
          count: unreadCount,
        })}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {formatUnreadCount(unreadCount)}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          error={error}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onRetry={refreshNotifications}
          onNavigate={() => setIsOpen(false)}
          onClose={() => setIsOpen(false)}
          panelRef={notificationOverlay.overlayRef}
          initialFocusRef={notificationOverlay.initialFocusRef}
          role={authUser.role}
        />
      )}
    </div>
  );
}

export default NotificationBell;
