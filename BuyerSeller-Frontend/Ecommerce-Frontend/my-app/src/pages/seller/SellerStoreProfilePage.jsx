import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  getSellerStoreProfile,
  resubmitSellerStore,
  subscribeSellerData,
  updateSellerStoreProfile,
  updateSellerStoreStatus,
} from "../../services/sellerService";

import {
  useTranslation,
} from "react-i18next";

import SellerAsyncState from "../../components/seller/SellerAsyncState";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";
import StoreMediaUrlDialog from "../../components/seller/StoreMediaUrlDialog";
import StoreStatusConfirmationDialog from "../../components/seller/StoreStatusConfirmationDialog";
import {
  createStoreMediaEditor,
  resolveStoreMediaEdit,
} from "../../utils/storeMediaEditor";
import {
  getStoreDecisionFeedback,
  getStoreStatusAction,
  getStoreStatusModifier,
} from "../../utils/storeProfileStatus";

function StoreStatusActionIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
      <path d="M12 2v10" />
    </svg>
  );
}

function StoreProfileIcon({ type }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (type === "products") {
    return (
      <svg {...commonProps}>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }

  if (type === "sales") {
    return (
      <svg {...commonProps}>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="m3 7 6-4 6 5 6-5" />
      </svg>
    );
  }

  if (type === "orders") {
    return (
      <svg {...commonProps}>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }

  if (type === "rating") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
      </svg>
    );
  }

  if (type === "email") {
    return (
      <svg {...commonProps}>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        />

        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }

  if (type === "phone") {
    return (
      <svg {...commonProps}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
      </svg>
    );
  }

  if (type === "status") {
    return (
      <svg {...commonProps}>
        <circle
          cx="12"
          cy="12"
          r="9"
        />

        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  }

  if (type === "owner") {
    return (
      <svg {...commonProps}>
        <circle
          cx="12"
          cy="8"
          r="4"
        />

        <path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M3 11h18" />
      <path d="M5 11V7l7-4 7 4v4" />
      <path d="M5 11v9h14v-9" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

function SellerStoreProfileContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [profileData, setProfileData] =
    useState(null);

  const [formData, setFormData] = useState({
    storeName: "",
    storeSlug: "",
    logoUrl: "",
    bannerUrl: "",
    description: "",
    supportEmail: "",
    supportPhone: "",
    supportPolicy: "",
    returnPolicy: "",
  });

  const [
    savedFormData,
    setSavedFormData,
  ] = useState(null);

  const [
    saveMessage,
    setSaveMessage,
  ] = useState("");

  const [
    saveError,
    setSaveError,
  ] = useState("");

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isChangingStatus,
    setIsChangingStatus,
  ] = useState(false);

  const statusSubmissionRef = useRef(false);

  const [
    isDeactivationDialogOpen,
    setIsDeactivationDialogOpen,
  ] = useState(false);

  const [
    brokenLogo,
    setBrokenLogo,
  ] = useState(false);

  const [
    brokenBanner,
    setBrokenBanner,
  ] = useState(false);

  const [
    mediaEditor,
    setMediaEditor,
  ] = useState(null);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    isRetrying,
    setIsRetrying,
  ] = useState(false);

  const loadStoreProfile = useCallback(
    async (retry = false) => {
      try {
        setLoadError("");
        setIsRetrying(retry);

        const data =
          await getSellerStoreProfile();

        setProfileData(data);

        const nextFormData = {
          storeName:
            data.store.storeName || "",

          storeSlug:
            data.store.storeSlug || "",

          logoUrl:
            data.store.logoUrl || "",

          bannerUrl:
            data.store.bannerUrl || "",

          description:
            data.store.description ||
            (data.store.descriptionKey
              ? t(data.store.descriptionKey)
              : ""),

          supportEmail:
            data.store.supportEmail || "",

          supportPhone:
            data.store.supportPhone || "",

          supportPolicy:
            data.policies.support ||
            (data.policies.supportKey
              ? t(data.policies.supportKey)
              : ""),

          returnPolicy:
            data.policies.return ||
            (data.policies.returnKey
              ? t(data.policies.returnKey)
              : ""),
        };

        setFormData(nextFormData);
        setSavedFormData(nextFormData);
        setBrokenLogo(false);
        setBrokenBanner(false);
        setMediaEditor(null);
        return true;
      } catch (error) {
        setLoadError(
          error.message ||
            t("common.errorDescription")
        );
        return false;
      } finally {
        setIsRetrying(false);
      }
    },
    [t]
  );

  useEffect(() => {
    loadStoreProfile();

    const unsubscribe = subscribeSellerData(
      () => {
        loadStoreProfile();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loadStoreProfile]);

  const handleInputChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setSaveMessage("");
    setSaveError("");
  };

  const openMediaEditor = (type) => {
    setMediaEditor(
      createStoreMediaEditor(type, formData)
    );
  };

  const updateMediaEditorDraft = (draftUrl) => {
    setMediaEditor((currentEditor) => ({
      ...currentEditor,
      draftUrl,
    }));
  };

  const finishMediaEditor = (action) => {
    if (!mediaEditor) {
      return;
    }

    setFormData((currentData) =>
      resolveStoreMediaEdit(
        currentData,
        mediaEditor,
        action
      )
    );

    if (action !== "cancel") {
      if (mediaEditor.type === "banner") {
        setBrokenBanner(false);
      } else {
        setBrokenLogo(false);
      }

      setSaveMessage("");
      setSaveError("");
    }

    setMediaEditor(null);
  };

  const handleSaveChanges = async () => {
    if (!formData.storeName.trim()) {
      setSaveMessage("");

      setSaveError(
        t("storeProfile.storeNameRequired")
      );

      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      await updateSellerStoreProfile({
        storeName:
          formData.storeName.trim(),

        storeSlug:
          formData.storeSlug.trim(),

        logoUrl:
          formData.logoUrl.trim(),

        bannerUrl:
          formData.bannerUrl.trim(),

        description:
          formData.description.trim(),

        supportEmail:
          formData.supportEmail.trim(),

        supportPhone:
          formData.supportPhone.trim(),

        supportPolicy:
          formData.supportPolicy.trim(),

        returnPolicy:
          formData.returnPolicy.trim(),
      });

      await loadStoreProfile();

      setSaveMessage(
        t("storeProfile.changesSaved")
      );
    } catch (error) {
      console.error(
        "Seller Store profile could not be saved:",
        error
      );

      setSaveError(
        error.message ||
          t("storeProfile.saveError")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStoreAction = async (
    action
  ) => {
    if (statusSubmissionRef.current) {
      return;
    }

    statusSubmissionRef.current = true;
    setIsChangingStatus(true);
    setSaveMessage("");
    setSaveError("");

    try {
      if (action === "RESUBMIT") {
        await resubmitSellerStore();

        setSaveMessage(
          t("storeProfile.resubmitted")
        );
      } else {
        await updateSellerStoreStatus(
          action
        );
      }

      const didRefresh = await loadStoreProfile();

      if (!didRefresh) {
        throw new Error("STORE_REFRESH_FAILED");
      }

      if (action === "ACTIVE") {
        setSaveMessage(
          t("storeProfile.activatedSuccessfully")
        );
      } else if (action === "INACTIVE") {
        setSaveMessage(
          t("storeProfile.deactivatedSuccessfully")
        );
      }
    } catch (error) {
      console.error(
        "Seller Store status could not be changed:",
        error
      );

      setSaveError(
        t("storeProfile.unableToUpdateStatus")
      );
    } finally {
      statusSubmissionRef.current = false;
      setIsChangingStatus(false);

      if (action === "INACTIVE") {
        setIsDeactivationDialogOpen(false);
      }
    }
  };

  if (isRetrying) {
    return (
      <SellerAsyncState status="retrying" />
    );
  }

  if (loadError) {
    return (
      <SellerAsyncState
        status="error"
        error={loadError}
        onRetry={() =>
          loadStoreProfile(true)
        }
      />
    );
  }

  if (!profileData) {
    return (
      <SellerAsyncState status="loading" />
    );
  }

  const {
    store,
    overview,
  } = profileData;

  const hasChanges =
    savedFormData !== null &&
    JSON.stringify(formData) !==
      JSON.stringify(savedFormData);

  const decisionFeedback =
    getStoreDecisionFeedback(
      store.approvalStatus,
      store.latestDecisionNote
    );

  const statusAction = getStoreStatusAction(
    store.approvalStatus,
    store.storeStatus
  );

  return (
    <div className="seller-store-profile-content">
      <section className="seller-store-profile-heading">
        <div>
          <h1>
            {t("storeProfile.title")}
          </h1>

          <p>
            {t("storeProfile.subtitle")}
          </p>
        </div>

        <div className="seller-store-profile-heading__actions">
          {saveMessage ? (
            <span className="seller-store-profile-save-message">
              {saveMessage}
            </span>
          ) : null}

          {saveError ? (
            <span className="seller-store-profile-save-message seller-store-profile-save-message--error">
              {saveError}
            </span>
          ) : null}

          <button
            type="button"
            className="seller-store-profile-preview-button"
            onClick={() =>
              navigate(
                "/seller/store-preview"
              )
            }
            disabled={!profileData.hasStore}
          >
            <span aria-hidden="true">
              ◉
            </span>

            {t(
              "storeProfile.previewStore"
            )}
          </button>

          <button
            type="button"
            className="seller-store-profile-save-button"
            onClick={handleSaveChanges}
            disabled={
              isSaving || !hasChanges
            }
          >
            <span aria-hidden="true">
              ▣
            </span>

            {isSaving
              ? t("dashboard.saving")
              : t(
                  "common.saveChanges"
                )}
          </button>
        </div>
      </section>

      <section className="seller-store-profile-main-grid">
        <article className="seller-store-profile-card seller-store-appearance">
          <div className="seller-store-profile-card__header">
            <h2>
              {t(
                "storeProfile.storeAppearance"
              )}
            </h2>
          </div>

          <div className="seller-store-appearance__banner">
            {formData.bannerUrl &&
            !brokenBanner ? (
              <img
                src={formData.bannerUrl}
                alt={t(
                  "storeProfile.storeBannerAlt",
                  {
                    storeName:
                      formData.storeName,
                  }
                )}
                onError={() =>
                  setBrokenBanner(true)
                }
              />
            ) : (
              <div className="seller-store-appearance__banner-placeholder">
                <span>
                  {formData.storeName ||
                    t(
                      "sidebar.noStore"
                    )}
                </span>

                <small
                  role={
                    brokenBanner
                      ? "status"
                      : undefined
                  }
                >
                  {t(
                    brokenBanner
                      ? "storeProfile.bannerLoadError"
                      : "storeProfile.bannerTagline"
                  )}
                </small>
              </div>
            )}

            <button
              type="button"
              className="seller-store-appearance__change-banner"
              onClick={() =>
                openMediaEditor("banner")
              }
            >
              <span aria-hidden="true">
                ⇧
              </span>

              {t(
                "storeProfile.changeBanner"
              )}
            </button>
          </div>

          <div className="seller-store-appearance__body">
            <div className="seller-store-appearance__logo-section">
              <div className="seller-store-appearance__logo">
              {formData.logoUrl &&
              !brokenLogo ? (
                <img
                  src={formData.logoUrl}
                  alt={t(
                    "storeProfile.storeLogoAlt",
                    {
                      storeName:
                        formData.storeName,
                    }
                  )}
                  onError={() =>
                    setBrokenLogo(true)
                  }
                />
              ) : (
                <span>
                  {formData.storeName
                    ?.charAt(0)
                    .toUpperCase() ||
                    "S"}
                </span>
              )}

              <button
                type="button"
                className="seller-store-appearance__edit-logo"
                aria-label={t(
                  "storeProfile.changeStoreLogo"
                )}
                title={t(
                  "storeProfile.changeStoreLogo"
                )}
                onClick={() =>
                  openMediaEditor("logo")
                }
              >
                ✎
              </button>
              </div>

              {brokenLogo ? (
                <p
                  className="seller-store-appearance__image-error"
                  role="status"
                >
                  {t(
                    "storeProfile.logoLoadError"
                  )}
                </p>
              ) : null}
            </div>

            <div className="seller-store-appearance__fields">
              <label className="seller-store-profile-field">
                <span>
                  {t(
                    "storeProfile.storeName"
                  )}
                </span>

                <input
                  type="text"
                  name="storeName"
                  value={
                    formData.storeName
                  }
                  onChange={
                    handleInputChange
                  }
                  maxLength={150}
                  required
                />
              </label>

              <label className="seller-store-profile-field">
                <span>
                  Store slug
                </span>

                <input
                  type="text"
                  name="storeSlug"
                  value={
                    formData.storeSlug
                  }
                  onChange={
                    handleInputChange
                  }
                  maxLength={150}
                  placeholder="my-store-name"
                />
              </label>

              <label className="seller-store-profile-field">
                <span>
                  {t(
                    "storeProfile.storeDescription"
                  )}
                </span>

                <textarea
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={
                    handleInputChange
                  }
                  maxLength={1000}
                  rows={5}
                />

                <small>
                  {
                    (
                      formData.description ||
                      ""
                    ).length
                  }
                  /1000
                </small>
              </label>
            </div>
          </div>
        </article>

        <article className="seller-store-profile-card seller-store-business">
          <div className="seller-store-profile-card__header">
            <h2>
              {t(
                "storeProfile.businessInformation"
              )}
            </h2>
          </div>

          <div className="seller-store-business__fields">
            <div className="seller-store-business__field-row">
              <div className="seller-store-business__icon">
                <StoreProfileIcon type="email" />
              </div>

              <label className="seller-store-profile-field">
                <span>
                  {t(
                    "storeProfile.businessEmail"
                  )}
                </span>

                <input
                  type="email"
                  name="supportEmail"
                  value={
                    formData.supportEmail
                  }
                  onChange={
                    handleInputChange
                  }
                  maxLength={255}
                />
              </label>
            </div>

            <div className="seller-store-business__field-row">
              <div className="seller-store-business__icon">
                <StoreProfileIcon type="phone" />
              </div>

              <label className="seller-store-profile-field">
                <span>
                  {t(
                    "storeProfile.phoneNumber"
                  )}
                </span>

                <input
                  type="tel"
                  name="supportPhone"
                  value={
                    formData.supportPhone
                  }
                  onChange={
                    handleInputChange
                  }
                  maxLength={30}
                />
              </label>
            </div>

            <div className="seller-store-business__field-row">
              <div className="seller-store-business__icon">
                <StoreProfileIcon type="status" />
              </div>

              <div className="seller-store-business__status-field">
                <span>
                  {t(
                    "storeProfile.approvalStatus"
                  )}
                </span>

                <strong
                  className={`seller-store-business__status seller-store-business__status--${getStoreStatusModifier(
                    store.approvalStatus
                  )}`}
                >
                  {t(
                    store.approvalStatusKey
                  )}
                </strong>

                {decisionFeedback ? (
                  <aside
                    className={`seller-store-business__feedback seller-store-business__feedback--${getStoreStatusModifier(
                      store.approvalStatus
                    )}`}
                    role="note"
                    aria-labelledby="store-admin-feedback-title"
                  >
                    <span
                      className="seller-store-business__feedback-icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
                      </svg>
                    </span>

                    <span className="seller-store-business__feedback-content">
                      <strong id="store-admin-feedback-title">
                        {t(
                          "storeProfile.adminFeedback"
                        )}
                      </strong>

                      <span>{decisionFeedback}</span>
                    </span>
                  </aside>
                ) : null}
              </div>
            </div>

            <div className="seller-store-business__field-row">
              <div className="seller-store-business__icon">
                <StoreProfileIcon type="store" />
              </div>

              <div className="seller-store-business__status-field">
                <span>
                  {t(
                    "storeProfile.storeStatus"
                  )}
                </span>

                <strong
                  className={`seller-store-business__status seller-store-business__status--${getStoreStatusModifier(
                    store.storeStatus
                  )}`}
                >
                  {t(
                    store.storeStatusKey
                  )}
                </strong>

                {store.approvalStatus ===
                "REJECTED" ? (
                  <button
                    type="button"
                    className="seller-store-business__action seller-store-business__action--resubmit"
                    disabled={
                      isChangingStatus
                    }
                    onClick={() =>
                      handleStoreAction(
                        "RESUBMIT"
                      )
                    }
                  >
                    {t(
                      "storeProfile.resubmit"
                    )}
                  </button>
                ) : null}

                {statusAction ? (
                  <button
                    type="button"
                    className={`seller-store-business__action seller-store-business__action--${
                      statusAction === "INACTIVE"
                        ? "deactivate"
                        : "activate"
                    }`}
                    disabled={
                      isChangingStatus
                    }
                    onClick={() => {
                      if (
                        statusAction === "INACTIVE"
                      ) {
                        setIsDeactivationDialogOpen(
                          true
                        );
                      } else {
                        handleStoreAction("ACTIVE");
                      }
                    }}
                  >
                    <StoreStatusActionIcon />

                    {isChangingStatus
                      ? t(
                          statusAction ===
                            "INACTIVE"
                            ? "storeProfile.deactivating"
                            : "storeProfile.activating"
                        )
                      : t(
                          statusAction ===
                            "INACTIVE"
                            ? "storeProfile.deactivate"
                            : "storeProfile.activate"
                        )}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </article>
      </section>


      <section className="seller-store-profile-bottom-grid">
        <article className="seller-store-profile-card seller-store-overview">
          <div className="seller-store-profile-card__header">
            <h2>
              {t(
                "storeProfile.storeOverview"
              )}
            </h2>
          </div>

          <div className="seller-store-overview__items">
            {overview.map((item) => (
              <div
                key={item.id}
                className="seller-store-overview__item"
              >
                <div
                  className={`seller-store-overview__icon seller-store-overview__icon--${item.color}`}
                >
                  <StoreProfileIcon
                    type={item.icon}
                  />
                </div>

                <div className="seller-store-overview__content">
                  <span>
                    {t(item.titleKey)}
                  </span>

                  <strong>
                    {item.value}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(item.route)
                  }
                >
                  {item.description ||
                    t(
                      item.descriptionKey,
                      item.descriptionValues
                    )}

                  <span aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="seller-store-profile-card seller-store-policy">
          <div className="seller-store-profile-card__header">
            <div className="seller-store-policy__title">
              <span aria-hidden="true">
                ▣
              </span>

              <h2>
                {t(
                  "storeProfile.supportPolicy"
                )}
              </h2>
            </div>
          </div>

          <textarea
            name="supportPolicy"
            value={
              formData.supportPolicy
            }
            onChange={handleInputChange}
            rows={8}
            aria-label={t(
              "storeProfile.supportPolicy"
            )}
          />

          <small>
            {
              formData.supportPolicy
                .length
            }{" "}
            characters
          </small>
        </article>

        <article className="seller-store-profile-card seller-store-policy">
          <div className="seller-store-profile-card__header">
            <div className="seller-store-policy__title">
              <span aria-hidden="true">
                ↶
              </span>

              <h2>
                {t(
                  "storeProfile.returnPolicy"
                )}
              </h2>
            </div>
          </div>

          <textarea
            name="returnPolicy"
            value={
              formData.returnPolicy
            }
            onChange={handleInputChange}
            rows={8}
            aria-label={t(
              "storeProfile.returnPolicy"
            )}
          />

          <small>
            {
              formData.returnPolicy
                .length
            }{" "}
            characters
          </small>
        </article>
      </section>

      <StoreMediaUrlDialog
        editor={mediaEditor}
        onDraftChange={
          updateMediaEditorDraft
        }
        onApply={() =>
          finishMediaEditor("apply")
        }
        onCancel={() =>
          finishMediaEditor("cancel")
        }
        onRemove={() =>
          finishMediaEditor("remove")
        }
      />

      <StoreStatusConfirmationDialog
        isOpen={isDeactivationDialogOpen}
        isSubmitting={isChangingStatus}
        onCancel={() =>
          setIsDeactivationDialogOpen(false)
        }
        onConfirm={() =>
          handleStoreAction("INACTIVE")
        }
      />
    </div>
  );
}

function SellerStoreProfilePage() {
  return (
    <SellerPageShell>
      <SellerStoreProfileContent />
    </SellerPageShell>
  );
}

export default SellerStoreProfilePage;
