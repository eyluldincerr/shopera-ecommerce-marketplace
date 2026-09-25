import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import SellerAsyncState from "../../components/seller/SellerAsyncState.jsx";
import SellerStoreMediaPanel from "../../components/seller/SellerStoreMediaPanel.jsx";
import SellerPageShell from "../../components/layout/seller/SellerPageShell.jsx";
import { getSellerStoreProfile } from "../../services/sellerService.js";
import { ROUTES } from "../../routes/routePolicy.js";
import "../../styles/seller/sellerStoreMedia.css";

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();

function SellerStoreMediaContent() {
  const { t } = useTranslation();
  const [profileData, setProfileData] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");

  const loadProfile = useCallback(async (retry = false, signal) => {
    try {
      setLoadState(retry ? "retrying" : "loading");
      setLoadError("");

      const result = await getSellerStoreProfile({ signal });

      if (!signal?.aborted) {
        setProfileData(result);
        setLoadState("success");
      }
    } catch (error) {
      if (error?.name !== "AbortError" && !signal?.aborted) {
        setLoadError(error?.message || t("common.errorDescription"));
        setLoadState("error");
      }
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(false, controller.signal);
    return () => controller.abort();
  }, [loadProfile]);

  if (loadState === "loading" || loadState === "retrying" || loadState === "error") {
    return (
      <SellerAsyncState
        status={loadState}
        error={loadError}
        title={t("storeMediaPage.loadingTitle")}
        onRetry={() => void loadProfile(true)}
      />
    );
  }

  const store = profileData?.store || {};
  const hasStore = Boolean(profileData?.hasStore);
  const canPublish =
    hasStore &&
    normalizeStatus(store.approvalStatus) === "APPROVED" &&
    normalizeStatus(store.storeStatus) === "ACTIVE";

  const storeId = store.storeId ?? store.id;
  const publicStorePath = storeId
    ? ROUTES.STORE.replace(":storeId", encodeURIComponent(String(storeId)))
    : "";

  return (
    <div className="seller-store-media-page">
      <header className="seller-store-media-page__header">
        <div className="seller-store-media-page__title-wrap">
          <h1>{t("storeMediaPage.title")}</h1>
          <p>{t("storeMediaPage.description")}</p>
        </div>

        {publicStorePath ? (
          <Link className="seller-store-media-page__store-link" to={publicStorePath}>
            {t("storeMediaPage.viewStore")}
            <span aria-hidden="true">↗</span>
          </Link>
        ) : null}
      </header>

      <section className="seller-store-media-page__rules" aria-label={t("storeMediaPage.title")}>
        <article>
          <span className="seller-store-media-page__rule-icon" aria-hidden="true">◷</span>
          <div>
            <h2>{t("storeMediaPage.homepageTitle")}</h2>
            <p>{t("storeMediaPage.homepageDescription")}</p>
          </div>
        </article>

        <article>
          <span className="seller-store-media-page__rule-icon" aria-hidden="true">▶</span>
          <div>
            <h2>{t("storeMediaPage.videosTitle")}</h2>
            <p>{t("storeMediaPage.videosDescription")}</p>
          </div>
        </article>
      </section>

      <SellerStoreMediaPanel
        enabled={hasStore}
        canPublish={canPublish}
        showHeading={false}
        storeName={store.storeName || ""}
        storeBannerUrl={store.bannerUrl || ""}
        storeLogoUrl={store.logoUrl || ""}
      />
    </div>
  );
}

function SellerStoreMediaPage() {
  return (
    <SellerPageShell>
      <SellerStoreMediaContent />
    </SellerPageShell>
  );
}

export default SellerStoreMediaPage;
