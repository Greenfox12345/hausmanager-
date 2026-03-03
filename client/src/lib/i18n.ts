import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LANGUAGES = [
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "en", name: "English", flag: "🇬🇧" },
  // Future languages can be added here:
  // { code: "fr", name: "Français", flag: "🇫🇷" },
  // { code: "es", name: "Español", flag: "🇪🇸" },
  // { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  // { code: "zh", name: "中文", flag: "🇨🇳" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const NAMESPACES = [
  "common",
  "tasks",
  "inventory",
  "members",
  "shopping",
  "projects",
  "history",
  "calendar",
  "borrows",
  "household",
  "auth",
] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Default language
    fallbackLng: "de",
    // Supported languages
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    // Default namespace
    defaultNS: "common",
    ns: NAMESPACES,
    // Backend config: load translation files from /locales/{lng}/{ns}.json
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    // Language detection order
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "haushaltsmanager_language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    // React suspense support
    react: {
      useSuspense: true,
    },
  });

export default i18n;

/**
 * Get the current UI language code
 */
export function getCurrentLanguage(): SupportedLanguageCode {
  const lang = i18n.language?.split("-")[0] as SupportedLanguageCode;
  const supported = SUPPORTED_LANGUAGES.map((l) => l.code);
  return supported.includes(lang) ? lang : "de";
}

/**
 * Change the UI language and persist to localStorage
 */
export function changeLanguage(code: SupportedLanguageCode): Promise<void> {
  return i18n.changeLanguage(code).then(() => {
    localStorage.setItem("haushaltsmanager_language", code);
  });
}
