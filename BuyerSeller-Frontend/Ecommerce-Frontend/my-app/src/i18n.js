import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import tr from "./locales/tr.json";
import sellerTranslations from "./locales/sellerTranslations.js";

const mergeTranslations = (base, additions) => {
  const result = { ...base };
  Object.entries(additions).forEach(([key, value]) => {
    result[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? mergeTranslations(result[key] || {}, value)
        : value;
  });
  return result;
};

const supportedLanguages = new Set(["en", "tr"]);
const storedLanguage =
  typeof localStorage === "undefined"
    ? "en"
    : localStorage.getItem("shoperaLanguage") || "en";
const savedLanguage = supportedLanguages.has(storedLanguage)
  ? storedLanguage
  : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: mergeTranslations(en, sellerTranslations.en) },
    tr: { translation: mergeTranslations(tr, sellerTranslations.tr) },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

const applyDocumentLanguage = (language) => {
  const normalizedLanguage = supportedLanguages.has(language) ? language : "en";

  if (typeof document !== "undefined") {
    document.documentElement.lang = normalizedLanguage;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("shoperaLanguage", normalizedLanguage);
  }
};

applyDocumentLanguage(i18n.resolvedLanguage || i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
