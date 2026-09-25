// src/components/layout/Navbar.jsx

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import brandLogo from "../../assets/logo.png";
import NotificationBell from "../notifications/NotificationBell";
import useCart from "../../hooks/useCart";
import useAuthSession from "../../hooks/useAuthSession.js";
import useNotifications from "../../hooks/useNotifications";
import useWishlist from "../../hooks/useWishlist";
import { logoutUser } from "../../services/authService";
import { getNavbarStorePreview } from "../../services/storeService.js";
import {
  getAccountActionRoute,
  getPostLogoutRoute,
  getStoreRoute,
  ROUTES,
} from "../../routes/routePolicy.js";

const accountMenuIconPaths = {
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  address: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  payment: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  orders: (
    <>
      <path d="M6 8h12l1 13H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  favourites: (
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
  ),
  coupons: (
    <>
      <path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z" />
      <path d="M12 8v2m0 4v2" />
    </>
  ),
  support: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.35-1 1-1 1.7" />
      <path d="M12 17h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    </>
  ),
};

const AccountMenuIcon = ({ name }) => (
  <svg className="navbar__account-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {accountMenuIconPaths[name]}
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="m7 10 5 5 5-5" />
  </svg>
);

const buyerAccountLinks = [
  { to: "/account/profile", labelKey: "buyer.nav.personalInformation", icon: "user" },
  { to: "/account/addresses", labelKey: "buyer.nav.addresses", icon: "address" },
  { to: "/account/payment-methods", labelKey: "buyer.nav.paymentMethods", icon: "payment" },
  { to: "/orders", labelKey: "buyer.nav.orders", icon: "orders" },
  {
    to: "/notifications",
    labelKey: "buyer.nav.notifications",
    icon: "notifications",
    showUnread: true,
  },
  { to: "/wishlist", labelKey: "buyer.nav.favourites", icon: "favourites" },
  { to: "/account/coupons", labelKey: "buyer.nav.coupons", icon: "coupons" },
  { to: "/account/support", labelKey: "buyer.nav.support", icon: "support" },
];

const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
  </svg>
);

const CartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="9" cy="20" r="1" />
    <circle cx="19" cy="20" r="1" />
    <path d="M3 4h2l2.4 10.3a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
  </svg>
);

const StorefrontIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M4 10v10h16V10" />
    <path d="M3 10l2-6h14l2 6" />
    <path d="M8 20v-6h8v6" />
    <path d="M3 10a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2" />
  </svg>
);

function NavbarStoreAvatar({ store }) {
  const [isBroken, setIsBroken] = useState(false);
  const initial = store.storeName?.trim().charAt(0).toUpperCase() || "S";

  return (
    <span className="navbar__store-avatar" aria-hidden="true">
      {store.storeLogoUrl && !isBroken ? (
        <img src={store.storeLogoUrl} alt="" onError={() => setIsBroken(true)} />
      ) : (
        initial
      )}
    </span>
  );
}

function Navbar({ onHomeClick }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { cartCount, isCartOpen, openCart } = useCart();
  const { unreadCount } = useNotifications();
  const { wishlistCount } = useWishlist();
  const authUser = useAuthSession() || {};
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isStoresOpen, setIsStoresOpen] = useState(false);
  const [navbarStores, setNavbarStores] = useState([]);
  const [navbarStoreCount, setNavbarStoreCount] = useState(0);
  const [storesLoading, setStoresLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const accountMenuRef = useRef(null);
  const storesMenuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountOpen(false);
      }

      if (!storesMenuRef.current?.contains(event.target)) {
        setIsStoresOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const isLoggedIn = Boolean(authUser.token);
  const isBuyer = authUser.role === "Buyer";
  const isSeller = authUser.role === "Seller";
  const accountName =
    authUser.fullName ||
    (isSeller ? t("navbar.sellerAccount") : t("navbar.myAccount"));
  const accountInitial = accountName.charAt(0).toUpperCase();

  useEffect(() => {
    if (isSeller) {
      setNavbarStores([]);
      setNavbarStoreCount(0);
      return undefined;
    }

    let isMounted = true;

    const loadStores = async () => {
      try {
        setStoresLoading(true);
        const result = await getNavbarStorePreview();

        if (isMounted) {
          setNavbarStores(result.items || []);
          setNavbarStoreCount(Number(result.totalCount) || 0);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Navbar stores could not be loaded:", error);
          setNavbarStores([]);
          setNavbarStoreCount(0);
        }
      } finally {
        if (isMounted) setStoresLoading(false);
      }
    };

    loadStores();

    return () => {
      isMounted = false;
    };
  }, [isSeller]);

  const closeAccountMenu = () => {
    setIsAccountOpen(false);
  };

  const handleLogout = async () => {
    await logoutUser();

    setIsAccountOpen(false);
    navigate(getPostLogoutRoute(), { replace: true });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const normalizedSearchTerm = searchTerm.trim();

    if (!normalizedSearchTerm) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(normalizedSearchTerm)}`);
  };

  const handleLanguageChange = () => {
    const nextLanguage = i18n.resolvedLanguage === "tr" ? "en" : "tr";
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <header className={`navbar${isSeller ? " navbar--seller" : ""}`}>
      <div className="container navbar__container">
        <Link
          to={isSeller ? ROUTES.SELLER_DASHBOARD : ROUTES.HOME}
          className="navbar__logo"
          onClick={onHomeClick}
        >
          <img src={brandLogo} alt="Shopera" className="navbar__logo-image" />
        </Link>

        {!isSeller && (
          <div className="navbar__stores" ref={storesMenuRef}>
            <button
              type="button"
              className="navbar__stores-button"
              aria-haspopup="menu"
              aria-expanded={isStoresOpen}
              onClick={() => {
                setIsAccountOpen(false);
                setIsStoresOpen((current) => !current);
              }}
            >
              <StorefrontIcon />
              <span>{t("navbar.stores")}</span>
              <ChevronDownIcon />
            </button>

            {isStoresOpen && (
              <div className="navbar__stores-dropdown" role="menu">
                <div className="navbar__stores-heading">
                  <div>
                    <strong>{t("navbar.storeMenuTitle")}</strong>
                    <span>
                      {t("navbar.storeMenuCount", { count: navbarStoreCount })}
                    </span>
                  </div>
                  <StorefrontIcon />
                </div>

                <div className="navbar__stores-list">
                  {storesLoading ? (
                    <div className="navbar__stores-state">
                      {t("navbar.storesLoading")}
                    </div>
                  ) : navbarStores.length === 0 ? (
                    <div className="navbar__stores-state">
                      {t("navbar.storesEmpty")}
                    </div>
                  ) : (
                    navbarStores.map((store) => (
                      <Link
                        key={store.storeId}
                        to={getStoreRoute(store.storeId)}
                        className="navbar__store-link"
                        role="menuitem"
                        onClick={() => setIsStoresOpen(false)}
                      >
                        <NavbarStoreAvatar store={store} />
                        <span className="navbar__store-copy">
                          <strong>{store.storeName}</strong>
                          <small>
                            {t("navbar.storeProductCount", {
                              count: store.visibleProductCount,
                            })}
                          </small>
                        </span>
                        <span className="navbar__store-arrow" aria-hidden="true">→</span>
                      </Link>
                    ))
                  )}
                </div>

                <Link
                  to="/stores"
                  className="navbar__stores-all"
                  role="menuitem"
                  onClick={() => setIsStoresOpen(false)}
                >
                  {t("navbar.viewAllStores")}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {!isSeller && (
          <form className="navbar__search" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              placeholder={t("navbar.search")}
              aria-label={t("navbar.search")}
              className="navbar__search-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <button
              type="submit"
              className="navbar__search-button"
              aria-label={t("navbar.search")}
            >
              <span aria-hidden="true">&#9906;</span>
            </button>
          </form>
        )}

        <div className="navbar__actions">
          <button
            type="button"
            className="navbar__icon-button"
            aria-label={t("navbar.switchLanguage", {
              language:
                i18n.resolvedLanguage === "tr"
                  ? t("navbar.english")
                  : t("navbar.turkish"),
            })}
            title={t("navbar.language")}
            onClick={handleLanguageChange}
          >
            <span aria-hidden="true">
              {i18n.resolvedLanguage === "tr" ? "TR" : "EN"}
            </span>
          </button>

          {!isSeller && (
            <Link
              to="/wishlist"
              className="navbar__icon-button navbar__wishlist-button"
              aria-label={t("buyer.nav.favourites")}
            >
              {!isLoggedIn || isBuyer ? (
                <HeartIcon />
              ) : (
                <span aria-hidden="true">&#9825;</span>
              )}
              {wishlistCount > 0 && (
                <span className="navbar__wishlist-count">{wishlistCount}</span>
              )}
            </Link>
          )}

          {(isBuyer || isSeller) && <NotificationBell />}

          {!isSeller && (
            <button
              type="button"
              className={`navbar__icon-button navbar__cart-button ${
                cartCount > 0 || isCartOpen ? "navbar__cart-button--active" : ""
              }`}
              aria-label={t("cart.title")}
              onClick={openCart}
            >
              {!isLoggedIn || isBuyer ? (
                <CartIcon />
              ) : (
                <span aria-hidden="true">&#128722;</span>
              )}
              {cartCount > 0 && (
                <span className="navbar__cart-count">{cartCount}</span>
              )}
            </button>
          )}

          {!isLoggedIn && (
            <>
              <Link to="/login" className="navbar__login">
                {t("navbar.signIn")}
              </Link>

              <Link to="/register" className="navbar__register">
                {t("navbar.signUp")}
              </Link>
            </>
          )}

          {isSeller && (
            <Link
              to={getAccountActionRoute(authUser.role)}
              className="navbar__seller-link"
            >
              {t("navbar.sellerDashboard")}
            </Link>
          )}

          {isLoggedIn && (
            <div className="navbar__account" ref={accountMenuRef}>
              <button
                type="button"
                className={`navbar__account-button${
                  isBuyer
                    ? " navbar__account-button--buyer"
                    : isSeller
                      ? " navbar__account-button--seller"
                      : ""
                }`}
                aria-haspopup="menu"
                aria-expanded={isAccountOpen}
                onClick={() => {
                  setIsStoresOpen(false);
                  setIsAccountOpen((current) => !current);
                }}
              >
                {!isBuyer && !isSeller && (
                  <span className="navbar__account-avatar" aria-hidden="true">
                    {authUser.profilePhoto ? (
                      <img src={authUser.profilePhoto} alt="" />
                    ) : (
                      accountInitial
                    )}
                  </span>
                )}
                <span className="navbar__account-name">{accountName}</span>
                <span className="navbar__account-arrow" aria-hidden="true">
                  {(isBuyer || isSeller) ? <ChevronDownIcon /> : <>&#8964;</>}
                </span>
              </button>

              {isAccountOpen && (
                <div className={`navbar__account-dropdown${isBuyer ? " navbar__account-dropdown--buyer" : ""}`} role="menu">
                  <div className="navbar__account-card">
                    {!isBuyer && !isSeller && (
                      <span className="navbar__account-card-avatar" aria-hidden="true">
                        {authUser.profilePhoto ? (
                          <img src={authUser.profilePhoto} alt="" />
                        ) : (
                          accountInitial
                        )}
                      </span>
                    )}
                    <div>
                      <strong>{accountName}</strong>
                      <span>
                        {isSeller
                          ? t("navbar.sellerAccount")
                          : t("navbar.buyerAccount")}
                      </span>
                    </div>
                  </div>

                  {isBuyer &&
                    buyerAccountLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="navbar__account-link"
                        role="menuitem"
                        onClick={closeAccountMenu}
                      >
                        <AccountMenuIcon name={link.icon} />
                        {t(link.labelKey)}
                        {link.showUnread && unreadCount > 0 && (
                          <strong className="navbar__account-link-badge">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </strong>
                        )}
                      </Link>
                    ))}

                  {isSeller && (
                    <>
                      <Link
                        to={ROUTES.ACCOUNT_PROFILE}
                        className="navbar__account-link"
                        role="menuitem"
                        onClick={closeAccountMenu}
                      >
                        <span aria-hidden="true">P</span>
                        {t("buyer.nav.personalInformation")}
                      </Link>
                      <Link
                        to={getAccountActionRoute(authUser.role)}
                        className="navbar__account-link"
                        role="menuitem"
                        onClick={closeAccountMenu}
                      >
                        <span aria-hidden="true">D</span>
                        {t("navbar.sellerDashboard")}
                      </Link>
                    </>
                  )}

                  <button
                    type="button"
                    className="navbar__logout-button"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    {isBuyer ? (
                      <AccountMenuIcon name="logout" />
                    ) : (
                      <span aria-hidden="true">L</span>
                    )}
                    {t("navbar.logout")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

export default Navbar;
