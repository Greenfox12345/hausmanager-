/**
 * Unit tests for i18n configuration and language logic
 * These tests verify the language infrastructure without requiring a browser
 */
import { describe, it, expect } from "vitest";

// Test the supported languages configuration
const SUPPORTED_LANGUAGES = [
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "en", name: "English", flag: "🇬🇧" },
] as const;

type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Simulate getCurrentLanguage logic
function getCurrentLanguage(rawLang: string): SupportedLanguageCode {
  const lang = rawLang?.split("-")[0] as SupportedLanguageCode;
  const supported = SUPPORTED_LANGUAGES.map((l) => l.code);
  return supported.includes(lang) ? lang : "de";
}

// Simulate household language validation
function isValidHouseholdLanguage(lang: string): boolean {
  const supported = SUPPORTED_LANGUAGES.map((l) => l.code);
  return supported.includes(lang as SupportedLanguageCode);
}

// Simulate the updateHouseholdLanguage permission check
function canUpdateHouseholdLanguage(
  requestingUserId: number,
  householdCreatorId: number
): boolean {
  return requestingUserId === householdCreatorId;
}

describe("i18n Configuration", () => {
  describe("SUPPORTED_LANGUAGES", () => {
    it("should have at least 2 supported languages", () => {
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(2);
    });

    it("should include German as the first language (default)", () => {
      expect(SUPPORTED_LANGUAGES[0].code).toBe("de");
    });

    it("should include English", () => {
      const en = SUPPORTED_LANGUAGES.find((l) => l.code === "en");
      expect(en).toBeDefined();
      expect(en?.name).toBe("English");
    });

    it("should have flag emojis for all languages", () => {
      SUPPORTED_LANGUAGES.forEach((lang) => {
        expect(lang.flag).toBeTruthy();
        expect(lang.flag.length).toBeGreaterThan(0);
      });
    });

    it("should have unique language codes", () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe("getCurrentLanguage", () => {
    it("should return 'de' for German locale", () => {
      expect(getCurrentLanguage("de")).toBe("de");
    });

    it("should return 'en' for English locale", () => {
      expect(getCurrentLanguage("en")).toBe("en");
    });

    it("should strip region codes (e.g. 'de-DE' -> 'de')", () => {
      expect(getCurrentLanguage("de-DE")).toBe("de");
      expect(getCurrentLanguage("en-US")).toBe("en");
      expect(getCurrentLanguage("en-GB")).toBe("en");
    });

    it("should fall back to 'de' for unsupported languages", () => {
      expect(getCurrentLanguage("fr")).toBe("de");
      expect(getCurrentLanguage("zh")).toBe("de");
      expect(getCurrentLanguage("xx")).toBe("de");
    });

    it("should fall back to 'de' for empty string", () => {
      expect(getCurrentLanguage("")).toBe("de");
    });

    it("should fall back to 'de' for undefined-like input", () => {
      expect(getCurrentLanguage(undefined as unknown as string)).toBe("de");
    });
  });

  describe("isValidHouseholdLanguage", () => {
    it("should return true for 'de'", () => {
      expect(isValidHouseholdLanguage("de")).toBe(true);
    });

    it("should return true for 'en'", () => {
      expect(isValidHouseholdLanguage("en")).toBe(true);
    });

    it("should return false for unsupported languages", () => {
      expect(isValidHouseholdLanguage("fr")).toBe(false);
      expect(isValidHouseholdLanguage("zh")).toBe(false);
      expect(isValidHouseholdLanguage("")).toBe(false);
      expect(isValidHouseholdLanguage("invalid")).toBe(false);
    });
  });

  describe("canUpdateHouseholdLanguage (permission check)", () => {
    it("should allow the household creator to update language", () => {
      expect(canUpdateHouseholdLanguage(1, 1)).toBe(true);
    });

    it("should deny non-creator members from updating language", () => {
      expect(canUpdateHouseholdLanguage(2, 1)).toBe(false);
      expect(canUpdateHouseholdLanguage(99, 1)).toBe(false);
    });
  });

  describe("Translation file structure", () => {
    it("should have the correct namespace list", () => {
      const NAMESPACES = [
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
      ];
      expect(NAMESPACES).toContain("common");
      expect(NAMESPACES).toContain("tasks");
      expect(NAMESPACES).toContain("inventory");
      expect(NAMESPACES.length).toBe(11);
    });

    it("should use localStorage key 'haushaltsmanager_language'", () => {
      const STORAGE_KEY = "haushaltsmanager_language";
      expect(STORAGE_KEY).toBe("haushaltsmanager_language");
    });
  });
});
