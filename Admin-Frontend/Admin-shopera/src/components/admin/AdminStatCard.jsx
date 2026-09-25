import {
  CircleDollarSign,
  ShoppingBag,
  Store,
  UserPlus,
  Users,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

const iconMap = {
  users: Users,
  sellers: Store,
  pendingSellers: UserPlus,
  orders: ShoppingBag,
  revenue: CircleDollarSign,
};

const statisticPathMap = {
  users: "/admin/users",
  sellers: "/admin/sellers",
  pendingSellers: "/admin/seller-verification",
  orders: "/admin/orders",
  revenue: "/admin/reports",
};

function AdminStatCard({
  title,
  value,
  change,
  comparison,
  iconType,
  color,
  negative,
}) {
  const navigate = useNavigate();

  const Icon = iconMap[iconType];
  const destination = statisticPathMap[iconType];

  const openStatisticPage = () => {
    if (destination) {
      navigate(destination);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openStatisticPage();
    }
  };

  return (
    <article
      className="admin-stat-card admin-stat-card-clickable"
      role="button"
      tabIndex={0}
      onClick={openStatisticPage}
      onKeyDown={handleKeyDown}
      aria-label={`Open ${title}`}
    >
      <div
        className={`admin-stat-icon admin-stat-icon-${color}`}
      >
        {Icon && <Icon size={22} />}
      </div>

      <div className="admin-stat-information">
        <span className="admin-stat-title">
          {title}
        </span>

        <h2>{value}</h2>

        <div
          className={`admin-stat-change ${
            negative
              ? "admin-stat-change-negative"
              : ""
          }`}
        >
          <strong>
            {negative ? "↓" : "↑"} {change}
          </strong>

          <span>{comparison}</span>
        </div>
      </div>
    </article>
  );
}

export default AdminStatCard;