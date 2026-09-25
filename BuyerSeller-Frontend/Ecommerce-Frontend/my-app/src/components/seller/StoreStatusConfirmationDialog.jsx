import { useTranslation } from "react-i18next";

import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";

function StoreStatusConfirmationDialog({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}) {
  const { t } = useTranslation();
  const overlay = useOverlayAccessibility({
    isOpen,
    onClose: onCancel,
    preventClose: isSubmitting,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={overlay.overlayRef}
      className="seller-store-status-dialog"
      onMouseDown={(event) => {
        if (
          !isSubmitting &&
          event.target === event.currentTarget
        ) {
          onCancel();
        }
      }}
    >
      <section
        className="seller-store-status-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-deactivation-title"
        aria-describedby="store-deactivation-description"
        aria-busy={isSubmitting}
        tabIndex="-1"
      >
        <div
          className="seller-store-status-dialog__icon"
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
            <path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>

        <div className="seller-store-status-dialog__content">
          <h2 id="store-deactivation-title">
            {t("storeProfile.confirmDeactivation")}
          </h2>

          <p id="store-deactivation-description">
            {t("storeProfile.deactivationWarning")}
          </p>
        </div>

        <footer className="seller-store-status-dialog__actions">
          <button
            ref={overlay.initialFocusRef}
            type="button"
            className="seller-store-status-dialog__button seller-store-status-dialog__button--cancel"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            {t("storeProfile.cancel")}
          </button>

          <button
            type="button"
            className="seller-store-status-dialog__button seller-store-status-dialog__button--confirm"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting
              ? t("storeProfile.deactivating")
              : t("storeProfile.confirm")}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default StoreStatusConfirmationDialog;
