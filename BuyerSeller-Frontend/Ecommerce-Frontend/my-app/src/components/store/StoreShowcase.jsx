import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { listStoreShowcase } from "../../services/storeMediaService.js";
import StoreMediaViewer from "./StoreMediaViewer.jsx";
import { getStoreMediaCopy } from "./storeMediaCopy.js";
import "../../styles/catalog/storeShowcase.css";

function StoreShowcase({ storeId }) {
  const { i18n } = useTranslation();
  const copy = getStoreMediaCopy(i18n.resolvedLanguage || i18n.language);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    if (!storeId) {
      setItems([]);
      setStatus("success");
      return undefined;
    }

    const controller = new AbortController();
    setStatus("loading");

    listStoreShowcase(storeId, { signal: controller.signal })
      .then((nextItems) => {
        setItems(nextItems);
        setStatus("success");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error("Failed to load Store Showcase:", error);
          setItems([]);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [storeId]);

  const hasItems = status === "success" && items.length > 0;

  return (
    <section
      id="store-videos"
      className="store-showcase"
      aria-labelledby="store-showcase-title"
    >
      <div className="store-showcase__heading">
        <h2 id="store-showcase-title">{copy.storeVideos}</h2>
      </div>

      {status === "loading" ? (
        <div
          className="store-showcase__track store-showcase__track--loading"
          role="status"
          aria-label={copy.mediaLoading}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : hasItems ? (
        <div className="store-showcase__track">
          {items.map((item, index) => (
            <button
              type="button"
              className="store-showcase__card"
              key={item.storeMediaId}
              onClick={() => setActiveIndex(index)}
            >
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt="" loading="lazy" />
              ) : (
                <span className="store-showcase__fallback" aria-hidden="true" />
              )}
              <span className="store-showcase__shade" aria-hidden="true" />
              <span className="store-showcase__play" aria-hidden="true">▶</span>
              <span className="store-showcase__copy">
                <strong>{item.title}</strong>
                <span>{copy.watchVideo} →</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="store-showcase__empty-stage" aria-hidden="true">
          <div className="store-showcase__empty-screen">
            <span className="store-showcase__empty-glow store-showcase__empty-glow--one" />
            <span className="store-showcase__empty-glow store-showcase__empty-glow--two" />
            <span className="store-showcase__empty-play">▶</span>
          </div>
        </div>
      )}

      {activeIndex !== null ? (
        <StoreMediaViewer
          items={items}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </section>
  );
}

export default StoreShowcase;
