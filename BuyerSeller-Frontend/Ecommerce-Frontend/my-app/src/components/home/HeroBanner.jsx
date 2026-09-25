// src/components/home/HeroBanner.jsx

import { Link } from "react-router-dom";
import heroImage from "../../assets/hero.png";

function HeroBanner({ banners = [] }) {
  const activeBanner = banners[0];

  if (!activeBanner) {
    return null;
  }

  return (
    <section className="hero-banner-section">
      <div className="container">
        <div className="hero-banner">
          <button type="button" className="hero-banner__arrow hero-banner__arrow--prev" aria-label="Previous banner">
            &#8249;
          </button>

          <div className="hero-banner__content">
            <h1>{activeBanner.title}</h1>

            <p>{activeBanner.subtitle}</p>

            <Link to={activeBanner.buttonLink} className="hero-banner__button">
              {activeBanner.buttonText}
            </Link>
          </div>

          <div className="hero-banner__image-box">
            {activeBanner.image ? (
              <img src={activeBanner.image} alt={activeBanner.title} />
            ) : (
              <div className="hero-banner__image-placeholder" aria-label="Featured technology products">
                <img src={heroImage} alt="" />
                <span className="hero-banner__device hero-banner__device--headphones"></span>
                <span className="hero-banner__device hero-banner__device--phone"></span>
                <span className="hero-banner__device hero-banner__device--watch"></span>
              </div>
            )}
          </div>

          <button type="button" className="hero-banner__arrow hero-banner__arrow--next" aria-label="Next banner">
            &#8250;
          </button>
        </div>

        <div className="hero-banner__dots" aria-label="Banner pagination">
          <span className="hero-banner__dot hero-banner__dot--active"></span>
          <span className="hero-banner__dot"></span>
          <span className="hero-banner__dot"></span>
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
