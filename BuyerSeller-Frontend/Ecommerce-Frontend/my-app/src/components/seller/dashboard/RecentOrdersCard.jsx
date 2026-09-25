import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  ORDER_STATUS_META,
  ORDER_STATUS_TRANSLATION_KEYS,
} from "../../../constants/marketplace";
import { formatCurrency } from "../../../utils/formatCurrency";
import { getSellerRecentOrderPreviews } from "../../../utils/sellerDashboard";
import DashboardEmptyIcon from "./DashboardEmptyIcon";

const formatOrderTotal = (order) => {
  try {
    return formatCurrency(
      Number(order?.totalAmount) || 0,
      order?.currencyCode || "EUR"
    );
  } catch {
    return String(Number(order?.totalAmount) || 0);
  }
};

function RecentOrdersCard({ recentOrders = [] }) {
  const { t } = useTranslation();
  const orders =
    getSellerRecentOrderPreviews(recentOrders);

  return (
    <article className="seller-dashboard-card seller-recent-orders">
      <div className="seller-dashboard-card__header">
        <h2>{t("dashboard.recentOrders")}</h2>

        <Link
          to="/seller/orders"
          className="seller-dashboard-card__link-button"
        >
          {t("common.seeAll")}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="seller-dashboard-widget-empty">
          <span className="seller-dashboard-widget-empty__icon">
            <DashboardEmptyIcon type="receipt" />
          </span>
          <strong>{t("dashboard.noOrdersYet")}</strong>
          <p>{t("dashboard.noOrdersYetDescription")}</p>
        </div>
      ) : (
        <div className="seller-recent-orders__list">
          {orders.map((preview) => {
            const {
              order,
              productName,
              additionalItemCount,
              status,
            } = preview;
            const statusMeta =
              ORDER_STATUS_META[status] ||
              ORDER_STATUS_META.PENDING;

            return (
              <div
                key={preview.key}
                className="seller-recent-order"
              >
                <div
                  className="seller-recent-order__image"
                  aria-hidden="true"
                >
                  {productName
                    .charAt(0)
                    .toUpperCase() || "P"}
                </div>

                <div className="seller-recent-order__info">
                  <strong>
                    {order?.orderNumber || "—"}
                  </strong>
                  <span>{order?.customerName || "—"}</span>
                  <small>
                    {productName ||
                      t("dashboard.productUnavailable")}
                    {additionalItemCount > 0
                      ? ` · ${t("orders.moreItems", {
                          count: additionalItemCount,
                        })}`
                      : ""}
                  </small>
                </div>

                <span
                  className={`seller-order-status seller-order-status--${statusMeta.color}`}
                >
                  {t(
                    ORDER_STATUS_TRANSLATION_KEYS[
                      status
                    ] ||
                      ORDER_STATUS_TRANSLATION_KEYS.PENDING
                  )}
                </span>

                <strong className="seller-recent-order__total">
                  {formatOrderTotal(order)}
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default RecentOrdersCard;
