// src/pages/seller/SellerNotificationsPage.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  getSellerNotificationsData,
  markAllSellerNotificationsAsRead,
  getSellerNotificationPresentation,
  getSellerNotificationFilters,
  markSellerNotificationAsRead,
} from "../../services/sellerService";
import SellerAsyncState from "../../components/seller/SellerAsyncState";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";
import useNotifications from "../../hooks/useNotifications.js";

const REFRESH_INTERVAL_MS = 30000;

const formatNotificationTime = (createdDate, language) => {
  const date = new Date(createdDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    language === "tr" ? "tr-TR" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
};

function SellerNotificationsContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { realtimeRevision } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [filters, setFilters] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [actionError, setActionError] = useState("");

  const loadNotifications = useCallback(
    async (retry = false, silent = false) => {
      try {
        setLoadError("");
        setIsRetrying(retry);
        if (!silent) {
          setIsLoading(true);
        }

        const [data, filterData] = await Promise.all([
          getSellerNotificationsData(),
          getSellerNotificationFilters(),
        ]);

        setNotifications(data);
        setFilters(filterData);
      } catch (error) {
        setLoadError(error.message || t("notifications.loadError"));
      } finally {
        setIsLoading(false);
        setIsRetrying(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadNotifications();

    const refreshOnFocus = () => {
      void loadNotifications(false, true);
    };
    const intervalId = window.setInterval(
      () => void loadNotifications(false, true),
      REFRESH_INTERVAL_MS
    );

    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (realtimeRevision > 0) {
      void loadNotifications(false, true);
    }
  }, [loadNotifications, realtimeRevision]);

  const filteredNotifications = useMemo(
    () =>
      selectedFilter === "all"
        ? notifications
        : notifications.filter(
            (notification) => notification.type === selectedFilter
          ),
    [notifications, selectedFilter]
  );

  if (isRetrying) {
    return <SellerAsyncState status="retrying" />;
  }
  if (loadError) {
    return (
      <SellerAsyncState
        status="error"
        error={loadError}
        onRetry={() => loadNotifications(true)}
      />
    );
  }
  if (isLoading) {
    return <SellerAsyncState status="loading" />;
  }

  return (
    <div className="seller-notifications-content">
      <section className="seller-notifications-heading">
        <div>
          <h1>{t("notifications.title")}</h1>
          <p>{t("notifications.description")}</p>
        </div>

        <button
          type="button"
          className="seller-notifications-read-button"
          onClick={async () => {
            try {
              setSubmittingId("all");
              setActionError("");
              await markAllSellerNotificationsAsRead();
              await loadNotifications(false, true);
            } catch (error) {
              setActionError(
                error.message || t("common.errorDescription")
              );
            } finally {
              setSubmittingId(null);
            }
          }}
          disabled={submittingId !== null}
        >
          {t("notifications.markAllAsRead")}
        </button>
        {actionError && <p role="alert">{actionError}</p>}
      </section>

      <section className="seller-notifications-filters">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`seller-notifications-filter ${
              selectedFilter === filter.id
                ? "seller-notifications-filter--active"
                : ""
            }`}
            onClick={() => setSelectedFilter(filter.id)}
          >
            {t(filter.labelKey)}
          </button>
        ))}
      </section>

      <section className="seller-notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const presentation = getSellerNotificationPresentation(
              notification
            );
            return (
              <article
                key={notification.notificationId}
                className="seller-notification-card"
              >
                <div className="seller-notification-card__left">
                  <div
                    className={`seller-notification-card__icon seller-notification-card__icon--${presentation.category}`}
                  >
                    {presentation.icon}
                  </div>

                  <div className="seller-notification-card__content">
                    <div className="seller-notification-card__top">
                      <h3>{notification.title}</h3>
                      {!notification.isRead && (
                        <span className="seller-notification-card__unread" />
                      )}
                    </div>

                    <p>{notification.message}</p>
                    <span>
                      {formatNotificationTime(
                        notification.createdDate,
                        i18n.resolvedLanguage
                      )}
                    </span>
                  </div>
                </div>

                {presentation.route && (
                  <button
                    type="button"
                    className="seller-notification-card__button"
                    onClick={() => navigate(presentation.route)}
                  >
                    {t(presentation.actionLabelKey)}
                  </button>
                )}

                {!notification.isRead && (
                  <button
                    type="button"
                    className="seller-notification-card__button"
                    disabled={submittingId !== null}
                    onClick={async () => {
                      setSubmittingId(notification.notificationId);
                      setActionError("");
                      try {
                        await markSellerNotificationAsRead(
                          notification.notificationId
                        );
                        await loadNotifications(false, true);
                      } catch (error) {
                        setActionError(
                          error.message || t("common.errorDescription")
                        );
                      } finally {
                        setSubmittingId(null);
                      }
                    }}
                  >
                    {t("notifications.markAsRead")}
                  </button>
                )}
              </article>
            );
          })
        ) : (
          <div className="seller-notifications-empty">
            <h2>{t("notifications.emptyTitle")}</h2>
            <p>{t("notifications.emptyDescription")}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function SellerNotificationsPage() {
  return (
    <SellerPageShell>
      <SellerNotificationsContent />
    </SellerPageShell>
  );
}

export default SellerNotificationsPage;
