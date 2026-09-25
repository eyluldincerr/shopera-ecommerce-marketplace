import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Users,
  X,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  getAdminAccounts,
} from "../../api/adminAccountService";

import {
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
} from "../../api/adminNotificationService";

import { getAdminOrders } from "../../api/adminOrderService";
import { getAdminProducts } from "../../api/adminProductService";
import { getAdminStoreApplications } from "../../api/adminStoreService";

import { requireAuthenticatedAdmin } from "../../auth/authSession";
import shoperaLogo from "../../assets/branding/shoperalogo.png";
import { logout } from "../../api/authService.js";
import { getAdminSettingsProfile } from "../../api/adminSettingsService.js";

const notificationDateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

const formatPermissionLevel = (
  permissionLevel
) => {
  if (!permissionLevel) {
    return "Administrator";
  }

  return String(permissionLevel)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};

const formatAccountValue = (
  value
) => {
  if (!value) {
    return "Not specified";
  }

  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};

const createInitials = (
  fullName
) => {
  return String(fullName || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (namePart) =>
        namePart[0]
    )
    .join("")
    .toUpperCase();
};

const formatNotificationDate = (
  value
) => {
  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "";
  }

  return notificationDateFormatter.format(
    parsedDate
  );
};

const resolveNotificationDestination = (
  notification
) => {
  const relatedEntityType =
    String(
      notification.relatedEntityType ||
        ""
    ).toUpperCase();

  const notificationType =
    String(
      notification.notificationType ||
        ""
    ).toUpperCase();

  if (
    relatedEntityType === "STORE"
  ) {
    const isApplicationNotification =
      notificationType.includes(
        "APPLICATION"
      ) ||
      notificationType.includes(
        "PENDING"
      );

    return {
      path: isApplicationNotification
        ? "/admin/seller-verification"
        : "/admin/sellers",

      state: {
        selectedStoreId:
          notification.relatedEntityId,

        ...(isApplicationNotification
          ? {
              approvalFilter:
                "PENDING",
            }
          : {}),
      },
    };
  }

  if (
    relatedEntityType ===
      "PRODUCT" ||
    relatedEntityType ===
      "PRODUCT_VARIANT"
  ) {
    return {
      path: "/admin/products",
      state: {
        selectedProductId:
          relatedEntityType ===
          "PRODUCT"
            ? notification.relatedEntityId
            : null,

        selectedVariantId:
          relatedEntityType ===
          "PRODUCT_VARIANT"
            ? notification.relatedEntityId
            : null,
      },
    };
  }

  if (
    relatedEntityType === "ORDER"
  ) {
    return {
      path: "/admin/orders",
      state: {
        selectedOrderId:
          notification.relatedEntityId,
      },
    };
  }

  if (
    relatedEntityType ===
    "USER_ACCOUNT"
  ) {
    return {
      path: "/admin/users",
      state: {
        selectedUserId:
          notification.relatedEntityId,
      },
    };
  }

  return {
    path: "/admin",
    state: null,
  };
};

function AdminHeader({
  isMobileNavigationOpen = false,
  onMobileNavigationToggle,
}) {
  const authenticatedAdmin = requireAuthenticatedAdmin();
  const currentAdminUserId = authenticatedAdmin.userId;
  const navigate = useNavigate();
  const location = useLocation();

  const headerRef =
    useRef(null);

  const profileDrawerRef =
    useRef(null);

  const profileTriggerRef =
    useRef(null);

  const [
    adminProfile,
    setAdminProfile,
  ] = useState(authenticatedAdmin);

  const [
    accounts,
    setAccounts,
  ] = useState([]);

  const [
    stores,
    setStores,
  ] = useState([]);

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    isSearchOpen,
    setIsSearchOpen,
  ] = useState(false);

  const [
    isNotificationsOpen,
    setIsNotificationsOpen,
  ] = useState(false);

  const [
    isProfileOpen,
    setIsProfileOpen,
  ] = useState(false);

  const closeHeaderMenus =
    useCallback(() => {
      setIsSearchOpen(false);
      setIsNotificationsOpen(false);
    }, []);

  const closeProfile = useCallback(
    ({ restoreFocus = false } = {}) => {
      setIsProfileOpen(false);

      if (restoreFocus) {
        window.requestAnimationFrame(() => {
          profileTriggerRef.current?.focus();
        });
      }
    },
    [],
  );

  const loadHeaderData =
    useCallback(async () => {
      try {
        const [
          loadedAccounts,
          loadedStores,
          loadedProducts,
          loadedOrders,
          loadedNotifications,
        ] = await Promise.all([
          getAdminAccounts(),
          getAdminStoreApplications(),
          getAdminProducts(),
          getAdminOrders(),
          getAdminNotifications(
            currentAdminUserId
          ),
        ]);

        setAccounts(
          Array.isArray(
            loadedAccounts
          )
            ? loadedAccounts
            : []
        );

        setStores(
          Array.isArray(
            loadedStores
          )
            ? loadedStores
            : []
        );

        setProducts(
          Array.isArray(
            loadedProducts
          )
            ? loadedProducts
            : []
        );

        setOrders(
          Array.isArray(
            loadedOrders
          )
            ? loadedOrders
            : []
        );

        setNotifications(
          Array.isArray(
            loadedNotifications
          )
            ? loadedNotifications
            : []
        );
      } catch (error) {
        console.error(
          "Header data could not be loaded:",
          error
        );
      }
  }, [currentAdminUserId]);

  const loadDisplayProfile = useCallback(async () => {
    try {
      setAdminProfile(await getAdminSettingsProfile());
    } catch (error) {
      console.error("Header profile could not be loaded:", error);
    }
  }, []);

  useEffect(() => {
    loadHeaderData();
  }, [
    loadHeaderData,
    location.pathname,
  ]);

  useEffect(() => {
    loadDisplayProfile();
  }, [loadDisplayProfile]);

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      if (event.detail) {
        setAdminProfile(event.detail);
        return;
      }
      loadDisplayProfile();
    };

    window.addEventListener("admin-profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("admin-profile-updated", handleProfileUpdated);
  }, [loadDisplayProfile]);

  useEffect(() => {
    window.addEventListener(
      "admin-data-updated",
      loadHeaderData
    );

    window.addEventListener(
      "admin-notifications-updated",
      loadHeaderData
    );

    return () => {
      window.removeEventListener(
        "admin-data-updated",
        loadHeaderData
      );

      window.removeEventListener(
        "admin-notifications-updated",
        loadHeaderData
      );
    };
  }, [loadHeaderData]);

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      const clickedInsideHeader =
        headerRef.current?.contains(
          event.target
        );

      const clickedInsideProfileDrawer =
        profileDrawerRef.current?.contains(
          event.target
        );

      const clickedProfileTrigger =
        profileTriggerRef.current?.contains(
          event.target
        );

      if (
        !clickedInsideHeader &&
        !clickedInsideProfileDrawer
      ) {
        closeHeaderMenus();
      }

      if (
        !clickedProfileTrigger &&
        !clickedInsideProfileDrawer
      ) {
        closeProfile();
      }
    };

    const handleEscapeKey = (
      event
    ) => {
      if (
        event.key === "Escape"
      ) {
        closeHeaderMenus();
        closeProfile({
          restoreFocus:
            isProfileOpen,
        });
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscapeKey
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscapeKey
      );
    };
  }, [
    closeHeaderMenus,
    closeProfile,
    isProfileOpen,
  ]);

  const notificationCount =
    useMemo(() => {
      return notifications.filter(
        (notification) =>
          notification.isRead ===
          false
      ).length;
    }, [notifications]);

  const searchResults =
    useMemo(() => {
      const normalizedSearch =
        searchValue
          .trim()
          .toLowerCase();

      if (
        normalizedSearch.length <
        2
      ) {
        return [];
      }

      const sellerUserIdsWithStores =
        new Set(
          stores.map((store) =>
            Number(
              store.sellerUserId
            )
          )
        );

      const accountResults =
        accounts
          .filter((account) => {
            const isSellerWithStore =
              account.role ===
                "SELLER" &&
              sellerUserIdsWithStores.has(
                Number(
                  account.userId
                )
              );

            if (
              isSellerWithStore
            ) {
              return false;
            }

            return (
              account.fullName
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              account.email
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              String(
                account.userId
              ).includes(
                normalizedSearch
              )
            );
          })
          .map((account) => {
            const badge =
              account.role ===
              "ADMIN"
                ? "Administrator"
                : account.role ===
                    "SELLER"
                  ? "Brand Account"
                  : "Customer";

            return {
              id: `account-${account.userId}`,
              type: "account",
              badge,
              title:
                account.fullName,
              description:
                account.email,
              path: "/admin/users",
              state: {
                selectedUserId:
                  account.userId,
              },
            };
          });

      const storeResults =
        stores
          .filter((store) => {
            return (
              store.storeName
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              store.fullName
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              store.email
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              store.supportEmail
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              String(
                store.storeId
              ).includes(
                normalizedSearch
              ) ||
              String(
                store.sellerUserId
              ).includes(
                normalizedSearch
              )
            );
          })
          .map((store) => {
            const isApproved =
              store.approvalStatus ===
              "APPROVED";

            return {
              id: `store-${store.storeId}`,
              type: "store",

              badge: isApproved
                ? "Approved Brand"
                : `${formatAccountValue(
                    store.approvalStatus
                  )} Brand`,

              title:
                store.storeName,

              description:
                `${store.fullName} · ${store.email}`,

              path: isApproved
                ? "/admin/sellers"
                : "/admin/seller-verification",

              state: {
                selectedStoreId:
                  store.storeId,
              },
            };
          });

      const productResults =
        products
          .filter((product) => {
            return (
              product.productName
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              product.brand
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              product.modelNumber
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              product.categoryName
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              product.sellerName
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              String(
                product.productId
              ).includes(
                normalizedSearch
              )
            );
          })
          .map((product) => ({
            id: `product-${product.productId}`,
            type: "product",
            badge: "Product",
            title:
              product.productName,
            description:
              `${product.categoryName} · ${product.sellerName}`,
            path:
              "/admin/products",
            state: {
              selectedProductId:
                product.productId,
            },
          }));

      const orderResults =
        orders
          .filter((order) => {
            return (
              String(
                order.orderId
              ).includes(
                normalizedSearch
              ) ||
              order.orderNumber
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              order.buyerName
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              order.buyerEmail
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                )
            );
          })
          .map((order) => ({
            id: `order-${order.orderId}`,
            type: "order",
            badge: "Order",

            title:
              order.orderNumber
                ? `Order ${order.orderNumber}`
                : `Order #${order.orderId}`,

            description:
              `${order.buyerName} · ${order.orderStatus}`,

            path:
              "/admin/orders",

            state: {
              selectedOrderId:
                order.orderId,
            },
          }));

      return [
        ...accountResults,
        ...storeResults,
        ...productResults,
        ...orderResults,
      ].slice(0, 8);
    }, [
      accounts,
      stores,
      products,
      orders,
      searchValue,
    ]);

  const profileDisplayName =
    adminProfile.fullName?.trim() ||
    authenticatedAdmin.email;

  const firstName =
    adminProfile.fullName
      ?.trim()
      .split(" ")
      .filter(Boolean)[0] ||
    authenticatedAdmin.email;

  const adminInitials =
    createInitials(
      profileDisplayName
    );

  const profileRole =
    adminProfile.role
      ? formatAccountValue(
          adminProfile.role
        )
      : "Administrator";

  const hasProfileInformationRows =
    Boolean(
      adminProfile.userId ||
      adminProfile.phoneNumber ||
      adminProfile.permissionLevel
    );

  const hasOptionalProfileDetails =
    Boolean(
      hasProfileInformationRows ||
      adminProfile.email ||
      adminProfile.accountStatus
    );

  const openSearch = () => {
    setIsSearchOpen(true);
    setIsNotificationsOpen(false);
  };

  const submitSearch = (
    event
  ) => {
    event.preventDefault();

    if (
      searchResults.length >
      0
    ) {
      navigate(
        searchResults[0].path,
        {
          state:
            searchResults[0]
              .state || null,
        }
      );

      setSearchValue("");
      setIsSearchOpen(false);
    }
  };

  const selectSearchResult = (
    result
  ) => {
    navigate(result.path, {
      state:
        result.state || null,
    });

    setSearchValue("");
    setIsSearchOpen(false);
  };

  const toggleNotifications =
    async () => {
      await loadHeaderData();

      setIsNotificationsOpen(
        (currentValue) =>
          !currentValue
      );

      setIsSearchOpen(false);
    };

  const openNotification =
    async (notification) => {
      try {
        if (
          !notification.isRead
        ) {
          const updatedNotification =
            await markAdminNotificationAsRead(
              notification.notificationId,
              currentAdminUserId
            );

          setNotifications(
            (
              currentNotifications
            ) =>
              currentNotifications.map(
                (
                  currentNotification
                ) =>
                  currentNotification.notificationId ===
                  updatedNotification.notificationId
                    ? updatedNotification
                    : currentNotification
              )
          );
        }
      } catch (error) {
        console.error(
          "Notification could not be marked as read:",
          error
        );
      }

      const destination =
        resolveNotificationDestination(
          notification
        );

      navigate(
        destination.path,
        {
          state:
            destination.state,
        }
      );

      setIsNotificationsOpen(
        false
      );
    };

  const handleMarkAllAsRead =
    async () => {
      try {
        await markAllAdminNotificationsAsRead(
          currentAdminUserId
        );

        const updatedNotifications =
          await getAdminNotifications(
            currentAdminUserId
          );

        setNotifications(
          updatedNotifications
        );
      } catch (error) {
        console.error(
          "Notifications could not be marked as read:",
          error
        );
      }
    };

  const toggleProfile = () => {
    setIsProfileOpen((currentValue) => {
      if (!currentValue) {
        closeHeaderMenus();
      }

      return !currentValue;
    });
  };

  const navigateFromProfile = (
    path
  ) => {
    navigate(path);
    setIsProfileOpen(false);
  };

  const renderResultIcon = (
    resultType
  ) => {
    if (
      resultType === "store"
    ) {
      return (
        <Store size={17} />
      );
    }

    if (
      resultType === "product"
    ) {
      return (
        <Package size={17} />
      );
    }

    if (
      resultType === "order"
    ) {
      return (
        <ShoppingBag
          size={17}
        />
      );
    }

    return (
      <Users size={17} />
    );
  };

  const renderNotificationIcon =
    (notification) => {
      const relatedEntityType =
        String(
          notification.relatedEntityType ||
            ""
        ).toUpperCase();

      if (
        relatedEntityType ===
        "STORE"
      ) {
        return (
          <Store size={18} />
        );
      }

      if (
        relatedEntityType ===
          "PRODUCT" ||
        relatedEntityType ===
          "PRODUCT_VARIANT"
      ) {
        return (
          <Package size={18} />
        );
      }

      if (
        relatedEntityType ===
        "ORDER"
      ) {
        return (
          <ShoppingBag
            size={18}
          />
        );
      }

      if (
        relatedEntityType ===
        "USER_ACCOUNT"
      ) {
        return (
          <Users size={18} />
        );
      }

      return (
        <AlertTriangle
          size={18}
        />
      );
    };

  return (
    <>
      <header
        className="shopera-admin-header"
        ref={headerRef}
      >
        <button
          type="button"
          className="admin-mobile-menu-button"
          aria-label="Open administration navigation"
          aria-expanded={isMobileNavigationOpen}
          onClick={onMobileNavigationToggle}
        >
          <Menu size={22} />
        </button>

        <button
          type="button"
          className="admin-header-brand"
          onClick={() =>
            navigate("/admin")
          }
        >
          <img
            src={shoperaLogo}
            alt="Shopera"
            draggable="false"
          />
        </button>

        <form
          className="admin-header-search"
          onSubmit={
            submitSearch
          }
        >
          <input
            type="search"
            value={searchValue}
            placeholder="Search for users, brands, products, orders..."
            onFocus={openSearch}
            onChange={(event) => {
              setSearchValue(
                event.target.value
              );

              openSearch();
            }}
          />

          <button
            type="submit"
            aria-label="Search"
          >
            <Search size={21} />
          </button>

          {isSearchOpen &&
            searchValue.trim() !==
              "" && (
              <div className="admin-header-search-results">
                {searchValue.trim()
                  .length < 2 ? (
                  <p className="admin-header-dropdown-message">
                    Type at least 2
                    characters to search.
                  </p>
                ) : searchResults.length >
                  0 ? (
                  searchResults.map(
                    (result) => (
                      <button
                        type="button"
                        className="admin-header-search-result"
                        key={
                          result.id
                        }
                        onClick={() =>
                          selectSearchResult(
                            result
                          )
                        }
                      >
                        <div className="admin-header-search-result-icon">
                          {renderResultIcon(
                            result.type
                          )}
                        </div>

                        <div>
                          <strong>
                            {
                              result.title
                            }
                          </strong>

                          <span>
                            {
                              result.description
                            }
                          </span>
                        </div>

                        <small>
                          {
                            result.badge
                          }
                        </small>
                      </button>
                    )
                  )
                ) : (
                  <p className="admin-header-dropdown-message">
                    No matching users,
                    brands, products or
                    orders were found.
                  </p>
                )}
              </div>
            )}
        </form>

        <div className="admin-header-actions">
          <div className="admin-header-action-wrapper">
            <button
              type="button"
              className="admin-header-icon admin-notification"
              aria-label="Notifications"
              aria-expanded={
                isNotificationsOpen
              }
              onClick={
                toggleNotifications
              }
            >
              <Bell size={20} />

              {notificationCount >
                0 && (
                <span>
                  {notificationCount >
                  99
                    ? "99+"
                    : notificationCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="admin-header-dropdown admin-notifications-dropdown">
                <div className="admin-notifications-heading">
                  <div>
                    <strong>
                      Notifications
                    </strong>

                    <span>
                      {
                        notificationCount
                      }{" "}
                      unread
                      notification(s)
                    </span>
                  </div>

                  {notificationCount >
                    0 && (
                    <button
                      type="button"
                      className="admin-notifications-mark-all-button"
                      onClick={
                        handleMarkAllAsRead
                      }
                    >
                      <CheckCheck
                        size={15}
                      />
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="admin-notifications-list">
                  {notifications.length >
                  0 ? (
                    notifications.map(
                      (
                        notification
                      ) => (
                        <button
                          type="button"
                          className={
                            notification.isRead
                              ? "admin-notification-item admin-notification-item-read"
                              : "admin-notification-item admin-notification-item-unread"
                          }
                          key={
                            notification.notificationId
                          }
                          onClick={() =>
                            openNotification(
                              notification
                            )
                          }
                        >
                          <div className="admin-notification-item-icon">
                            {renderNotificationIcon(
                              notification
                            )}
                          </div>

                          <div>
                            <strong>
                              {
                                notification.title
                              }
                            </strong>

                            <span>
                              {
                                notification.message
                              }
                            </span>
                          </div>

                          <small>
                            {formatNotificationDate(
                              notification.createdDate
                            )}
                          </small>
                        </button>
                      )
                    )
                  ) : (
                    <div className="admin-notifications-empty">
                      <Check
                        size={22}
                      />

                      <strong>
                        Everything is clear
                      </strong>

                      <span>
                        There are no
                        notifications for
                        this administrator.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            ref={profileTriggerRef}
            type="button"
            className="admin-profile"
            aria-label={
              isProfileOpen
                ? "Close administrator profile"
                : "Open administrator profile"
            }
            aria-expanded={
              isProfileOpen
            }
            aria-controls="admin-profile-drawer"
            onClick={toggleProfile}
          >
            <div className="admin-profile-avatar">
              {adminInitials}
            </div>

            <div className="admin-profile-text">
              <strong>
                Hello, {firstName}
              </strong>

              <small>
                {formatPermissionLevel(
                  adminProfile.permissionLevel
                )}
              </small>
            </div>

            <ChevronDown
              size={17}
            />
          </button>
        </div>
      </header>

      {isProfileOpen && (
        <div
          className="admin-profile-drawer-backdrop"
          role="presentation"
        >
          <aside
            id="admin-profile-drawer"
            className="admin-profile-drawer"
            ref={
              profileDrawerRef
            }
            role="dialog"
            aria-modal="true"
            aria-label="Administrator profile"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-profile-drawer-close"
              aria-label="Close profile"
              onClick={() =>
                closeProfile({
                  restoreFocus: true,
                })
              }
            >
              <X size={20} />
            </button>

            <div className="admin-profile-drawer-header">
              <div className="admin-profile-drawer-avatar">
                {adminInitials}
              </div>

              <div>
                <h2>
                  {profileDisplayName}
                </h2>

                {adminProfile.email && (
                  <p>{adminProfile.email}</p>
                )}
              </div>
            </div>

            <div className="admin-profile-drawer-status">
              <span>{profileRole}</span>

              {adminProfile.accountStatus && (
                <span>
                  {formatAccountValue(
                    adminProfile.accountStatus
                  )}
                </span>
              )}
            </div>

            {hasProfileInformationRows && (
              <div className="admin-profile-drawer-information">
                {adminProfile.userId && (
                  <div>
                    <span>User ID</span>
                    <strong>#{adminProfile.userId}</strong>
                  </div>
                )}

                {adminProfile.permissionLevel && (
                  <div>
                    <span>Permission Level</span>
                    <strong>
                      {formatPermissionLevel(
                        adminProfile.permissionLevel
                      )}
                    </strong>
                  </div>
                )}

                {adminProfile.phoneNumber && (
                  <div>
                    <span>Phone Number</span>
                    <strong>{adminProfile.phoneNumber}</strong>
                  </div>
                )}
              </div>
            )}

            {!hasOptionalProfileDetails && (
              <p className="admin-profile-drawer-empty">
                Profile details will appear when account information is
                available.
              </p>
            )}

            <div className="admin-profile-drawer-actions">
              <button
                type="button"
                onClick={() =>
                  navigateFromProfile(
                    "/admin/settings"
                  )
                }
              >
                <Settings
                  size={17}
                />
                Account Settings
              </button>
              <button type="button" onClick={() => { logout(); navigate("/login", { replace: true }); }}>
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export default AdminHeader;
