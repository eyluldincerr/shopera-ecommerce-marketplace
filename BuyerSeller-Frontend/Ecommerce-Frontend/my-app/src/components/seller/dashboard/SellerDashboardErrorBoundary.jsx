import { Component } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

class SellerDashboardErrorBoundaryBase extends Component {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <section
          className="seller-dashboard-boundary"
          role="alert"
        >
          <h1>{this.props.title}</h1>
          <p>{this.props.description}</p>
          <div className="seller-dashboard-boundary__actions">
            <button
              type="button"
              onClick={this.props.onRetry}
            >
              {this.props.retryLabel}
            </button>
            <Link to="/seller/products">
              {this.props.productsLabel}
            </Link>
            <Link to="/seller/store-profile">
              {this.props.storeProfileLabel}
            </Link>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

function SellerDashboardErrorBoundary({
  children,
  onRetry,
}) {
  const { t } = useTranslation();

  return (
    <SellerDashboardErrorBoundaryBase
      title={t("dashboard.errorBoundaryTitle")}
      description={t(
        "dashboard.errorBoundaryDescription"
      )}
      retryLabel={t("common.retry")}
      productsLabel={t("dashboard.goToProducts")}
      storeProfileLabel={t(
        "dashboard.goToStoreProfile"
      )}
      onRetry={onRetry}
    >
      {children}
    </SellerDashboardErrorBoundaryBase>
  );
}

export {
  SellerDashboardErrorBoundaryBase,
};
export default SellerDashboardErrorBoundary;
