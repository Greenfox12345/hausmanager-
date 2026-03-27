import i18n from "i18next";
import type { Locale } from "date-fns";
import { de, enGB, es, fr, zhCN } from "date-fns/locale";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LANGUAGES = [
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  // Future languages can be added here:
  // { code: "tr", name: "Türkçe", flag: "🇹🇷" },
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
  "borrow",
  "household",
  "neighborhood",
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
 * Return the date-fns Locale object that matches the given language code.
 * Add a new `case` here whenever a new language is added to SUPPORTED_LANGUAGES.
 * All components should call this helper instead of duplicating the mapping.
 */
export async function getDateFnsLocale(lang: string): Promise<Locale> {
  const code = lang.split("-")[0];
  switch (code) {
    case "es": {
      const { es } = await import("date-fns/locale");
      return es;
    }
    case "en": {
      const { enGB } = await import("date-fns/locale");
      return enGB;
    }
    case "de":
    default: {
      const { de } = await import("date-fns/locale");
      return de;
    }
  }
}

/**
 * Synchronous version – returns the locale from the statically imported bundle.
 * Safe to call in render. To add a new language: import its locale above and
 * add a case here – no other files need to be changed.
 */
export function getDateFnsLocaleSync(lang: string): Locale {
  const code = lang.split("-")[0];
  if (code === "es") return es;
  if (code === "en") return enGB;
  if (code === "fr") return fr;
  if (code === "zh") return zhCN;
  return de;
}

/**
 * Change the UI language and persist to localStorage
 */
export function changeLanguage(code: SupportedLanguageCode): Promise<void> {
  return i18n.changeLanguage(code).then(() => {
    localStorage.setItem("haushaltsmanager_language", code);
  });
}
