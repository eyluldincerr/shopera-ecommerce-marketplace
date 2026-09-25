import { NavLink } from "react-router-dom";

import {
  BarChart3,
  FileText,
  Grid2X2,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Ticket,
  Megaphone,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
    end: true,
  },
  {
    name: "Users",
    path: "/admin/users",
    icon: Users,
  },
  {
    name: "Brands",
    path: "/admin/sellers",
    icon: Store,
  },
  {
    name: "Brand Applications",
    path: "/admin/seller-verification",
    icon: ShieldCheck,
  },
  {
    name: "Products",
    path: "/admin/products",
    icon: Package,
  },
  {
    name: "Categories",
    path: "/admin/categories",
    icon: Grid2X2,
  },
  {
    name: "Orders",
    path: "/admin/orders",
    icon: ShoppingBag,
  },
  {
    name: "Coupons",
    path: "/admin/coupons",
    icon: Ticket,
  },
  {
    name: "Hero Banners",
    path: "/admin/promotions",
    icon: Megaphone,
  },
  {
    name: "Reports",
    path: "/admin/reports",
    icon: FileText,
  },
  {
    name: "Analytics",
    path: "/admin/analytics",
    icon: BarChart3,
  },
  {
    name: "Settings",
    path: "/admin/settings",
    icon: Settings,
  },
];

function AdminSidebar({
  isMobileOpen = false,
  onClose,
}) {
  return (
    <>
      <button
        type="button"
        className={`admin-mobile-nav-backdrop ${
          isMobileOpen
            ? "admin-mobile-nav-backdrop-open"
            : ""
        }`}
        aria-label="Close administration navigation"
        tabIndex={isMobileOpen ? 0 : -1}
        onClick={onClose}
      />

      <aside
        className={`shopera-admin-sidebar ${
          isMobileOpen
            ? "shopera-admin-sidebar-mobile-open"
            : ""
        }`}
        aria-label="Administration navigation"
      >
        <div className="admin-mobile-nav-heading">
          <strong>Administration</strong>

          <button
            type="button"
            aria-label="Close administration navigation"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <nav className="admin-sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `admin-menu-item ${
                    isActive ? "admin-menu-item-active" : ""
                  }`
                }
                onClick={onClose}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default AdminSidebar;
