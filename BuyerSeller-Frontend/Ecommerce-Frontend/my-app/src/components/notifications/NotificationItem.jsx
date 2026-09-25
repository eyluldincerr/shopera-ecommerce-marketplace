import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  getNotificationActionKey,
  getNotificationActionLabel,
  getNotificationDestination,
} from "../../services/notificationRouteService";
import { getNotificationPresentation } from "../../services/notificationPresentationService";

const formatNotificationDate = (createdDate, locale) => {
  const date = new Date(createdDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

function NotificationItem({
  notification,
  onRead,
  onNavigate = () => {},
  variant = "panel",
  role,
}) {
  const { t, i18n } = useTranslation();
  const destination = getNotificationDestination(notification, role);
  const presentation = getNotificationPresentation(notification.notificationType);
  const interpolationValues = {
    couponCode: notification.relatedEntityId,
    entityId: notification.relatedEntityId,
    orderNumber: notification.relatedEntityId,
  };
  const title = presentation.titleKey
    ? t(presentation.titleKey, {
        ...interpolationValues,
        defaultValue:
          notification.title || t("buyer.notifications.titles.system"),
      })
    : notification.title || t("buyer.notifications.titles.system");
  const message = presentation.messageKey
    ? t(presentation.messageKey, {
        ...interpolationValues,
        defaultValue:
          notification.message || t("buyer.notifications.messages.system"),
      })
    : notification.message || t("buyer.notifications.messages.system");
  const actionLabel = t(getNotificationActionKey(notification, role), {
    defaultValue: getNotificationActionLabel(notification, role),
  });
  const className = `notification-item ${
    notification.isRead ? "" : "notification-item--unread"
  } notification-item--${presentation.tone} notification-item--${variant}`;

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.notificationId);
    }

    if (destination) {
      onNavigate();
    }
  };

  const content = (
    <>
      <span className="notification-item__icon" aria-hidden="true">
        {presentation.icon}
      </span>
      <span className="notification-item__content">
        <strong className="notification-item__title">{title}</strong>
        <span className="notification-item__message">{message}</span>
        {destination && (
          <span className="notification-item__action">
            {actionLabel}
          </span>
        )}
      </span>
      <time className="notification-item__time" dateTime={notification.createdDate}>
        {formatNotificationDate(
          notification.createdDate,
          i18n.resolvedLanguage === "tr" ? "tr-TR" : "en-US"
        )}
      </time>
    </>
  );

  if (destination) {
    return (
      <Link to={destination} className={className} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {content}
    </button>
  );
}

export default NotificationItem;
