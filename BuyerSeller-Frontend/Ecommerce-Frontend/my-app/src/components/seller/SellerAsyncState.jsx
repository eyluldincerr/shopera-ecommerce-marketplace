import { useTranslation } from "react-i18next";

function SellerAsyncState({
  status,
  error,
  onRetry,
  title,
  description,
  action,
}) {
  const { t } = useTranslation();
  const displayError =
    error ===
    "Product and store data is not available until the backend is configured."
      ? t("backend.productStoreNotConfigured")
      : error;

  if (status === "loading" || status === "retrying") {
    return (
      <section className="seller-async-state" role="status" aria-live="polite">
        <span className="seller-async-state__spinner" aria-hidden="true" />
        <h1>{title || t("common.loading")}</h1>
        {status === "retrying" && <p>{t("common.retrying")}</p>}
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="seller-async-state" role="alert">
        <h1>{title || t("common.errorTitle")}</h1>
        <p>{displayError || t("common.errorDescription")}</p>
        <button type="button" onClick={onRetry}>
          {t("common.retry")}
        </button>
      </section>
    );
  }

  if (status === "empty") {
    return (
      <section className="seller-async-state">
        <h1>{title || t("common.emptyTitle")}</h1>
        {description && <p>{description}</p>}
        {action}
      </section>
    );
  }

  return null;
}

export default SellerAsyncState;
