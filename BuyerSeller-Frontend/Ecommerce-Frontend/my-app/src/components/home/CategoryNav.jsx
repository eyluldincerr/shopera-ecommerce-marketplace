// src/components/home/CategoryNav.jsx

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getCategoryPath } from "../../services/categoryService.js";

function CategoryNav({
  categories = [],
  quickLinks = [],
  activeSlug = "",
  onCategorySelect,
  categoryStatusMessage = "",
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const isInteractive = typeof onCategorySelect === "function";

  const handleSelect = (item) => {
    if (!isInteractive) {
      return;
    }

    onCategorySelect(item);
    setIsOpen(false);
  };

  const renderNavItem = (item, className, children) => {
    const categoryRouteValue =
      item.categoryId === undefined || item.categoryId === null
        ? ""
        : String(item.categoryId);
    const itemClassName = `${className}${
      activeSlug === categoryRouteValue ? " is-active" : ""
    }`;

    if (isInteractive) {
      return (
        <button
          key={item.categoryId}
          type="button"
          className={itemClassName}
          onClick={() => handleSelect(item)}
        >
          {children}
        </button>
      );
    }

    const itemPath =
      item.path ||
      getCategoryPath(item);

    return (
      <Link
        key={item.id ?? item.categoryId}
        to={itemPath}
        className={itemClassName}
      >
        {children}
      </Link>
    );
  };

  return (
    <section className="category-nav">
      <div className="container category-nav__container" ref={navRef}>
        <div className="category-nav__rail">
          <div className="category-nav__menu">
            <button
              type="button"
              className={`category-nav__trigger${isOpen ? " is-active" : ""}`}
              aria-expanded={isOpen}
              aria-controls="category-nav-panel"
              onClick={() => setIsOpen((current) => !current)}
            >
              <span className="category-nav__trigger-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>{t("buyer.home.categories.trigger")}</span>
              <span className="category-nav__chevron" aria-hidden="true" />
            </button>
          </div>


          <div className="category-nav__quick-links">
            {quickLinks.map((link) =>
              renderNavItem(
                link,
                "category-nav__quick-link",
                link.labelKey ? t(link.labelKey) : link.label
              )
            )}
          </div>
        </div>

        <div
          id="category-nav-panel"
          className={`category-nav__panel${isOpen ? " is-open" : ""}`}
        >
          <div className="category-nav__panel-head">
            <div>
              <span>{t("buyer.home.categories.browse")}</span>
              <strong>{t("buyer.home.categories.shopByCategory")}</strong>
            </div>
            <span>{t("buyer.home.categories.departmentCount", { count: categories.length })}</span>
          </div>

          <div className="category-nav__panel-grid">
            {categoryStatusMessage ? (
              <p className="category-nav__panel-state" role="status">
                {categoryStatusMessage}
              </p>
            ) : (
              categories.map((category) =>
                renderNavItem(
                  category,
                  "category-nav__panel-item",
                  <>
                    <span className="category-nav__panel-copy">
                      <span>{category.categoryName}</span>
                      {category.count ? <small>{category.count}</small> : null}
                    </span>
                    <svg
                      className="category-nav__panel-arrow"
                      viewBox="0 0 18 18"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="m7 4 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CategoryNav;
