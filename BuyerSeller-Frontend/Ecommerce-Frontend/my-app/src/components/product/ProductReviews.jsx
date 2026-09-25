import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import useAuthSession from "../../hooks/useAuthSession.js";
import {
  createReview,
  deleteMyReview,
  getMyReviewState,
  getProductReviews,
  updateMyReview,
} from "../../services/reviewService.js";
import { getReviewErrorMessage } from "../../services/reviewErrorMessages.js";

const PAGE_SIZE = 8;

const emptySummary = (productId, averageRating = 0, totalCount = 0) => ({
  productId: Number(productId) || 0,
  averageRating: Number(averageRating) || 0,
  totalCount: Number(totalCount) || 0,
  page: 1,
  pageSize: PAGE_SIZE,
  totalPages: 0,
  items: [],
});

const Stars = ({ rating, label }) => {
  const normalized = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <span className="product-reviews__stars" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index + 1 <= Math.round(normalized) ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
};

function ProductReviews({
  productId,
  initialAverageRating = 0,
  initialReviewCount = 0,
  onStatsChange,
}) {
  const { t, i18n } = useTranslation();
  const session = useAuthSession();
  const isBuyer = session?.role === "Buyer";
  const isGuest = !session;

  const [summary, setSummary] = useState(() =>
    emptySummary(productId, initialAverageRating, initialReviewCount)
  );
  const [mineState, setMineState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [eligibilityError, setEligibilityError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const publishStats = useCallback(
    (nextSummary) => {
      onStatsChange?.({
        averageRating: nextSummary.averageRating,
        totalCount: nextSummary.totalCount,
      });
    },
    [onStatsChange]
  );

  const applySummary = useCallback(
    (nextSummary, { append = false } = {}) => {
      setSummary((current) =>
        append
          ? {
              ...nextSummary,
              items: [...current.items, ...nextSummary.items],
            }
          : nextSummary
      );
      publishStats(nextSummary);
    },
    [publishStats]
  );

  const loadInitial = useCallback(
    async (signal) => {
      setIsLoading(true);
      setLoadError("");
      setEligibilityError("");

      const [reviewsResult, mineResult] = await Promise.allSettled([
        getProductReviews(productId, {
          page: 1,
          pageSize: PAGE_SIZE,
          signal,
        }),
        isBuyer
          ? getMyReviewState(productId, { signal })
          : Promise.resolve(null),
      ]);

      if (signal?.aborted) {
        return;
      }

      if (reviewsResult.status === "fulfilled") {
        applySummary(reviewsResult.value);
      } else if (reviewsResult.reason?.name !== "AbortError") {
        setLoadError(
          getReviewErrorMessage(
            reviewsResult.reason,
            t,
            "productReviews.errors.load"
          )
        );
      }

      if (mineResult.status === "fulfilled") {
        setMineState(mineResult.value);
      } else if (isBuyer && mineResult.reason?.name !== "AbortError") {
        setEligibilityError(
          getReviewErrorMessage(
            mineResult.reason,
            t,
            "productReviews.errors.eligibility"
          )
        );
      }

      setIsLoading(false);
    },
    [applySummary, isBuyer, productId, t]
  );

  useEffect(() => {
    const controller = new AbortController();
    setSummary(emptySummary(productId, initialAverageRating, initialReviewCount));
    setMineState(null);
    setIsEditing(false);
    setRating(0);
    setComment("");
    setEligibilityError("");
    setMutationError("");
    void loadInitial(controller.signal);

    return () => controller.abort();
  }, [
    initialAverageRating,
    initialReviewCount,
    loadInitial,
    productId,
  ]);

  const formattedAverage = useMemo(
    () => Number(summary.averageRating || 0).toFixed(1),
    [summary.averageRating]
  );

  const formatDate = useCallback(
    (value) => {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return new Intl.DateTimeFormat(
        i18n.language?.toLowerCase().startsWith("tr") ? "tr-TR" : "en-US",
        { dateStyle: "medium" }
      ).format(date);
    },
    [i18n.language]
  );

  const refreshAfterMutation = useCallback(async () => {
    const [reviews, myState] = await Promise.all([
      getProductReviews(productId, { page: 1, pageSize: PAGE_SIZE }),
      getMyReviewState(productId),
    ]);

    applySummary(reviews);
    setMineState(myState);
  }, [applySummary, productId]);

  const openEdit = () => {
    if (!mineState?.review) {
      return;
    }

    setMutationError("");
    setRating(mineState.review.rating);
    setComment(mineState.review.comment || "");
    setIsEditing(true);
  };

  const resetEditor = () => {
    setMutationError("");
    setRating(0);
    setComment("");
    setIsEditing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMutationError("");

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setMutationError(t("productReviews.errors.ratingRequired"));
      return;
    }

    setIsSaving(true);

    try {
      const payload = { rating, comment };

      if (mineState?.review) {
        await updateMyReview(productId, payload);
      } else {
        await createReview(productId, payload);
      }

      await refreshAfterMutation();
      resetEditor();
    } catch (error) {
      setMutationError(getReviewErrorMessage(error, t, "productReviews.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!mineState?.review || isSaving) {
      return;
    }

    if (!window.confirm(t("productReviews.deleteConfirm"))) {
      return;
    }

    setMutationError("");
    setIsSaving(true);

    try {
      await deleteMyReview(productId);
      await refreshAfterMutation();
      resetEditor();
    } catch (error) {
      setMutationError(getReviewErrorMessage(error, t, "productReviews.errors.delete"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || summary.page >= summary.totalPages) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError("");

    try {
      const next = await getProductReviews(productId, {
        page: summary.page + 1,
        pageSize: PAGE_SIZE,
      });
      applySummary(next, { append: true });
    } catch (error) {
      setLoadError(getReviewErrorMessage(error, t, "productReviews.errors.load"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const eligibilityMessage = (() => {
    if (mineState?.reasonCode === "REVIEW_DELIVERED_ORDER_REQUIRED") {
      return t("productReviews.eligibility.deliveredRequired");
    }

    if (mineState?.reasonCode === "PRODUCT_NOT_REVIEWABLE") {
      return t("productReviews.eligibility.productUnavailable");
    }

    return "";
  })();

  const showCreateForm = isBuyer && mineState?.canCreate && !mineState?.review;
  const showEditForm = isBuyer && mineState?.review && isEditing;

  return (
    <div className="product-reviews">
      <div className="product-reviews__summary">
        <div>
          <strong>{formattedAverage}</strong>
          <Stars
            rating={summary.averageRating}
            label={t("productReviews.ratingOutOfFive", {
              rating: formattedAverage,
            })}
          />
          <span>
            {t("productReviews.reviewCount", { count: summary.totalCount })}
          </span>
        </div>
      </div>

      {isLoading ? (
        <p className="product-reviews__status" role="status">
          {t("productReviews.loading")}
        </p>
      ) : loadError && summary.items.length === 0 ? (
        <div className="product-reviews__notice product-reviews__notice--error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadInitial()}>
            {t("productReviews.retry")}
          </button>
        </div>
      ) : (
        <>
          {summary.items.length === 0 ? (
            <p className="product-reviews__empty">{t("productReviews.empty")}</p>
          ) : (
            <div className="product-reviews__list">
              {summary.items.map((review) => {
                const isMine = review.reviewId === mineState?.review?.reviewId;

                return (
                  <article
                    key={review.reviewId}
                    className={`product-reviews__item${
                      isMine ? " product-reviews__item--mine" : ""
                    }`}
                  >
                    <div className="product-reviews__item-header">
                      <div>
                        <strong>{review.buyerName}</strong>
                        {isMine && (
                          <span className="product-reviews__mine-badge">
                            {t("productReviews.yourReview")}
                          </span>
                        )}
                      </div>
                      <time dateTime={review.reviewDate}>
                        {formatDate(review.reviewDate)}
                      </time>
                    </div>
                    <Stars
                      rating={review.rating}
                      label={t("productReviews.stars", { count: review.rating })}
                    />
                    {review.comment && <p>{review.comment}</p>}
                  </article>
                );
              })}
            </div>
          )}

          {summary.page < summary.totalPages && (
            <button
              type="button"
              className="product-reviews__load-more"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore
                ? t("productReviews.loadingMore")
                : t("productReviews.loadMore")}
            </button>
          )}

          {loadError && summary.items.length > 0 && (
            <p className="product-reviews__inline-error" role="alert">
              {loadError}
            </p>
          )}
        </>
      )}

      <section className="product-reviews__editor" aria-labelledby="product-review-editor-title">
        <div className="product-reviews__editor-heading">
          <div>
            <h3 id="product-review-editor-title">
              {mineState?.review
                ? t("productReviews.yourReviewTitle")
                : t("productReviews.writeTitle")}
            </h3>
            <p>{t("productReviews.writeHelp")}</p>
          </div>

          {mineState?.review && !isEditing && (
            <div className="product-reviews__editor-actions">
              <button type="button" onClick={openEdit} disabled={isSaving}>
                {t("productReviews.edit")}
              </button>
              <button
                type="button"
                className="product-reviews__delete"
                onClick={handleDelete}
                disabled={isSaving}
              >
                {t("productReviews.delete")}
              </button>
            </div>
          )}
        </div>

        {isGuest && (
          <div className="product-reviews__notice">
            <p>{t("productReviews.eligibility.signInRequired")}</p>
            <Link to="/login">{t("productReviews.signIn")}</Link>
          </div>
        )}

        {session && !isBuyer && (
          <div className="product-reviews__notice">
            <p>{t("productReviews.eligibility.buyerOnly")}</p>
          </div>
        )}

        {isBuyer && !mineState && isLoading && (
          <p className="product-reviews__status" role="status">
            {t("productReviews.checkingEligibility")}
          </p>
        )}

        {isBuyer && eligibilityError && (
          <div className="product-reviews__notice product-reviews__notice--error" role="alert">
            <p>{eligibilityError}</p>
          </div>
        )}

        {isBuyer && eligibilityMessage && !mineState?.review && (
          <div className="product-reviews__notice">
            <p>{eligibilityMessage}</p>
          </div>
        )}

        {mineState?.review && !isEditing && (
          <div className="product-reviews__existing">
            <Stars
              rating={mineState.review.rating}
              label={t("productReviews.stars", { count: mineState.review.rating })}
            />
            {mineState.review.comment && <p>{mineState.review.comment}</p>}
          </div>
        )}

        {(showCreateForm || showEditForm) && (
          <form className="product-reviews__form" onSubmit={handleSubmit}>
            <fieldset disabled={isSaving}>
              <legend>{t("productReviews.ratingLabel")}</legend>
              <div className="product-reviews__rating-buttons">
                {Array.from({ length: 5 }, (_, index) => {
                  const star = index + 1;
                  return (
                    <button
                      key={star}
                      type="button"
                      className={rating >= star ? "is-selected" : ""}
                      onClick={() => setRating(star)}
                      aria-label={t("productReviews.starChoice", { count: star })}
                      aria-pressed={rating === star}
                    >
                      ★
                    </button>
                  );
                })}
              </div>

              <label htmlFor="product-review-comment">
                {t("productReviews.commentLabel")}
              </label>
              <textarea
                id="product-review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder={t("productReviews.commentPlaceholder")}
              />
              <small>
                {t("productReviews.commentCount", { count: comment.length })}
              </small>
            </fieldset>

            {mutationError && (
              <p className="product-reviews__inline-error" role="alert">
                {mutationError}
              </p>
            )}

            <div className="product-reviews__form-actions">
              {showEditForm && (
                <button type="button" onClick={resetEditor} disabled={isSaving}>
                  {t("productReviews.cancel")}
                </button>
              )}
              <button type="submit" className="product-reviews__submit" disabled={isSaving}>
                {isSaving
                  ? t("productReviews.saving")
                  : mineState?.review
                    ? t("productReviews.update")
                    : t("productReviews.submit")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default ProductReviews;
