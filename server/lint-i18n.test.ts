/**
 * lint-i18n.test.ts
 *
 * Vitest unit tests for the i18n lint script.
 * Tests both the helper functions in isolation and the full lintI18n() function
 * against the real locale files in client/public/locales/.
 */

import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { lintI18n } from "../scripts/lint-i18n";

// ─── Unit tests for isolated helpers ─────────────────────────────────────────

describe("lintI18n – duplicate key detection", () => {
  it("passes a clean JSON file with no duplicate keys", () => {
    const dir = makeTempLocales({
      de: { common: { greeting: "Hallo", farewell: "Tschüss" } },
      en: { common: { greeting: "Hello", farewell: "Goodbye" } },
    });
    const errors = lintI18n(dir, "");
    expect(errors).toHaveLength(0);
  });

  it("detects a duplicate top-level key in a single file", () => {
    const dir = makeTempLocalesRaw({
      de: {
        "common.json": `{\n  "greeting": "Hallo",\n  "greeting": "Hi"\n}`,
      },
      en: {
        "common.json": `{\n  "greeting": "Hello"\n}`,
      },
    });
    const errors = lintI18n(dir, "");
    const dupes = errors.filter((e) => e.type === "duplicate");
    expect(dupes.length).toBeGreaterThanOrEqual(1);
    expect(dupes[0].message).toMatch(/greeting/);
  });

  it("detects multiple duplicate top-level keys", () => {
    const dir = makeTempLocalesRaw({
      de: {
        "common.json": `{\n  "a": "1",\n  "b": "2",\n  "a": "3",\n  "b": "4"\n}`,
      },
      en: {
        "common.json": `{\n  "a": "x",\n  "b": "y"\n}`,
      },
    });
    const errors = lintI18n(dir, "");
    const dupes = errors.filter((e) => e.type === "duplicate");
    expect(dupes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("lintI18n – cross-language key parity", () => {
  it("passes when DE and EN have identical key sets", () => {
    const dir = makeTempLocales({
      de: { common: { title: "Titel", save: "Speichern" } },
      en: { common: { title: "Title", save: "Save" } },
    });
    const errors = lintI18n(dir, "");
    expect(errors.filter((e) => e.type === "missing")).toHaveLength(0);
  });

  it("detects a key present in DE but missing in EN", () => {
    const dir = makeTempLocales({
      de: { common: { title: "Titel", onlyInDE: "Nur DE" } },
      en: { common: { title: "Title" } },
    });
    const errors = lintI18n(dir, "");
    const missing = errors.filter((e) => e.type === "missing");
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(missing.some((e) => e.message.includes("onlyInDE"))).toBe(true);
  });

  it("detects a key present in EN but missing in DE", () => {
    const dir = makeTempLocales({
      de: { common: { title: "Titel" } },
      en: { common: { title: "Title", onlyInEN: "EN only" } },
    });
    const errors = lintI18n(dir, "");
    const missing = errors.filter((e) => e.type === "missing");
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(missing.some((e) => e.message.includes("onlyInEN"))).toBe(true);
  });

  it("detects nested missing keys", () => {
    const dir = makeTempLocales({
      de: { common: { actions: { save: "Speichern", delete: "Löschen" } } },
      en: { common: { actions: { save: "Save" } } }, // delete missing
    });
    const errors = lintI18n(dir, "");
    const missing = errors.filter((e) => e.type === "missing");
    expect(missing.some((e) => e.message.includes("actions.delete"))).toBe(true);
  });
});

describe("lintI18n – missing translation key detection", () => {
  it("detects a t() key used in source that is missing from locale JSON", () => {
    const localesDir = makeTempLocales({
      de: { common: { existing: "Vorhanden" } },
      en: { common: { existing: "Existing" } },
    });
    const srcDir = makeTempSrc({
      "Page.tsx": `export const x = t("common:existing"); export const y = t("common:missing");`,
    });
    const errors = lintI18n(localesDir, srcDir, "");
    const mt = errors.filter((e) => e.type === "missing_translation");
    expect(mt.length).toBeGreaterThanOrEqual(1);
    expect(mt.some((e) => e.message.includes("common:missing"))).toBe(true);
    expect(mt.every((e) => !e.message.includes("common:existing"))).toBe(true);
  });

  it("does not report a key that is in the allowlist", () => {
    const localesDir = makeTempLocales({
      de: { common: { existing: "Vorhanden" } },
      en: { common: { existing: "Existing" } },
    });
    const srcDir = makeTempSrc({
      "Page.tsx": `export const x = t("common:knownGap");`,
    });
    const allowlistFile = makeTempAllowlist(["common:knownGap"]);
    const errors = lintI18n(localesDir, srcDir, allowlistFile);
    const mt = errors.filter((e) => e.type === "missing_translation");
    expect(mt.every((e) => !e.message.includes("common:knownGap"))).toBe(true);
  });

  it("reports a key that was removed from the allowlist", () => {
    const localesDir = makeTempLocales({
      de: { common: {} },
      en: { common: {} },
    });
    const srcDir = makeTempSrc({
      "Page.tsx": `export const x = t("common:newKey");`,
    });
    // Empty allowlist – newKey is NOT allowed
    const allowlistFile = makeTempAllowlist([]);
    const errors = lintI18n(localesDir, srcDir, allowlistFile);
    const mt = errors.filter((e) => e.type === "missing_translation");
    expect(mt.some((e) => e.message.includes("common:newKey"))).toBe(true);
  });
});

describe("lintI18n – real locale files", () => {
  it("passes all real locale files without duplicate keys or missing translations", () => {
    // This test validates the actual project locale files.
    // It will fail if a developer accidentally introduces duplicate keys,
    // forgets to add a translation in one language,
    // or uses a new t() key without adding it to the JSON or allowlist.
    const errors = lintI18n(); // uses default LOCALES_DIR + SRC_DIR + ALLOWLIST_FILE
    if (errors.length > 0) {
      const summary = errors
        .map((e) => `  [${e.type}] ${path.basename(e.file)}: ${e.message}`)
        .join("\n");
      throw new Error(`i18n lint violations found:\n${summary}`);
    }
    expect(errors).toHaveLength(0);
  });
});

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTempLocales(
  data: Record<string, Record<string, Record<string, unknown>>>
): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-i18n-"));
  for (const [lang, namespaces] of Object.entries(data)) {
    const langDir = path.join(tmpDir, lang);
    fs.mkdirSync(langDir, { recursive: true });
    for (const [ns, content] of Object.entries(namespaces)) {
      fs.writeFileSync(
        path.join(langDir, `${ns}.json`),
        JSON.stringify(content, null, 2) + "\n"
      );
    }
  }
  return tmpDir;
}

function makeTempLocalesRaw(
  data: Record<string, Record<string, string>>
): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-i18n-raw-"));
  for (const [lang, files] of Object.entries(data)) {
    const langDir = path.join(tmpDir, lang);
    fs.mkdirSync(langDir, { recursive: true });
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(langDir, filename), content);
    }
  }
  return tmpDir;
}

function makeTempSrc(files: Record<string, string>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-i18n-src-"));
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(tmpDir, filename), content);
  }
  return tmpDir;
}

function makeTempAllowlist(keys: string[]): string {
  const tmpFile = path.join(os.tmpdir(), `lint-i18n-allowlist-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(keys, null, 2) + "\n");
  return tmpFile;
}
