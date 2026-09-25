import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  STORE_MEDIA_PLACEMENTS,
  createSellerStoreMedia,
  createStoreVideoPreview,
  detectStoreVideoPlatform,
  listSellerStoreMedia,
  removeSellerStoreMedia,
} from "../../services/storeMediaService.js";
import { getStoreMediaCopy, interpolateStoreMediaCopy } from "../store/storeMediaCopy.js";
import "../../styles/seller/sellerStoreMedia.css";

const initialForm = Object.freeze({
  title: "",
  videoUrl: "",
  placement: STORE_MEDIA_PLACEMENTS.HOME_STORY,
});

const isExpired = (value) => {
  const timestamp = new Date(value || "").getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
};

const getRemainingLabel = (expiresAt, copy) => {
  if (!expiresAt) {
    return copy.permanent;
  }

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) {
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

function PlatformBadge({ platform, copy }) {
  if (!platform) {
    return null;
  }

  return (
    <span className={`seller-store-media__platform seller-store-media__platform--${platform.toLowerCase()}`}>
      {platform === "TIKTOK" ? copy.tiktok : copy.youtube}
    </span>
  );
}

function StoreMediaCard({ item, copy, onRemove, isRemoving }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <article className={`seller-store-media__item seller-store-media__item--${item.placement.toLowerCase()}`}>
      <div className="seller-store-media__item-visual">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <span className="seller-store-media__item-fallback" aria-hidden="true" />
        )}
        <span className="seller-store-media__item-shade" aria-hidden="true" />
        <PlatformBadge platform={item.platform} copy={copy} />
        <span className="seller-store-media__item-time">
          {getRemainingLabel(item.expiresAt, copy)}
        </span>
      </div>

      <div className="seller-store-media__item-body">
        <strong>{item.title}</strong>
        <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
          {item.platform === "TIKTOK" ? copy.watchOnTikTok : copy.watchOnYouTube} ↗
        </a>

        {confirming ? (
          <div className="seller-store-media__remove-confirm" role="group" aria-label={copy.removeConfirm}>
            <span>{copy.removeConfirm}</span>
            <div>
              <button type="button" onClick={() => setConfirming(false)} disabled={isRemoving}>
                {copy.cancel}
              </button>
              <button type="button" className="is-danger" onClick={() => onRemove(item.storeMediaId)} disabled={isRemoving}>
                {copy.yesRemove}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="seller-store-media__remove" onClick={() => setConfirming(true)}>
            {copy.remove}
          </button>
        )}
      </div>
    </article>
  );
}

function SellerStoreMediaPanel({
  enabled = true,
  canPublish = true,
  showHeading = true,
  storeName = "",
  storeBannerUrl = "",
  storeLogoUrl = "",
}) {
  const { i18n } = useTranslation();
  const copy = getStoreMediaCopy(i18n.resolvedLanguage || i18n.language);
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState(enabled ? "loading" : "disabled");
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const load = () => {
    if (!enabled) {
      setStatus("disabled");
      return;
    }

    setStatus("loading");
    setError("");

    listSellerStoreMedia()
      .then((nextItems) => {
        setItems(nextItems);
        setStatus("success");
      })
      .catch((loadError) => {
        setError(loadError?.message || copy.loadError);
        setStatus(loadError?.status === 404 ? "missing-store" : "error");
      });
  };

  useEffect(() => {
    load();
    // The panel intentionally reloads when a store becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const homeStories = useMemo(
    () => items.filter((item) => item.placement === STORE_MEDIA_PLACEMENTS.HOME_STORY),
    [items]
  );
  const showcase = useMemo(
    () => items.filter((item) => item.placement === STORE_MEDIA_PLACEMENTS.STORE_SHOWCASE),
    [items]
  );
  const activeHomeCount = homeStories.filter((item) => !isExpired(item.expiresAt)).length;
  const platform = detectStoreVideoPlatform(form.videoUrl);
  const preview = createStoreVideoPreview(form.videoUrl, storeBannerUrl || storeLogoUrl || null);
  const formHasValidVideo = Boolean(platform);
  const canSubmit =
    enabled &&
    canPublish &&
    form.title.trim().length > 0 &&
    form.title.trim().length <= 120 &&
    formHasValidVideo &&
    !isPublishing &&
    !(form.placement === STORE_MEDIA_PLACEMENTS.HOME_STORY && activeHomeCount >= 2);

  const submit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      if (!formHasValidVideo) {
        setError(copy.invalidVideoUrl);
      }
      return;
    }

    setIsPublishing(true);
    setError("");

    try {
      const created = await createSellerStoreMedia(form);
      setItems((current) => [created, ...current]);
      setForm(initialForm);
    } catch (publishError) {
      setError(publishError?.message || copy.publishError);
    } finally {
      setIsPublishing(false);
    }
  };

  const remove = async (storeMediaId) => {
    setRemovingId(storeMediaId);
    setError("");

    try {
      await removeSellerStoreMedia(storeMediaId);
      setItems((current) => current.filter((item) => item.storeMediaId !== storeMediaId));
    } catch (removeError) {
      setError(removeError?.message || copy.removeError);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="seller-store-media" aria-labelledby="seller-store-media-title">
      {showHeading ? (
        <div className="seller-store-media__heading">
          <div>
            <h2 id="seller-store-media-title">{copy.storeMedia}</h2>
            <p>{copy.sellerIntro}</p>
          </div>
          <span className="seller-store-media__limit">
            {copy.homeStory}: <strong>{activeHomeCount}/2</strong>
          </span>
        </div>
      ) : (
        <div className="seller-store-media__standalone-toolbar">
          <div>
            <h2 id="seller-store-media-title">{copy.addMedia}</h2>
            <p>{copy.sellerIntro}</p>
          </div>
          <span className="seller-store-media__limit">
            {copy.homeStory}: <strong>{activeHomeCount}/2</strong>
          </span>
        </div>
      )}

      {!enabled || status === "missing-store" ? (
        <div className="seller-store-media__notice" role="status">{copy.storeRequired}</div>
      ) : (
        <>
          {!canPublish ? (
            <div className="seller-store-media__notice seller-store-media__notice--warning" role="status">
              {copy.storeMustBePublic}
            </div>
          ) : null}
          <div className="seller-store-media__editor">
          <form className="seller-store-media__form" onSubmit={submit}>
            <label>
              <span>{copy.title}</span>
              <input
                type="text"
                maxLength={120}
                value={form.title}
                placeholder={copy.titlePlaceholder}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <label>
              <span>{copy.videoUrl}</span>
              <input
                type="url"
                value={form.videoUrl}
                placeholder={copy.videoUrlPlaceholder}
                onChange={(event) => {
                  setError("");
                  setForm((current) => ({ ...current, videoUrl: event.target.value }));
                }}
              />
              {form.videoUrl ? (
                <small className={formHasValidVideo ? "is-valid" : "is-invalid"}>
                  {formHasValidVideo
                    ? `${copy.detected}: ${platform === "TIKTOK" ? copy.tiktok : copy.youtube}`
                    : copy.invalidVideoUrl}
                </small>
              ) : null}
            </label>

            <fieldset className="seller-store-media__placements">
              <legend>{copy.addMedia}</legend>

              <label className={form.placement === STORE_MEDIA_PLACEMENTS.HOME_STORY ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="store-media-placement"
                  value={STORE_MEDIA_PLACEMENTS.HOME_STORY}
                  checked={form.placement === STORE_MEDIA_PLACEMENTS.HOME_STORY}
                  onChange={(event) => setForm((current) => ({ ...current, placement: event.target.value }))}
                />
                <span>
                  <strong>{copy.homeStory}</strong>
                  <small>{copy.homeStoryHint}</small>
                </span>
              </label>

              <label className={form.placement === STORE_MEDIA_PLACEMENTS.STORE_SHOWCASE ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="store-media-placement"
                  value={STORE_MEDIA_PLACEMENTS.STORE_SHOWCASE}
                  checked={form.placement === STORE_MEDIA_PLACEMENTS.STORE_SHOWCASE}
                  onChange={(event) => setForm((current) => ({ ...current, placement: event.target.value }))}
                />
                <span>
                  <strong>{copy.storeShowcase}</strong>
                  <small>{copy.storeShowcaseHint}</small>
                </span>
              </label>
            </fieldset>

            {error && status !== "error" ? <p className="seller-store-media__error" role="alert">{error}</p> : null}

            <button type="submit" className="seller-store-media__publish" disabled={!canSubmit}>
              {isPublishing ? copy.publishing : copy.publish}
            </button>
          </form>

          <div className="seller-store-media__preview" aria-label={copy.preview}>
            <span className="seller-store-media__preview-label">{copy.preview}</span>
            <div className={`seller-store-media__preview-card seller-store-media__preview-card--${form.placement.toLowerCase()}`}>
              {preview.thumbnailUrl ? (
                <img src={preview.thumbnailUrl} alt="" />
              ) : (
                <span className="seller-store-media__preview-fallback" aria-hidden="true" />
              )}
              <span className="seller-store-media__preview-shade" aria-hidden="true" />
              <PlatformBadge platform={platform} copy={copy} />
              <div className="seller-store-media__preview-copy">
                <strong>{form.title.trim() || copy.titlePlaceholder}</strong>
                <span>{storeName || "Shopera Store"}</span>
                <small>
                  {form.placement === STORE_MEDIA_PLACEMENTS.HOME_STORY
                    ? "24h"
                    : copy.permanent}
                </small>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {status === "loading" ? (
        <div className="seller-store-media__loading" role="status">{copy.mediaLoading}</div>
      ) : null}

      {status === "error" ? (
        <div className="seller-store-media__load-error" role="alert">
          <span>{error || copy.loadError}</span>
          <button type="button" onClick={load}>{copy.retry}</button>
        </div>
      ) : null}

      {status === "success" ? (
        <div className="seller-store-media__library">
          <section>
            <div className="seller-store-media__subheading">
              <h3>{copy.activeStories}</h3>
              <span>{activeHomeCount}/2</span>
            </div>
            {homeStories.length ? (
              <div className="seller-store-media__items seller-store-media__items--stories">
                {homeStories.map((item) => (
                  <StoreMediaCard
                    key={item.storeMediaId}
                    item={item}
                    copy={copy}
                    onRemove={remove}
                    isRemoving={removingId === item.storeMediaId}
                  />
                ))}
              </div>
            ) : (
              <p className="seller-store-media__empty">{copy.noStories}</p>
            )}
          </section>

          <section>
            <div className="seller-store-media__subheading">
              <h3>{copy.permanentShowcase}</h3>
              <span>{showcase.length}</span>
            </div>
            {showcase.length ? (
              <div className="seller-store-media__items seller-store-media__items--showcase">
                {showcase.map((item) => (
                  <StoreMediaCard
                    key={item.storeMediaId}
                    item={item}
                    copy={copy}
                    onRemove={remove}
                    isRemoving={removingId === item.storeMediaId}
                  />
                ))}
              </div>
            ) : (
              <p className="seller-store-media__empty">{copy.noShowcase}</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default SellerStoreMediaPanel;
