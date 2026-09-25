import {
  useEffect,
  useState,
} from "react";

import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

function AdminPageLayout({ children, contentClassName = "admin-page-content" }) {
  const [
    isMobileNavigationOpen,
    setIsMobileNavigationOpen,
  ] = useState(false);

  useEffect(() => {
    if (!isMobileNavigationOpen) {
      return undefined;
    }

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileNavigationOpen(false);
      }
    };
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileNavigationOpen]);

  return (
    <div className="shopera-admin-page">
      <AdminHeader
        isMobileNavigationOpen={isMobileNavigationOpen}
        onMobileNavigationToggle={() =>
          setIsMobileNavigationOpen((isOpen) => !isOpen)
        }
      />

      <div className="shopera-admin-body">
        <AdminSidebar
          isMobileOpen={isMobileNavigationOpen}
          onClose={() => setIsMobileNavigationOpen(false)}
        />

        <main className="shopera-admin-main">
          <div className={contentClassName}>{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AdminPageLayout;
