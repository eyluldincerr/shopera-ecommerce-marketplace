import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import NotificationItem from "./NotificationItem";
import { ROUTES } from "../../routes/routePolicy.js";

function NotificationPanel({
  notifications,
  unreadCount,
  isLoading,
  error,
  onMarkAsRead,
  onMarkAllAsRead,
  onRetry,
  onNavigate,
  onClose,
  panelRef,
  initialFocusRef,
  role,
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const viewAllPath =
    role === "Seller" ? ROUTES.SELLER_NOTIFICATIONS : ROUTES.NOTIFICATIONS;
  const subtitle =
    unreadCount > 0
      ? t("buyer.notifications.unread", { count: unreadCount })
      : t("buyer.notifications.caughtUp");

  return (
    <div
      ref={panelRef}
      className="notification-dropdown"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex="-1"
    >
      <div className="notification-dropdown__header">
        <div>
          <strong id={titleId}>{t("buyer.notifications.title")}</strong>
          <span id={descriptionId}>{subtitle}</span>
        </div>
        <div className="notification-dropdown__header-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="notification-dropdown__mark-all"
              onClick={onMarkAllAsRead}
              disabled={isLoading}
            >
              {t("buyer.notifications.markAll")}
            </button>
          )}
          <button
            ref={initialFocusRef}
            type="button"
            className="notification-dropdown__close"
            onClick={onClose}
            aria-label={t("buyer.notifications.close")}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="notification-dropdown__state" role="status">
          {t("buyer.notifications.loading")}
        </div>
      )}

      {!isLoading && error && (
        <div className="notification-dropdown__state" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {!isLoading && !error && notifications.length === 0 && (
        <div className="notification-dropdown__state">
          {t("buyer.notifications.dropdownEmpty")}
        </div>
      )}

      {!isLoading && !error && notifications.length > 0 && (
        <div className="notification-list notification-dropdown__list">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.notificationId}
              notification={notification}
              onRead={onMarkAsRead}
              onNavigate={onNavigate}
              role={role}
            />
          ))}
        </div>
      )}

      <div className="notification-dropdown__footer">
        <Link to={viewAllPath} onClick={onNavigate}>
          {t("buyer.notifications.viewAll")}
        </Link>
      </div>
    </div>
  );
}

export default NotificationPanel;
