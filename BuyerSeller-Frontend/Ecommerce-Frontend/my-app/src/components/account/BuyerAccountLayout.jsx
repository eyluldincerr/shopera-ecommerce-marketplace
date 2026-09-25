import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import Navbar from "../layout/Navbar";
import useNotifications from "../../hooks/useNotifications";
import { getMyProfile } from "../../services/accountService";

const accountNavLinks = [
  { to: "/account/profile", labelKey: "buyer.nav.personalInformation" },
  { to: "/account/addresses", labelKey: "buyer.nav.addresses" },
  { to: "/account/payment-methods", labelKey: "buyer.nav.paymentMethods" },
  { to: "/orders", labelKey: "buyer.nav.orders" },
  { to: "/notifications", labelKey: "buyer.nav.notifications", showUnread: true },
  { to: "/wishlist", labelKey: "buyer.nav.favourites" },
  { to: "/account/coupons", labelKey: "buyer.nav.coupons" },
  { to: "/account/support", labelKey: "buyer.nav.support" },
];

const fallbackProfile = {
  fullName: "",
  role: "Buyer",
  profilePhoto: "",
};

function ProfileAvatar({ profile }) {
  const initial = profile.fullName?.charAt(0).toUpperCase() || "U";

  return (
    <div className="profile-mini-avatar">
      {profile.profilePhoto ? (
        <img src={profile.profilePhoto} alt={profile.fullName || "Profile"} />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

function BuyerAccountLayout({
  activePath,
  children,
  pageClassName = "",
  profile,
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const activeLinkRef = useRef(null);
  const [loadedProfile, setLoadedProfile] = useState(fallbackProfile);

  useEffect(() => {
    if (profile) {
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await getMyProfile();

        setLoadedProfile(data);
      } catch {
        setLoadedProfile(fallbackProfile);
      }
    };

    loadProfile();
  }, [profile]);

  const accountProfile = profile || loadedProfile;
  const currentPath = activePath || location.pathname;
  const scrollTabIntoView = (element) => {
    if (!element || !window.matchMedia("(max-width: 980px)").matches) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  useEffect(() => {
    scrollTabIntoView(activeLinkRef.current);
  }, [currentPath]);

  return (
    <>
      <Navbar />

      <main className={`profile-page ${pageClassName}`.trim()}>
        <section className="profile-layout">
          <aside className="profile-sidebar">
            <div className="profile-mini-card">
              <ProfileAvatar profile={accountProfile} />

              <div>
                <h3>{accountProfile.fullName || t("navbar.myAccount")}</h3>
                <p>
                  {accountProfile.role === "Seller"
                    ? t("navbar.sellerAccount")
                    : t("navbar.buyerAccount")}
                </p>
              </div>
            </div>

            <nav
              className="profile-side-nav"
              aria-label={t("buyer.account.menu")}
            >
              {accountNavLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  ref={link.to === currentPath ? activeLinkRef : null}
                  className={link.to === currentPath ? "active" : ""}
                  aria-current={link.to === currentPath ? "page" : undefined}
                  onFocus={(event) => scrollTabIntoView(event.currentTarget)}
                >
                  <span>{t(link.labelKey)}</span>
                  {link.showUnread && unreadCount > 0 && (
                    <strong className="profile-side-nav__badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </strong>
                  )}
                </Link>
              ))}
            </nav>
          </aside>

          <section className="profile-content">{children}</section>
        </section>
      </main>
    </>
  );
}

export default BuyerAccountLayout;
