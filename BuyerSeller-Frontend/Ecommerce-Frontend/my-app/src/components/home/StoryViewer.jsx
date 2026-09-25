// src/components/home/StoryViewer.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import useCart from "../../hooks/useCart";
import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";
import { isAuthenticated } from "../../services/authService";
import { formatCurrency } from "../../utils/formatCurrency";

const AUTO_ADVANCE_DELAY = 5000;
const SWIPE_THRESHOLD = 48;
const SWIPE_HINT_KEY = "storeStoriesSwipeHintSeen";

function getRelativeTime(dateValue) {
  const createdAt = new Date(dateValue).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - createdAt) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.round(diffHours / 24)}d`;
}

function StoreAvatar({ story }) {
  const initial = story.storeName?.charAt(0).toUpperCase() || "S";

  return (
    <span className="story-viewer__store-avatar">
      {story.storeLogo ? (
        <img src={story.storeLogo} alt={`${story.storeName} logo`} />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}

function StoryProductCard({ product, onAddToCart }) {
  const productPath = product.productId
    ? `/products/${product.productId}`
    : null;
  const canPurchase =
    Boolean(product.productId && product.variantId) && product.price != null;

  return (
    <article className="story-product-card">
      {productPath ? (
        <Link to={productPath} className="story-product-card__image">
          {product.productImage ? (
            <img src={product.productImage} alt={product.productName} />
          ) : (
            <span>Product</span>
          )}
        </Link>
      ) : (
        <span className="story-product-card__image">
          <span>Product</span>
        </span>
      )}

      <div className="story-product-card__body">
        {productPath ? (
          <Link to={productPath} className="story-product-card__name">
            {product.productName}
          </Link>
        ) : (
          <span className="story-product-card__name">{product.productName}</span>
        )}

        <div className="story-product-card__meta">
          {product.price != null && <span>{formatCurrency(product.price)}</span>}
        </div>

        <div className="story-product-card__actions">
          {productPath && <Link to={productPath}>View</Link>}
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={!canPurchase}
          >
            Add
          </button>
        </div>
      </div>
    </article>
  );
}

function StoryMedia({
  story,
  isMuted,
  isPaused,
  onEnded,
  onMediaError,
  onVideoProgress,
}) {
  const videoRef = useRef(null);
  const [hasMediaError, setHasMediaError] = useState(false);
  const isVideo = story.mediaType === "video" && story.mediaUrl && !hasMediaError;
  const isImage = story.mediaType === "image" && story.mediaUrl && !hasMediaError;

  useEffect(() => {
    setHasMediaError(false);
  }, [story.storyId]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.muted = isMuted;

    if (isPaused) {
      videoRef.current.pause();
      return;
    }

    videoRef.current.play().catch(() => {
      setHasMediaError(true);
      onMediaError();
    });
  }, [isMuted, isPaused, onMediaError]);

  const handleMediaError = () => {
    setHasMediaError(true);
    onMediaError();
  };

  const handleTimeUpdate = (event) => {
    const video = event.currentTarget;

    if (!video.duration) {
      return;
    }

    onVideoProgress(Math.min((video.currentTime / video.duration) * 100, 100));
  };

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        key={story.storyId}
        src={story.mediaUrl}
        poster={story.thumbnailUrl}
        autoPlay
        muted={isMuted}
        playsInline
        onEnded={onEnded}
        onError={handleMediaError}
        onTimeUpdate={handleTimeUpdate}
      />
    );
  }

  if (isImage) {
    return (
      <img
        src={story.mediaUrl}
        alt={story.caption || story.storeName}
        onError={handleMediaError}
      />
    );
  }

  return (
    <div className="story-viewer__placeholder">
      <span className="story-viewer__shape story-viewer__shape--phone" />
      <span className="story-viewer__shape story-viewer__shape--card" />
      <span className="story-viewer__shape story-viewer__shape--spark" />
    </div>
  );
}

function StoryViewer({
  isOpen,
  storeGroups = [],
  initialStoreIndex = 0,
  seenStoryIds = [],
  onStorySeen,
  onClose,
}) {
  const { t } = useTranslation();
  const [activeStoreIndex, setActiveStoreIndex] = useState(initialStoreIndex);
  const [storyIndexByStore, setStoryIndexByStore] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasMediaError, setHasMediaError] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(
    () => localStorage.getItem(SWIPE_HINT_KEY) !== "true"
  );
  const touchStartYRef = useRef(null);
  const lastWheelAtRef = useRef(0);
  const hasInitializedOpenRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();

  const activeStore = storeGroups[activeStoreIndex];
  const activeStoryIndex = storyIndexByStore[activeStore?.storeId] || 0;
  const activeStory = activeStore?.stories[activeStoryIndex];
  const storyOverlay = useOverlayAccessibility({
    isOpen: Boolean(isOpen && activeStory && activeStore),
    onClose,
  });

  const firstUnseenIndexByStore = useMemo(() => {
    return storeGroups.reduce((indexMap, store) => {
      const firstUnseenIndex = store.stories.findIndex(
        (story) => !seenStoryIds.includes(story.storyId)
      );

      return {
        ...indexMap,
        [store.storeId]: firstUnseenIndex >= 0 ? firstUnseenIndex : 0,
      };
    }, {});
  }, [seenStoryIds, storeGroups]);

  const setStoreStoryIndex = useCallback((store, nextStoryIndex) => {
    if (!store) {
      return;
    }

    setStoryIndexByStore((currentIndexes) => ({
      ...currentIndexes,
      [store.storeId]: Math.max(
        0,
        Math.min(nextStoryIndex, store.stories.length - 1)
      ),
    }));
  }, []);

  const goToStore = useCallback(
    (nextStoreIndex) => {
      if (nextStoreIndex < 0) {
        return;
      }

      if (nextStoreIndex >= storeGroups.length) {
        onClose();
        return;
      }

      const nextStore = storeGroups[nextStoreIndex];

      setActiveStoreIndex(nextStoreIndex);
      setStoryIndexByStore((currentIndexes) => ({
        ...currentIndexes,
        [nextStore.storeId]:
          currentIndexes[nextStore.storeId] ??
          firstUnseenIndexByStore[nextStore.storeId] ??
          0,
      }));
    },
    [firstUnseenIndexByStore, onClose, storeGroups]
  );

  const goToPreviousStore = useCallback(() => {
    goToStore(activeStoreIndex - 1);
  }, [activeStoreIndex, goToStore]);

  const goToNextStore = useCallback(() => {
    goToStore(activeStoreIndex + 1);
  }, [activeStoreIndex, goToStore]);

  const goToPreviousStory = useCallback(() => {
    if (!activeStore) {
      return;
    }

    if (activeStoryIndex > 0) {
      setStoreStoryIndex(activeStore, activeStoryIndex - 1);
      return;
    }

    goToPreviousStore();
  }, [activeStore, activeStoryIndex, goToPreviousStore, setStoreStoryIndex]);

  const goToNextStory = useCallback(() => {
    if (!activeStore) {
      return;
    }

    if (activeStoryIndex < activeStore.stories.length - 1) {
      setStoreStoryIndex(activeStore, activeStoryIndex + 1);
      return;
    }

    goToNextStore();
  }, [activeStore, activeStoryIndex, goToNextStore, setStoreStoryIndex]);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedOpenRef.current = false;
      return;
    }

    if (hasInitializedOpenRef.current) {
      return;
    }

    hasInitializedOpenRef.current = true;

    const initialStore = storeGroups[initialStoreIndex];

    setActiveStoreIndex(initialStoreIndex);
    setStoryIndexByStore(
      initialStore
        ? {
            [initialStore.storeId]:
              firstUnseenIndexByStore[initialStore.storeId] ?? 0,
          }
        : {}
    );
    setIsPaused(false);
    setProgress(0);
    setHasMediaError(false);
  }, [firstUnseenIndexByStore, initialStoreIndex, isOpen, storeGroups]);

  useEffect(() => {
    setProgress(0);
    setHasMediaError(false);
  }, [activeStoreIndex, activeStoryIndex]);

  useEffect(() => {
    if (!isOpen || !activeStory) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onStorySeen?.(activeStory.storyId);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeStory, isOpen, onStorySeen]);

  useEffect(() => {
    if (!isOpen || !activeStory || isPaused) {
      return undefined;
    }

    const shouldUseTimer =
      activeStory.mediaType !== "video" || !activeStory.mediaUrl || hasMediaError;
    const startTime = Date.now() - (progress / 100) * AUTO_ADVANCE_DELAY;

    if (!shouldUseTimer) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const nextProgress = Math.min(
        ((Date.now() - startTime) / AUTO_ADVANCE_DELAY) * 100,
        100
      );

      setProgress(nextProgress);

      if (nextProgress >= 100) {
        window.clearInterval(intervalId);
        goToNextStory();
      }
    }, 80);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeStory, goToNextStory, hasMediaError, isOpen, isPaused, progress]);

  const handleAddToCart = (product) => {
    if (!product.productId || !product.variantId || product.price == null) {
      return;
    }
    if (!isAuthenticated()) {
      navigate("/login", {
        state: {
          from: location.pathname,
          message: "Please sign in to add products to your cart.",
        },
      });
      return;
    }

    addToCart({
      id: product.variantId,
      productId: product.productId,
      variantId: product.variantId,
      name: product.productName,
      image: product.productImage,
      price: product.price,
      quantity: 1,
    });
  };

  const handleMediaError = useCallback(() => {
    setHasMediaError(true);
  }, []);

  const handleWheel = (event) => {
    if (Math.abs(event.deltaY) < 20) {
      return;
    }

    const now = Date.now();

    if (now - lastWheelAtRef.current < 520) {
      return;
    }

    lastWheelAtRef.current = now;

    if (event.deltaY > 0) {
      goToNextStore();
      return;
    }

    goToPreviousStore();
  };

  const handleTouchStart = (event) => {
    touchStartYRef.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event) => {
    if (touchStartYRef.current === null) {
      return;
    }

    const deltaY = touchStartYRef.current - event.changedTouches[0].clientY;

    touchStartYRef.current = null;

    if (Math.abs(deltaY) < SWIPE_THRESHOLD) {
      return;
    }

    if (showSwipeHint) {
      localStorage.setItem(SWIPE_HINT_KEY, "true");
      setShowSwipeHint(false);
    }

    if (deltaY > 0) {
      goToNextStore();
      return;
    }

    goToPreviousStore();
  };

  const dismissSwipeHint = () => {
    if (!showSwipeHint) {
      return;
    }

    localStorage.setItem(SWIPE_HINT_KEY, "true");
    setShowSwipeHint(false);
  };

  const handleDialogKeyDown = (event) => {
    const actionByKey = {
      ArrowLeft: goToPreviousStory,
      ArrowRight: goToNextStory,
      ArrowUp: goToPreviousStore,
      ArrowDown: goToNextStore,
    };
    const action = actionByKey[event.key];

    if (action) {
      event.preventDefault();
      action();
    }
  };

  if (!isOpen || !activeStory || !activeStore) {
    return null;
  }

  const shouldShowProgressFill =
    activeStory.mediaType !== "video" || !activeStory.mediaUrl || hasMediaError;

  return createPortal(
    <div
      ref={storyOverlay.overlayRef}
      className="story-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-viewer-title"
      aria-describedby="story-viewer-description"
      tabIndex="-1"
      onClick={onClose}
      onWheel={handleWheel}
      onKeyDown={handleDialogKeyDown}
    >
      <h2 id="story-viewer-title" className="visually-hidden">
        {t("buyer.stories.title", { storeName: activeStory.storeName })}
      </h2>
      <p id="story-viewer-description" className="visually-hidden">
        {activeStory.caption || t("buyer.stories.description")}
      </p>
      <div
        className="story-viewer-shell"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <article className="story-viewer-card">
          <StoryMedia
            story={activeStory}
            isMuted={isMuted}
            isPaused={isPaused}
            onEnded={goToNextStory}
            onMediaError={handleMediaError}
            onVideoProgress={setProgress}
          />

          <button
            type="button"
            className="story-viewer__tap-zone story-viewer__tap-zone--left"
            aria-label={t("buyer.stories.previous")}
            onClick={goToPreviousStory}
          />
          <button
            type="button"
            className="story-viewer__tap-zone story-viewer__tap-zone--right"
            aria-label={t("buyer.stories.next")}
            onClick={goToNextStory}
          />

          <div className="story-viewer__top">
            <div
              className="story-viewer__progress"
              aria-label={t("buyer.stories.progress")}
            >
              {activeStore.stories.map((story, index) => {
                const fill =
                  index < activeStoryIndex
                    ? 100
                    : index === activeStoryIndex && shouldShowProgressFill
                      ? progress
                      : index === activeStoryIndex
                        ? progress
                        : 0;

                return (
                  <span key={story.storyId}>
                    <span style={{ width: `${fill}%` }} />
                  </span>
                );
              })}
            </div>

            <div className="story-viewer__meta-row">
              <header className="story-viewer__store">
                <StoreAvatar story={activeStory} />
                <div>
                  <span className="story-viewer__store-name">
                    {activeStory.storeName}
                  </span>
                  <span>{getRelativeTime(activeStory.createdDate)}</span>
                </div>
              </header>

              <div className="story-viewer__tools">
                <button
                  type="button"
                  aria-label={
                    isMuted
                      ? t("buyer.stories.unmute")
                      : t("buyer.stories.mute")
                  }
                  onClick={() => setIsMuted((current) => !current)}
                >
                  {isMuted
                    ? t("buyer.stories.muted")
                    : t("buyer.stories.sound")}
                </button>
                <button
                  type="button"
                  aria-label={
                    isPaused
                      ? t("buyer.stories.play")
                      : t("buyer.stories.pause")
                  }
                  onClick={() => setIsPaused((current) => !current)}
                >
                  {isPaused
                    ? t("buyer.stories.play")
                    : t("buyer.stories.pause")}
                </button>
                <button
                  type="button"
                  aria-label={t("buyer.stories.moreOptions")}
                >
                  ...
                </button>
                <button
                  ref={storyOverlay.initialFocusRef}
                  type="button"
                  aria-label={t("buyer.stories.close")}
                  onClick={onClose}
                >
                  &times;
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="story-viewer__nav story-viewer__nav--prev"
            aria-label={t("buyer.stories.previous")}
            onClick={goToPreviousStory}
            disabled={activeStoreIndex === 0 && activeStoryIndex === 0}
          >
            &#8249;
          </button>

          <button
            type="button"
            className="story-viewer__nav story-viewer__nav--next"
            aria-label={t("buyer.stories.next")}
            onClick={goToNextStory}
          >
            &#8250;
          </button>

          <div className="story-viewer__bottom">
            {showSwipeHint && (
              <button
                type="button"
                className="story-viewer__swipe-hint"
                onClick={dismissSwipeHint}
              >
                {t("buyer.stories.swipeHint")}
              </button>
            )}

            <p>{activeStory.caption}</p>

            <div className="story-viewer__products">
              {activeStory.products.map((product) => (
                <StoryProductCard
                  key={`${activeStory.storyId}-${product.variantId}`}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>,
    document.body
  );
}

export default StoryViewer;
