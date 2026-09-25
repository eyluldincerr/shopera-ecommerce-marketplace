// src/pages/buyer/HomePage.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import Navbar from "../../components/layout/Navbar";
import HomeFooter from "../../components/layout/HomeFooter";
import CategoryNav from "../../components/home/CategoryNav";
import StoreStories from "../../components/home/StoreStories";
import HeroCarousel from "../../components/home/HeroCarousel";
import HomeCategoryRail from "../../components/home/HomeCategoryRail";
import TopBrandsOffers from "../../components/home/TopBrandsOffers";
import ProductSection from "../../components/product/ProductSection";
import InfiniteProductGrid from "../../components/product/InfiniteProductGrid";
import {
  getHomeOffers,
  getNavbarLinks,
  getTopBrands,
} from "../../services/homeService";
import {
  HOME_QUICK_LINKS,
  getHomeCategories,
  getHomeQuickLinks,
} from "../../services/categoryService";
import {
  HOME_SECTION_RENDERERS,
  createExcludedProductFeedLoader,
  getHomeSectionFeedLoader,
  getHomeProductSections,
} from "../../services/productService";

const getProductId = (product) => {
  const value = product?.productId ?? product?.ProductId ?? product?.ProductID;
  return value === undefined || value === null ? "" : String(value);
};

function HomeDiscoveryFeedSection({ section, t, excludedProductIds }) {
  const [visibility, setVisibility] = useState("loading");
  const baseLoadProducts = getHomeSectionFeedLoader(section.feedKey);
  const exclusionKey = useMemo(
    () => Array.from(excludedProductIds || []).map(String).sort().join(","),
    [excludedProductIds]
  );
  const loadProducts = useMemo(
    () =>
      createExcludedProductFeedLoader(
        baseLoadProducts,
        exclusionKey ? exclusionKey.split(",") : []
      ),
    [baseLoadProducts, exclusionKey]
  );

  useEffect(() => {
    setVisibility("loading");
  }, [loadProducts]);

  const handlePageData = useCallback((response) => {
    const items = response?.items || response?.products || [];

    setVisibility((current) => {
      if (items.length > 0) {
        return "ready";
      }

      if (current === "ready") {
        return current;
      }

      return response?.hasMore ? "loading" : "empty";
    });
  }, []);

  if (!loadProducts || visibility === "empty") {
    return null;
  }

  const title = section.titleKey ? t(section.titleKey) : section.title;
  const subtitle = section.subtitleKey
    ? t(section.subtitleKey)
    : section.subtitle;

  return (
    <section className="product-section product-section--feed">
      <div className="container">
        <div className="product-section__header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>

        <InfiniteProductGrid
          loadProducts={loadProducts}
          autoLoad
          pageSize={20}
          onPageData={handlePageData}
          emptyTitle={
            section.emptyTitleKey
              ? t(section.emptyTitleKey)
              : section.emptyTitle
          }
          emptyMessage={
            section.emptyMessageKey
              ? t(section.emptyMessageKey)
              : section.emptyMessage
          }
        />
      </div>
    </section>
  );
}

const renderHomeProductSection = (section, t, excludedProductIds) => {
  const title = section.titleKey ? t(section.titleKey) : section.title;
  const subtitle = section.subtitleKey
    ? t(section.subtitleKey)
    : section.subtitle;

  if (section.renderer === HOME_SECTION_RENDERERS.FEED) {
    return (
      <HomeDiscoveryFeedSection
        key={section.id}
        section={section}
        t={t}
        excludedProductIds={excludedProductIds}
      />
    );
  }

  return (
    <ProductSection
      key={section.id}
      section={{ ...section, title, subtitle }}
    />
  );
};

function HomePage() {
  const { t } = useTranslation();
  const [homeData, setHomeData] = useState({
    navbarLinks: [],
    categories: [],
    quickLinks: HOME_QUICK_LINKS.map((link) => ({ ...link })),
    topBrands: [],
    homeOffers: [],
    productSections: [],
  });

  const [categoryStatus, setCategoryStatus] = useState("loading");
  const [productSectionStatus, setProductSectionStatus] = useState("loading");

  useEffect(() => {
    const loadHomePageData = async () => {
      const [
        navbarResult,
        categoryResult,
        quickLinkResult,
        brandResult,
        offerResult,
        productSectionResult,
      ] = await Promise.allSettled([
        getNavbarLinks(),
        getHomeCategories(),
        getHomeQuickLinks(),
        getTopBrands(),
        getHomeOffers(),
        getHomeProductSections(),
      ]);

      setHomeData((current) => ({
        ...current,
        navbarLinks:
          navbarResult.status === "fulfilled"
            ? navbarResult.value
            : current.navbarLinks,
        categories:
          categoryResult.status === "fulfilled"
            ? categoryResult.value
            : [],
        quickLinks:
          quickLinkResult.status === "fulfilled"
            ? quickLinkResult.value
            : current.quickLinks,
        topBrands:
          brandResult.status === "fulfilled" ? brandResult.value : [],
        homeOffers:
          offerResult.status === "fulfilled"
            ? offerResult.value
            : current.homeOffers,
        productSections:
          productSectionResult.status === "fulfilled"
            ? productSectionResult.value
            : [],
      }));

      if (categoryResult.status === "rejected") {
        console.error("Failed to load home categories:", categoryResult.reason);
        setCategoryStatus(
          categoryResult.reason?.code === "BACKEND_NOT_CONFIGURED"
            ? "configuration"
            : "error"
        );
      } else {
        setCategoryStatus(
          categoryResult.value.length > 0 ? "ready" : "empty"
        );
      }

      if (productSectionResult.status === "rejected") {
        console.error(
          "Failed to load home product sections:",
          productSectionResult.reason
        );
        setProductSectionStatus(
          productSectionResult.reason?.code === "BACKEND_NOT_CONFIGURED"
            ? "configuration"
            : "error"
        );
      } else {
        setProductSectionStatus(
          productSectionResult.value.length > 0 ? "ready" : "empty"
        );
      }
    };

    loadHomePageData();
  }, [t]);

  const categoryStatusMessage =
    categoryStatus === "loading"
      ? t("buyer.catalog.loading")
      : categoryStatus === "configuration"
        ? t("backend.productStoreNotConfigured")
        : categoryStatus === "error"
          ? t("backend.productLoadError")
          : categoryStatus === "empty"
            ? t("backend.noCategories")
            : "";

  const featuredProductIds = useMemo(() => {
    const ids = new Set();

    for (const section of homeData.productSections) {
      if (section?.renderer !== HOME_SECTION_RENDERERS.PREVIEW) {
        continue;
      }

      for (const product of section.products || []) {
        const productId = getProductId(product);
        if (productId) {
          ids.add(productId);
        }
      }
    }

    return ids;
  }, [homeData.productSections]);

  const productSectionMessage =
    productSectionStatus === "loading"
      ? t("buyer.catalog.loading")
      : productSectionStatus === "configuration"
        ? t("backend.productStoreNotConfigured")
        : productSectionStatus === "error"
          ? t("backend.productLoadError")
          : productSectionStatus === "empty"
            ? t("backend.noHomeProductSections")
            : "";

  return (
    <>
      <Navbar links={homeData.navbarLinks} />

      <main className="buyer-home-page">
        <CategoryNav
          categories={homeData.categories}
          quickLinks={homeData.quickLinks}
          categoryStatusMessage={categoryStatusMessage}
        />

        <HeroCarousel />

        <StoreStories />

        <HomeCategoryRail categories={homeData.categories} />

        <TopBrandsOffers
          brands={homeData.topBrands}
          offers={homeData.homeOffers}
        />


        {productSectionMessage && (
          <section
            className="container catalog-page__state"
            role={productSectionStatus === "error" ? "alert" : "status"}
          >
            <p>{productSectionMessage}</p>
          </section>
        )}

        {homeData.productSections.map((section) =>
          renderHomeProductSection(section, t, featuredProductIds)
        )}
      </main>

      <HomeFooter />
    </>
  );
}

export default HomePage;
