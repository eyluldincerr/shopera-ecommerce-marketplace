import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import useHorizontalRail from "../../hooks/useHorizontalRail.js";
import { getCategoryPath } from "../../services/categoryService.js";

function HomeCategoryRail({ categories = [] }) {
  const { t } = useTranslation();
  const {
    railRef,
    canScrollBack,
    canScrollForward,
    scrollBack,
    scrollForward,
  } = useHorizontalRail(categories.length);

  const categoryCards = categories.map((category, index) => ({
    category,
    image: category.imageUrl || null,
    tone: index % 5,
  }));

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="home-category-rail" aria-labelledby="home-category-title">
      <div className="container">
        <div className="home-category-rail__header">
          <h2 id="home-category-title">
            {t("buyer.home.discovery.categoriesTitle")}
          </h2>

          <Link className="home-category-rail__view-all" to="/search">
            {t("buyer.home.discovery.seeAll")}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="home-category-rail__carousel">
          {canScrollBack && (
            <button
              type="button"
              className="home-category-rail__arrow home-category-rail__arrow--previous"
              onClick={scrollBack}
              aria-label={t("buyer.home.discovery.previous", {
                title: t("buyer.home.discovery.categoriesTitle"),
              })}
            >
              <span aria-hidden="true">‹</span>
            </button>
          )}

          <div ref={railRef} className="home-category-rail__track">
            {categoryCards.map(({ category, image, tone }) => (
              <Link
                key={category.categoryId}
                to={getCategoryPath(category)}
                className={`home-category-rail__card ${
                  image
                    ? "home-category-rail__card--image"
                    : `home-category-rail__card--text home-category-rail__card--tone-${tone}`
                }`}
                aria-label={category.categoryName}
              >
                {image ? (
                  <>
                    <span
                      className="home-category-rail__image-backdrop"
                      style={{ backgroundImage: `url(${image})` }}
                      aria-hidden="true"
                    />
                    <img
                      className="home-category-rail__image"
                      src={image}
                      alt=""
                      aria-hidden="true"
                    />
                    <span
                      className="home-category-rail__wash"
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  <span
                    className="home-category-rail__text-art"
                    aria-hidden="true"
                  />
                )}

                <span className="home-category-rail__copy">
                  <strong>{category.categoryName}</strong>
                </span>

                <span className="home-category-rail__card-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>

          {canScrollForward && (
            <button
              type="button"
              className="home-category-rail__arrow home-category-rail__arrow--next"
              onClick={scrollForward}
              aria-label={t("buyer.home.discovery.next", {
                title: t("buyer.home.discovery.categoriesTitle"),
              })}
            >
              <span aria-hidden="true">›</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default HomeCategoryRail;
