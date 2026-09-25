import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { listHomeStoreStories } from "../../services/storeMediaService.js";
import StoreMediaViewer from "../store/StoreMediaViewer.jsx";
import { getStoreMediaCopy, interpolateStoreMediaCopy } from "../store/storeMediaCopy.js";

const SEEN_STORIES_KEY = "shopera:seen-store-media";

const readSeen = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_STORIES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getTimeLeft = (expiresAt, copy) => {
  const expires = new Date(expiresAt || "").getTime();
  const diff = expires - Date.now();

  if (!Number.isFinite(expires) || diff <= 0) {
    return copy.expired;
  }

  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) {
    return interpolateStoreMediaCopy(copy.minutesLeft, { minutes });
  }

  return interpolateStoreMediaCopy(copy.hoursLeft, {
    hours: Math.ceil(minutes / 60),
  });
};

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5V20h16v-9.5M3 10.5l1.6-5h14.8l1.6 5M8 20v-6h8v6" />
      <path d="M3 10.5c0 1.4 1.1 2.5 2.5 2.5S8 11.9 8 10.5c0 1.4 1.1 2.5 2.5 2.5S13 11.9 13 10.5c0 1.4 1.1 2.5 2.5 2.5S18 11.9 18 10.5c0 1.4 1.1 2.5 2.5 2.5S23 11.9 23 10.5" />
    </svg>
  );
}

function StoreStories() {
  const { i18n } = useTranslation();
  const copy = getStoreMediaCopy(i18n.resolvedLanguage || i18n.language);
  const trackRef = useRef(null);
  const [stories, setStories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [activeIndex, setActiveIndex] = useState(null);
  const [seenIds, setSeenIds] = useState(readSeen);

  useEffect(() => {
    const controller = new AbortController();

    listHomeStoreStories({ signal: controller.signal })
      .then((items) => {
        setStories(items);
        setStatus("success");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error("Failed to load Store Stories:", error);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, []);

  const storyIds = useMemo(() => stories.map((item) => item.storeMediaId), [stories]);

  const openStory = (index) => {
    const id = storyIds[index];
    setActiveIndex(index);

    if (id && !seenIds.includes(id)) {
      const next = [...seenIds, id];
      setSeenIds(next);
      localStorage.setItem(SEEN_STORIES_KEY, JSON.stringify(next));
    }
  };

  const scrollStories = (direction) => {
    trackRef.current?.scrollBy({
      left: direction * 480,
      behavior: "smooth",
    });
  };

  const isEmpty = status === "success" && stories.length === 0;
  const hasError = status === "error";

  return (
    <section className="store-stories" aria-label={copy.storeStories}>
      <div className="container">
        <div className="store-stories__header">
          <h2>{copy.storeStories}</h2>
        </div>

        <div className="store-stories__viewport">
          {status === "loading" ? (
            <div className="store-stories__track store-stories__track--loading" role="status" aria-label={copy.storyLoading}>
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : isEmpty || hasError ? (
            <div className="store-stories__empty-card" aria-hidden="true">
              <span className="store-stories__empty-shape store-stories__empty-shape--one" />
              <span className="store-stories__empty-shape store-stories__empty-shape--two" />
              <span className="store-stories__empty-avatar">
                <StoreIcon />
              </span>
              <span className="store-stories__empty-play">▶</span>
            </div>
          ) : (
            <div className="store-stories__track" ref={trackRef}>
              {stories.map((story, index) => {
                const isSeen = seenIds.includes(story.storeMediaId);
                return (
                  <button
                    key={story.storeMediaId}
                    type="button"
                    className={`store-story-card ${isSeen ? "is-seen" : ""}`}
                    onClick={() => openStory(index)}
                    aria-label={`${copy.watchStory}: ${story.title}`}
                  >
                    {(() => {
                      const thumbnailIsOnlyStoreLogo =
                        story.thumbnailUrl &&
                        story.storeLogoUrl &&
                        story.thumbnailUrl === story.storeLogoUrl &&
                        !story.storeBannerUrl;

                      const visualUrl = thumbnailIsOnlyStoreLogo
                        ? null
                        : story.thumbnailUrl || story.storeBannerUrl || null;

                      return (
                        <>
                          <span
                            className="store-story-card__background store-story-card__background--fallback"
                            aria-hidden="true"
                          />
                          {visualUrl ? (
                            <img
                              className="store-story-card__background store-story-card__background--image"
                              src={visualUrl}
                              alt=""
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                        </>
                      );
                    })()}
                    <span className="store-story-card__shade" aria-hidden="true" />

                    <span className="store-story-card__topline">
                      <span className="store-story-card__avatar">
                        {story.storeLogoUrl ? (
                          <img src={story.storeLogoUrl} alt="" />
                        ) : (
                          <StoreIcon />
                        )}
                      </span>
                    </span>

                    <span className="store-story-card__copy">
                      <strong>{story.title}</strong>
                      <span>{story.storeName}</span>
                      <small>{getTimeLeft(story.expiresAt, copy)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {status === "success" && stories.length > 4 ? (
            <>
              <button type="button" className="store-stories__scroll store-stories__scroll--left" onClick={() => scrollStories(-1)} aria-label={copy.previous}>
                ‹
              </button>
              <button type="button" className="store-stories__scroll store-stories__scroll--right" onClick={() => scrollStories(1)} aria-label={copy.next}>
                ›
              </button>
            </>
          ) : null}
        </div>
      </div>

      {activeIndex !== null ? (
        <StoreMediaViewer
          items={stories}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </section>
  );
}

export default StoreStories;
