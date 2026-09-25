import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getSellerStoreProfile,
  subscribeSellerData,
} from "../../services/sellerService";
import { ROUTES } from "../../routes/routePolicy.js";

function SellerSidebar({
  isMobile = false,
  isOpen = false,
  onClose,
  initialFocusRef,
}) {
  const { t } = useTranslation();
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    const loadSidebar = async () => {
      const profileResult =
        await getSellerStoreProfile().catch(() => null);
      setStoreName(profileResult?.store?.storeName || t("sidebar.noStore"));
    };

    void loadSidebar();
    return subscribeSellerData(() => void loadSidebar());
  }, [t]);

  const menuItems = useMemo(
    () => [
      ["dashboard", ROUTES.SELLER_DASHBOARD, "D"],
      ["products", ROUTES.SELLER_PRODUCTS, "P"],
      ["inventory", ROUTES.SELLER_INVENTORY, "I"],
      ["orders", ROUTES.SELLER_ORDERS, "O"],
      ["analytics", ROUTES.SELLER_ANALYTICS, "A"],
      ["storeProfile", ROUTES.SELLER_STORE_PROFILE, "S"],
      ["storeMedia", ROUTES.SELLER_STORE_MEDIA, "V"],
      ["accountProfile", ROUTES.ACCOUNT_PROFILE, "U"],
      ["notifications", ROUTES.SELLER_NOTIFICATIONS, "N"],
    ],
    []
  );

  return (
    <aside
      className={`seller-sidebar ${isOpen ? "seller-sidebar--open" : ""}`}
      role={isMobile ? "dialog" : undefined}
      aria-modal={isMobile && isOpen ? "true" : undefined}
      aria-labelledby={isMobile ? "seller-navigation-title" : undefined}
      aria-label={isMobile ? undefined : t("sidebar.sellerNavigation")}
      inert={isMobile && !isOpen}
      tabIndex={isMobile ? -1 : undefined}
    >
      <h2 id="seller-navigation-title" className="visually-hidden">
        {t("sidebar.sellerNavigation")}
      </h2>
      {isMobile && (
        <button
          ref={initialFocusRef}
          type="button"
          className="seller-sidebar__close-button"
          onClick={onClose}
          aria-label={t("sidebar.closeNavigation")}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
      <div className="seller-sidebar__store-card">
        <div className="seller-sidebar__store-icon" aria-hidden="true">S</div>
        <div className="seller-sidebar__store-info">
          <h2 className="seller-sidebar__store-name">{storeName}</h2>
          <p className="seller-sidebar__store-role">
            {t("sidebar.sellerAccount")}
          </p>
        </div>
      </div>

      <nav className="seller-sidebar__navigation">
        {menuItems.map(([key, path, icon]) => (
          <NavLink
            key={key}
            to={path}
            onClick={isMobile ? onClose : undefined}
            className={({ isActive }) =>
              `seller-sidebar__link ${
                isActive ? "seller-sidebar__link--active" : ""
              }`
            }
          >
            <span className="seller-sidebar__link-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="seller-sidebar__link-label">
              {t(`sidebar.${key}`)}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default SellerSidebar;
