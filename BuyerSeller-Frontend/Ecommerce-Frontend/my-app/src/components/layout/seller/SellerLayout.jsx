import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import useOverlayAccessibility from "../../../hooks/useOverlayAccessibility";
import SellerSidebar from "../../seller/SellerSidebar";
import "./SellerLayout.css";
import "../../../styles/seller/sellerWorkspace.css";

function SellerLayout({ children }) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 1024px)").matches
  );
  const menuButtonRef = useRef(null);
  const isMobileSidebarOpen = isMobile && sidebarOpen;

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleChange = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) {
        setSidebarOpen(false);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const navigationOverlay = useOverlayAccessibility({
    isOpen: isMobileSidebarOpen,
    onClose: closeSidebar,
  });

  return (
    <div className="seller-layout">
      <div
        ref={navigationOverlay.overlayRef}
        className="seller-layout__navigation-layer"
      >
        <SellerSidebar
          isMobile={isMobile}
          isOpen={isMobileSidebarOpen}
          onClose={closeSidebar}
          initialFocusRef={navigationOverlay.initialFocusRef}
        />

        {isMobileSidebarOpen && (
          <div
            className="seller-layout__overlay"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}
      </div>

      <main className="seller-layout__content">
        <button
          ref={menuButtonRef}
          type="button"
          className="seller-layout__menu-button"
          onClick={() => setSidebarOpen(true)}
          aria-label={t("sidebar.openNavigation")}
          aria-haspopup="dialog"
          aria-expanded={isMobileSidebarOpen}
        >
          <span aria-hidden="true">&#9776;</span>
        </button>
        {children}
      </main>
    </div>
  );
}

export default SellerLayout;
