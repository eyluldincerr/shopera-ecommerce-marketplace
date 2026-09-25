import {
  AlertTriangle,
  ShoppingBag,
  Store,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

const activityIconMap = {
  store: Store,
  order: ShoppingBag,
  warning: AlertTriangle,

  /*
    Temporary compatibility with older dashboard data.
    Current store activities use type: "store".
  */
  seller: Store,
};

const activityPathMap = {
  store: "/admin/seller-verification",
  seller: "/admin/seller-verification",
  order: "/admin/orders",
  warning: "/admin/products",
};

function AdminRecentActivities({
  activities = [],
}) {
  const navigate = useNavigate();

  const openActivity = (activity) => {
    const activityType =
      activity.entityType ||
      activity.type;

    const destination =
      activity.path ||
      activityPathMap[activityType] ||
      "/admin/reports";

    const navigationState = {};

    if (
      activityType === "order" &&
      activity.orderId
    ) {
      navigationState.selectedOrderId =
        Number(activity.orderId);
    }

    if (
      activityType === "store" ||
      activityType === "seller"
    ) {
      if (activity.storeId) {
        navigationState.selectedStoreId =
          Number(activity.storeId);
      } else if (
        activity.sellerUserId ||
        activity.userId
      ) {
        /*
          Compatibility fallback only.

          Store verification should normally navigate
          using STORE.StoreID.
        */
        navigationState.selectedSellerId =
          Number(
            activity.sellerUserId ||
              activity.userId
          );
      }
    }

    if (
      activityType === "warning" &&
      activity.productId
    ) {
      navigationState.selectedProductId =
        Number(activity.productId);
    }

    navigate(destination, {
      state:
        Object.keys(navigationState).length > 0
          ? navigationState
          : null,
    });
  };

  return (
    <article className="admin-panel admin-recent-activities-panel">
      <div className="admin-panel-header">
        <div>
          <h3>Recent Activities</h3>

          <small>Authoritative Admin activity history is not available yet.</small>
        </div>

      </div>

      <div className="admin-activities">
        {activities.length > 0 ? (
          activities.map((activity) => {
            const activityType =
              activity.entityType ||
              activity.type ||
              "warning";

            const Icon =
              activityIconMap[activityType] ||
              AlertTriangle;

            return (
              <button
                type="button"
                className="admin-activity-item"
                key={activity.id}
                onClick={() =>
                  openActivity(activity)
                }
                aria-label={`Open activity: ${
                  activity.title ||
                  "Recent activity"
                }`}
              >
                <div
                  className={`admin-activity-icon admin-activity-${activityType}`}
                >
                  <Icon size={18} />
                </div>

                <div className="admin-activity-info">
                  <strong>
                    {activity.title ||
                      "Recent Activity"}
                  </strong>

                  <small>
                    {activity.description ||
                      "No activity description is available."}
                  </small>
                </div>

                <span>
                  {activity.time ||
                    activity.date ||
                    ""}
                </span>
              </button>
            );
          })
        ) : (
          <div className="admin-activities-empty">
            No recent activities are available.
          </div>
        )}
      </div>
    </article>
  );
}

export default AdminRecentActivities;
