import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";
import { getFaqs, getHelpTopics } from "../../services/supportService";

function SupportPage() {
  const { t } = useTranslation();
  const [topics, setTopics] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTopicKey, setActiveTopicKey] = useState("");
  const [expandedFaqId, setExpandedFaqId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    const loadSupportData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const [topicData, faqData] = await Promise.all([
          getHelpTopics(),
          getFaqs(),
        ]);

        if (!isCurrent) return;
        setTopics(topicData);
        setFaqs(faqData);
      } catch {
        if (isCurrent) {
          setErrorMessage(t("buyer.support.loadError"));
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadSupportData();
    return () => {
      isCurrent = false;
    };
  }, [t]);

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

    return faqs.filter((faq) => {
      if (activeTopicKey && faq.topicKey !== activeTopicKey) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const topic = topics.find((item) => item.topicKey === faq.topicKey);
      const searchableText = [
        t(faq.questionKey),
        t(faq.answerKey),
        topic ? t(topic.titleKey) : "",
        topic ? t(topic.descriptionKey) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [activeTopicKey, faqs, searchTerm, t, topics]);

  const activeTopic = topics.find((topic) => topic.topicKey === activeTopicKey);

  const clearFilters = () => {
    setSearchTerm("");
    setActiveTopicKey("");
    setExpandedFaqId(null);
  };

  return (
    <BuyerAccountLayout activePath="/account/support" pageClassName="support-page">
      <section className="support-content">
        <header className="support-hero">
          <div className="support-hero__content">
            <span>{t("buyer.support.hero.eyebrow")}</span>
            <h1>{t("buyer.support.hero.title")}</h1>
            <p>{t("buyer.support.hero.description")}</p>

            <div className="support-search" role="search">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setExpandedFaqId(null);
                }}
                placeholder={t("buyer.support.hero.searchPlaceholder")}
                aria-label={t("buyer.support.hero.searchLabel")}
              />
              <button
                type="button"
                onClick={() => setExpandedFaqId(null)}
                aria-label={t("buyer.support.hero.searchButton")}
              >
                {t("buyer.support.hero.searchButton")}
              </button>
            </div>
          </div>

          <div className="support-hero__art" aria-hidden="true">
            <div>FAQ</div>
            <span>{t("buyer.support.hero.badge")}</span>
          </div>
        </header>

        {errorMessage && <div className="profile-alert error">{errorMessage}</div>}

        <section className="support-section">
          <div className="support-section__header">
            <div>
              <h2>{t("buyer.support.topicsTitle")}</h2>
              <p>{t("buyer.support.topicsDescription")}</p>
            </div>

            {(activeTopicKey || searchTerm) && (
              <button type="button" onClick={clearFilters}>
                {t("buyer.support.viewAll")}
              </button>
            )}
          </div>

          <div className="support-topic-grid">
            {topics.map((topic) => (
              <button
                type="button"
                key={topic.topicKey}
                className={`support-topic-card ${
                  activeTopicKey === topic.topicKey ? "is-active" : ""
                }`}
                onClick={() => {
                  setActiveTopicKey((current) =>
                    current === topic.topicKey ? "" : topic.topicKey
                  );
                  setExpandedFaqId(null);
                }}
                aria-pressed={activeTopicKey === topic.topicKey}
              >
                <span className="support-topic-card__icon">{topic.icon}</span>
                <span>
                  <strong>{t(topic.titleKey)}</strong>
                  <small>{t(topic.descriptionKey)}</small>
                </span>
                <span className="support-topic-card__arrow">-&gt;</span>
              </button>
            ))}
          </div>
        </section>

        <section className="support-main-grid">
          <div className="support-faq-panel">
            <div className="support-section__header">
              <div>
                <h2>{t("buyer.support.faqTitle")}</h2>
                <p>
                  {activeTopic
                    ? t(activeTopic.titleKey)
                    : t("buyer.support.faqPopular")}
                </p>
              </div>

              {(activeTopicKey || searchTerm) && (
                <button type="button" onClick={clearFilters}>
                  {t("buyer.support.viewAll")}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="profile-loading-card">{t("buyer.support.loading")}</div>
            ) : filteredFaqs.length === 0 ? (
              <div className="support-empty-inline">{t("buyer.support.empty")}</div>
            ) : (
              <div className="support-faq-list">
                {filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.faqId;

                  return (
                    <article
                      className={`support-faq-item ${isExpanded ? "is-open" : ""}`}
                      key={faq.faqId}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFaqId(isExpanded ? null : faq.faqId)
                        }
                        aria-expanded={isExpanded}
                      >
                        <span>{t(faq.questionKey)}</span>
                        <span aria-hidden="true">{isExpanded ? "-" : "+"}</span>
                      </button>

                      {isExpanded && <p>{t(faq.answerKey)}</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="support-contact-panel">
            <article className="support-contact-card support-contact-card--primary">
              <h2>{t("buyer.support.centerTitle")}</h2>
              <p>{t("buyer.support.centerDescription")}</p>
            </article>
          </aside>
        </section>
      </section>
    </BuyerAccountLayout>
  );
}

export default SupportPage;
