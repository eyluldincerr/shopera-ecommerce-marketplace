import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { heroSlides } from "../../data/heroSlides";
import promotionAdapter from "../../services/adapters/promotionAdapter.js";
import { resolveApiUrl } from "../../services/axiosClient.js";

const AUTO_SLIDE_DELAY = 5000;

const isExternalLink = (value) => /^https?:\/\//i.test(String(value || ""));

function HeroAction({ to, className, children }) {
  if (!to) return null;

  if (isExternalLink(to)) {
    return (
      <a className={className} href={to} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

function HeroCarousel() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState("next");

  useEffect(() => {
    const controller = new AbortController();

    const loadPromotions = async () => {
      try {
        const activeCampaigns = await promotionAdapter.getActiveCampaigns({
          signal: controller.signal,
        });

        setCampaigns(Array.isArray(activeCampaigns) ? activeCampaigns : []);
      } catch (error) {
        if (error?.name !== "AbortError") {
          // The existing Shopera discovery hero remains available if the
          // promotions endpoint is temporarily unavailable.
          console.error("Hero promotions could not be loaded:", error);
        }
      }
    };

    loadPromotions();
    return () => controller.abort();
  }, []);

  const slides = useMemo(() => {
    // Keep Shopera's three branded discovery slides first in the rotation.
    // Active Admin/store promotions follow them so the homepage always opens
    // with the consistent Shopera experience before dynamic campaigns.
    const shoperaSlides = heroSlides.map((slide) => ({
      ...slide,
      title: t(slide.titleKey),
      subtitle: t(slide.subtitleKey),
      buttonLabel: t(slide.buttonKey),
      buttonLink: slide.buttonLink,
      imageAlt: t(slide.imageAltKey),
    }));

    const promotionSlides = campaigns.map((campaign) => ({
      id: `promotion-${campaign.campaignID}`,
      isPromotion: true,
      title: campaign.campaignName,
      subtitle: campaign.campaignDescription || "",
      buttonLabel: t("buyer.home.hero.promotionButton"),
      buttonLink: campaign.linkURL || "",
      imageUrl: resolveApiUrl(campaign.bannerImageUrl),
      imageAlt: campaign.bannerAltText || campaign.campaignName,
    }));

    return [...shoperaSlides, ...promotionSlides];
  }, [campaigns, t]);

  useEffect(() => {
    setActiveIndex(0);
  }, [campaigns]);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSlideDirection("next");
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, AUTO_SLIDE_DELAY);

    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  const activeSlide = slides[activeIndex] || slides[0];

  const goToPreviousSlide = () => {
    setSlideDirection("previous");
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? slides.length - 1 : currentIndex - 1,
    );
  };

  const goToNextSlide = () => {
    setSlideDirection("next");
    setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
  };

  const goToSlide = (index) => {
    if (index === activeIndex) return;

    setSlideDirection(index < activeIndex ? "previous" : "next");
    setActiveIndex(index);
  };

  if (!activeSlide) {
    return null;
  }

  return (
    <section className="hero-carousel" aria-label={t("buyer.home.hero.regionLabel")}>
      <div className="container">
        <div
          key={activeSlide.id}
          className={`hero-slide hero-slide--motion-${slideDirection} ${
            activeSlide.isPromotion
              ? "hero-slide--promotion"
              : `hero-slide--${activeSlide.theme || "default"}`
          } ${!activeSlide.isPromotion && activeSlide.imageUrl ? "hero-slide--static-image" : ""}`}
          aria-live="polite"
        >
          {slides.length > 1 && (
            <button
              type="button"
              className="hero-arrow hero-arrow-left"
              aria-label={t("buyer.home.hero.previous")}
              onClick={goToPreviousSlide}
            >
              &#8249;
            </button>
          )}

          <div className="hero-slide-content">
            <span className="hero-slide-kicker">
              {activeSlide.isPromotion
                ? t("buyer.home.hero.promotionKicker")
                : t("buyer.home.hero.kicker")}
            </span>

            <h1>{activeSlide.title}</h1>
            {activeSlide.subtitle && <p>{activeSlide.subtitle}</p>}

            <HeroAction to={activeSlide.buttonLink} className="hero-slide-button">
              {activeSlide.buttonLabel}
            </HeroAction>
          </div>

          <div
            className="hero-slide-visual"
            role="img"
            aria-label={activeSlide.imageAlt}
            style={
              activeSlide.imageUrl
                ? { backgroundImage: `url(${activeSlide.imageUrl})` }
                : undefined
            }
          >
            {activeSlide.imageUrl ? (
              <img
                className={
                  activeSlide.isPromotion
                    ? "hero-promotion-image"
                    : "hero-static-image"
                }
                src={activeSlide.imageUrl}
                alt=""
                aria-hidden="true"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <>
                <span className="hero-device hero-device-tablet" aria-hidden="true" />
                <span className="hero-device hero-device-phone" aria-hidden="true" />
                <span className="hero-device hero-device-watch" aria-hidden="true" />
                <span className="hero-device hero-device-headphones" aria-hidden="true" />
              </>
            )}
          </div>

          {slides.length > 1 && (
            <button
              type="button"
              className="hero-arrow hero-arrow-right"
              aria-label={t("buyer.home.hero.next")}
              onClick={goToNextSlide}
            >
              &#8250;
            </button>
          )}
        </div>

        {slides.length > 1 && (
          <div className="hero-dots" aria-label={t("buyer.home.hero.pagination")}>
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                aria-label={t("buyer.home.hero.showSlide", {
                  title: slide.title,
                })}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroCarousel;
