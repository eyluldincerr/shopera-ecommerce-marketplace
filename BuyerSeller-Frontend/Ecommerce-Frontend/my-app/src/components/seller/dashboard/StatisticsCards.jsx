import { useTranslation } from "react-i18next";

function StatisticsCards({ statistics = [] }) {
  const { t } = useTranslation();

  const translateStatisticTitle = (title) => {
    const map = {
      "Total Products": "dashboard.totalProducts",
      "Pending Orders": "dashboard.pendingOrders",
      Revenue: "dashboard.revenue",
      Visitors: "dashboard.visitors",
      "Completed Orders": "dashboard.completedOrders",
      "Low Stock": "dashboard.lowStock",
      "Out of Stock": "dashboard.outOfStock",
    };

    return map[title] ? t(map[title]) : title;
  };

  const translatePeriod = (period) => {
    const map = {
      "vs last week": "common.vsLastWeek",
      "This Week": "common.thisWeek",
      "This Month": "common.thisMonth",
      Today: "common.today",
    };

    return map[period] ? t(map[period]) : period;
  };

  return (
    <section className="seller-statistics">
      {statistics.map((stat) => (
        <article
          key={stat.id}
          className="seller-stat-card"
        >
          <div
            className={`seller-stat-card__icon seller-stat-card__icon--${stat.color}`}
          >
            {stat.icon}
          </div>

          <div className="seller-stat-card__content">
            <p className="seller-stat-card__title">
              {translateStatisticTitle(stat.title)}
            </p>

            <h2 className="seller-stat-card__value">
              {stat.value}
            </h2>

            <div className="seller-stat-card__bottom">
              <span className="seller-stat-card__change">
                {stat.change}
              </span>

              <span className="seller-stat-card__period">
                {translatePeriod(stat.period)}
              </span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export default StatisticsCards;