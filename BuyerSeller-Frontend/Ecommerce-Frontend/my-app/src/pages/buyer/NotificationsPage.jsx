import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";
import NotificationItem from "../../components/notifications/NotificationItem";
import useNotifications from "../../hooks/useNotifications";

const PAGE_SIZE = 6;
const BASE_FILTERS = ["All", "Unread"];
const FILTER_TRANSLATION_KEYS = {
  Account: "buyer.notifications.categories.account",
  All: "buyer.notifications.filters.all",
  Order: "buyer.notifications.categories.order",
  Promotion: "buyer.notifications.categories.promotion",
  System: "buyer.notifications.categories.system",
  Unread: "buyer.notifications.filters.unread",
  Wishlist: "buyer.notifications.categories.wishlist",
};

const getDateSection = (createdDate) => {
  const date = new Date(createdDate);

  if (Number.isNaN(date.getTime())) {
    return "Earlier";
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  if (date >= startOfToday) {
    return "Today";
  }

  if (date >= startOfYesterday) {
    return "Yesterday";
  }

  return "Earlier";
};

const groupNotifications = (notifications) => {
  return notifications.reduce(
    (groups, notification) => {
      const section = getDateSection(notification.createdDate);

      return {
        ...groups,
        [section]: [...groups[section], notification],
      };
    },
    {
      Today: [],
      Yesterday: [],
      Earlier: [],
    }
  );
};

const getFilterOptions = (categories) => [
  ...BASE_FILTERS,
  ...categories.map((category) => category.category),
];

const getFilterOptionsFromCounts = (filterCounts = {}, categories = []) => {
  const categoryNames = categories.map((category) => category.category);

  return [
    ...BASE_FILTERS,
    ...categoryNames.filter((category) => filterCounts[category] > 0),
  ];
};

function NotificationsPage() {
  const { t } = useTranslation();
  const {
    unreadCount,
    realtimeRevision,
    fetchNotifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [activeFilter, setActiveFilter] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [filterCounts, setFilterCounts] = useState({ All: 0, Unread: 0 });
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      const isFirstPage = nextPage === 1;

      if (isFirstPage) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError("");

      try {
        const response = await fetchNotifications({
          page: nextPage,
          pageSize: PAGE_SIZE,
          unreadOnly: activeFilter === "Unread",
          category: BASE_FILTERS.includes(activeFilter) ? "" : activeFilter,
        });

        setNotifications((currentNotifications) =>
          append
            ? [...currentNotifications, ...response.items]
            : response.items
        );
        setFilterCounts(response.filterCounts);
        setCategories(response.categories);
        setPage(response.page);
        setHasMore(response.hasMore);
      } catch (loadError) {
        setError(
          loadError?.message || t("buyer.notifications.loadErrorDescription")
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [activeFilter, fetchNotifications, t]
  );

  useEffect(() => {
    loadNotifications({ nextPage: 1 });
  }, [loadNotifications]);

  useEffect(() => {
    if (realtimeRevision > 0) {
      void loadNotifications({ nextPage: 1 });
    }
  }, [loadNotifications, realtimeRevision]);

  const filterOptions = useMemo(() => {
    const options = getFilterOptionsFromCounts(filterCounts, categories);

    return options.length > BASE_FILTERS.length
      ? options
      : getFilterOptions(categories);
  }, [categories, filterCounts]);

  const groupedNotifications = useMemo(
    () => groupNotifications(notifications),
    [notifications]
  );

  const unreadSummary =
    unreadCount > 0
      ? t("buyer.notifications.unread", { count: unreadCount })
      : t("buyer.notifications.caughtUp");
  const isInboxEmpty = !isLoading && !error && filterCounts.All === 0;
  const isFilteredEmpty =
    !isLoading && !error && filterCounts.All > 0 && notifications.length === 0;

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);

    setNotifications((currentNotifications) =>
      activeFilter === "Unread"
        ? currentNotifications.filter(
            (notification) =>
              String(notification.notificationId) !== String(notificationId)
          )
        : currentNotifications.map((notification) =>
            String(notification.notificationId) === String(notificationId)
              ? {
                  ...notification,
                  isRead: true,
                  readDate: notification.readDate || new Date().toISOString(),
                }
              : notification
          )
    );
    await loadNotifications({ nextPage: 1 });
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);

    try {
      await markAllAsRead();
      await refreshNotifications();
      await loadNotifications({ nextPage: 1 });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleLoadMore = () => {
    loadNotifications({ nextPage: page + 1, append: true });
  };

  return (
    <BuyerAccountLayout
      activePath="/notifications"
      pageClassName="notifications-page"
    >
      <section className="notifications-page__content">
        <div className="notifications-page__header">
          <div>
            <h1>{t("buyer.notifications.title")}</h1>
            <p>{unreadSummary}</p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
          >
            {isMarkingAll
              ? t("buyer.notifications.marking")
              : t("buyer.notifications.markAll")}
          </button>
        </div>

        <div
          className="notifications-page__filters"
          aria-label={t("buyer.notifications.filterLabel")}
        >
          {filterOptions.map((filter) => (
            <button
              type="button"
              key={filter}
              className={`notifications-filter ${
                activeFilter === filter ? "is-active" : ""
              }`}
              onClick={() => setActiveFilter(filter)}
            >
              <span>
                {t(FILTER_TRANSLATION_KEYS[filter], {
                  defaultValue: filter,
                })}
              </span>
              <strong>{filterCounts[filter] || 0}</strong>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="notifications-page__skeleton" role="status">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {!isLoading && error && (
          <section className="notifications-page__state" role="alert">
            <h2>{t("buyer.notifications.loadError")}</h2>
            <p>{error}</p>
            <button type="button" onClick={() => loadNotifications({ nextPage: 1 })}>
              {t("common.retry")}
            </button>
          </section>
        )}

        {isInboxEmpty && (
          <section className="notifications-page__state">
            <div aria-hidden="true">!</div>
            <h2>{t("buyer.notifications.empty")}</h2>
            <p>{t("buyer.notifications.emptyDescription")}</p>
          </section>
        )}

        {isFilteredEmpty && (
          <section className="notifications-page__state">
            <h2>{t("buyer.notifications.noMatches")}</h2>
            <p>{t("buyer.notifications.noMatchesDescription")}</p>
          </section>
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <div className="notifications-page__groups">
            {Object.entries(groupedNotifications).map(([section, items]) =>
              items.length > 0 ? (
                <section className="notifications-page__group" key={section}>
                  <h2>
                    {t(`buyer.notifications.dateSections.${section.toLowerCase()}`)}
                  </h2>
                  <div className="notifications-page__list">
                    {items.map((notification) => (
                      <NotificationItem
                        key={notification.notificationId}
                        notification={notification}
                        onRead={handleMarkAsRead}
                        variant="page"
                      />
                    ))}
                  </div>
                </section>
              ) : null
            )}

            <div className="notifications-page__pagination">
              {hasMore ? (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore
                    ? t("common.loading")
                    : t("buyer.notifications.loadMore")}
                </button>
              ) : (
                <span className="notifications-page__end">
                  {t("buyer.notifications.end")}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </BuyerAccountLayout>
  );
}

export default NotificationsPage;
