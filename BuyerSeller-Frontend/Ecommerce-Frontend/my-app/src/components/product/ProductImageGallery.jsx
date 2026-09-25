// src/components/product/ProductImageGallery.jsx

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";

function ProductImageGallery({ images = [], productName = "", videoUrl = "" }) {
  const { t } = useTranslation();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const activeImage = images[activeImageIndex];
  const previewOverlay = useOverlayAccessibility({
    isOpen: isPreviewOpen,
    onClose: () => setIsPreviewOpen(false),
  });

  useEffect(() => {
    setActiveImageIndex(0);
    setIsPreviewOpen(false);
  }, [images]);

  const showPreviousImage = () => {
    setActiveImageIndex((currentIndex) =>
      currentIndex === 0 ? images.length - 1 : currentIndex - 1,
    );
  };

  const showNextImage = () => {
    setActiveImageIndex((currentIndex) =>
      (currentIndex + 1) % images.length,
    );
  };

  return (
    <section className="product-gallery">
      <div className="product-gallery__thumbs">
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            className={`product-gallery__thumb ${
              activeImageIndex === index ? "product-gallery__thumb--active" : ""
            }`}
            onClick={() => setActiveImageIndex(index)}
          >
            {image ? (
              <img src={image} alt={`${productName} ${index + 1}`} />
            ) : (
              <span>{t("buyer.product.imagePlaceholderShort")}</span>
            )}
          </button>
        ))}

        {videoUrl && (
          <a
            className="product-gallery__video-button"
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t("buyer.product.playVideo")}
            <span>{t("buyer.product.watchVideo")}</span>
          </a>
        )}
      </div>

      <div className="product-gallery__main">
        {activeImage ? (
          <button
            type="button"
            className="product-gallery__preview-trigger"
            onClick={() => setIsPreviewOpen(true)}
            aria-label={t("buyer.product.imagePreview.open", { product: productName })}
          >
            <img src={activeImage} alt={productName} />
            <span className="product-gallery__preview-hint" aria-hidden="true">
              ⛶
            </span>
          </button>
        ) : (
          <div className="product-gallery__placeholder">
            {t("buyer.product.imagePlaceholder")}
          </div>
        )}
      </div>

      {isPreviewOpen && activeImage && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={previewOverlay.overlayRef}
              className="product-image-preview"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setIsPreviewOpen(false);
                }
              }}
            >
              <div
                className="product-image-preview__dialog"
                role="dialog"
                aria-modal="true"
                aria-label={t("buyer.product.imagePreview.dialog", {
                  product: productName,
                })}
                tabIndex="-1"
              >
                <button
                  ref={previewOverlay.initialFocusRef}
                  type="button"
                  className="product-image-preview__close"
                  onClick={() => setIsPreviewOpen(false)}
                  aria-label={t("buyer.product.imagePreview.close")}
                >
                  ×
                </button>

                {images.length > 1 && (
                  <button
                    type="button"
                    className="product-image-preview__arrow product-image-preview__arrow--previous"
                    onClick={showPreviousImage}
                    aria-label={t("buyer.product.imagePreview.previous")}
                  >
                    ‹
                  </button>
                )}

                <img
                  className="product-image-preview__image"
                  src={activeImage}
                  alt={`${productName} ${activeImageIndex + 1}`}
                />

                {images.length > 1 && (
                  <button
                    type="button"
                    className="product-image-preview__arrow product-image-preview__arrow--next"
                    onClick={showNextImage}
                    aria-label={t("buyer.product.imagePreview.next")}
                  >
                    ›
                  </button>
                )}

                {images.length > 1 && (
                  <span className="product-image-preview__counter">
                    {activeImageIndex + 1} / {images.length}
                  </span>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

export default ProductImageGallery;
