import { useTranslation } from "react-i18next";

import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";
import {
  STORE_MEDIA_URL_MAX_LENGTH,
  isValidStoreMediaUrl,
} from "../../utils/storeMediaEditor";

function StoreMediaUrlDialog({
  editor,
  onDraftChange,
  onApply,
  onCancel,
  onRemove,
}) {
  const { t } = useTranslation();
  const isOpen = Boolean(editor);
  const overlay = useOverlayAccessibility({
    isOpen,
    onClose: onCancel,
  });

  if (!editor) {
    return null;
  }

  const isBanner = editor.type === "banner";
  const titleId = `store-media-${editor.type}-title`;
  const descriptionId = `store-media-${editor.type}-description`;
  const validationId = `store-media-${editor.type}-validation`;
  const isValid = isValidStoreMediaUrl(
    editor.draftUrl
  );
  const hasInvalidValue =
    editor.draftUrl.trim() !== "" && !isValid;

  return (
    <div
      ref={overlay.overlayRef}
      className="seller-store-media-editor"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        className="seller-store-media-editor__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${descriptionId} ${validationId}`}
        tabIndex="-1"
      >
        <header className="seller-store-media-editor__header">
          <div>
            <h2 id={titleId}>
              {t(
                isBanner
                  ? "storeProfile.bannerEditorTitle"
                  : "storeProfile.logoEditorTitle"
              )}
            </h2>

            <p id={descriptionId}>
              {t(
                "storeProfile.mediaEditorDescription"
              )}
            </p>
          </div>

          <button
            type="button"
            className="seller-store-media-editor__close"
            onClick={onCancel}
            aria-label={t(
              "storeProfile.closeMediaEditor"
            )}
          >
            <span aria-hidden="true">
              &times;
            </span>
          </button>
        </header>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();

            if (isValid) {
              onApply();
            }
          }}
        >
          <label className="seller-store-media-editor__field">
            <span>
              {t(
                isBanner
                  ? "storeProfile.bannerImageUrl"
                  : "storeProfile.logoImageUrl"
              )}
            </span>

            <input
              ref={overlay.initialFocusRef}
              type="url"
              value={editor.draftUrl}
              maxLength={
                STORE_MEDIA_URL_MAX_LENGTH
              }
              placeholder="https://example.com/image.jpg"
              aria-invalid={hasInvalidValue}
              aria-describedby={validationId}
              onChange={(event) =>
                onDraftChange(
                  event.target.value
                )
              }
            />
          </label>

          <p
            id={validationId}
            className={
              hasInvalidValue
                ? "seller-store-media-editor__validation seller-store-media-editor__validation--error"
                : "seller-store-media-editor__validation"
            }
            role={
              hasInvalidValue
                ? "alert"
                : undefined
            }
          >
            {t(
              hasInvalidValue
                ? "storeProfile.mediaUrlInvalid"
                : "storeProfile.mediaUrlRequirements"
            )}
          </p>

          <footer className="seller-store-media-editor__actions">
            <button
              type="button"
              className="seller-store-media-editor__button seller-store-media-editor__button--remove"
              onClick={onRemove}
            >
              {t(
                isBanner
                  ? "storeProfile.removeBanner"
                  : "storeProfile.removeLogo"
              )}
            </button>

            <button
              type="button"
              className="seller-store-media-editor__button seller-store-media-editor__button--secondary"
              onClick={onCancel}
            >
              {t("storeProfile.mediaEditorCancel")}
            </button>

            <button
              type="submit"
              className="seller-store-media-editor__button seller-store-media-editor__button--primary"
              disabled={!isValid}
            >
              {t("storeProfile.mediaEditorApply")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default StoreMediaUrlDialog;
