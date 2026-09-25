import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { STORE_MEDIA_PLATFORMS } from "../../services/storeMediaService.js";
import { getStoreMediaCopy } from "./storeMediaCopy.js";

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5V20h16v-9.5M3 10.5l1.6-5h14.8l1.6 5M8 20v-6h8v6" />
      <path d="M3 10.5c0 1.4 1.1 2.5 2.5 2.5S8 11.9 8 10.5c0 1.4 1.1 2.5 2.5 2.5S13 11.9 13 10.5c0 1.4 1.1 2.5 2.5 2.5S18 11.9 18 10.5c0 1.4 1.1 2.5 2.5 2.5S23 11.9 23 10.5" />
    </svg>
  );
}

function StoreMediaViewer({ items, activeIndex, onIndexChange, onClose }) {
  const { i18n } = useTranslation();
  const copy = getStoreMediaCopy(i18n.resolvedLanguage || i18n.language);
  const item = items?.[activeIndex] || null;

  useEffect(() => {
    if (!item) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft" && activeIndex > 0) {
        onIndexChange(activeIndex - 1);
      }
      if (event.key === "ArrowRight" && activeIndex < items.length - 1) {
        onIndexChange(activeIndex + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, item, items?.length, onClose, onIndexChange]);

  if (!item) {
    return null;
  }

  const externalLabel = copy.watchVideo;

  return createPortal(
    <div className="store-media-viewer" role="presentation" onMouseDown={onClose}>
      <section
        className="store-media-viewer__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="store-media-viewer__header">
          <div className="store-media-viewer__store">
            <span className="store-media-viewer__avatar">
              {item.storeLogoUrl ? (
                <img src={item.storeLogoUrl} alt="" />
              ) : (
                <StoreIcon />
              )}
            </span>
            <div>
              <strong>{item.storeName}</strong>
              <span>{copy.video}</span>
            </div>
          </div>

          <button type="button" className="store-media-viewer__close" onClick={onClose} aria-label={copy.close}>
            ×
          </button>
        </header>

        <div className="store-media-viewer__media">
          {item.platform === STORE_MEDIA_PLATFORMS.YOUTUBE && item.embedUrl ? (
            <iframe
              src={`${item.embedUrl}?autoplay=1&rel=0`}
              title={item.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" />
          ) : (
            <div className="store-media-viewer__fallback" aria-hidden="true">
              <span>▶</span>
            </div>
          )}
        </div>

        <div className="store-media-viewer__content">
          <h3>{item.title}</h3>

          <div className="store-media-viewer__actions">
            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
              {externalLabel} <span aria-hidden="true">↗</span>
            </a>
            {item.storeId ? (
              <Link to={`/stores/${item.storeId}`} onClick={onClose}>
                {copy.visitStore} <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
        </div>

        {items.length > 1 ? (
          <>
            <button
              type="button"
              className="store-media-viewer__nav store-media-viewer__nav--previous"
              disabled={activeIndex <= 0}
              onClick={() => onIndexChange(activeIndex - 1)}
              aria-label={copy.previous}
            >
              ‹
            </button>
            <button
              type="button"
              className="store-media-viewer__nav store-media-viewer__nav--next"
              disabled={activeIndex >= items.length - 1}
              onClick={() => onIndexChange(activeIndex + 1)}
              aria-label={copy.next}
            >
              ›
            </button>
          </>
        ) : null}
      </section>
    </div>,
    document.body
  );
}

export default StoreMediaViewer;
