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
import { lintI18n, checkUnregisteredNamespaces, readRegisteredNamespaces, checkHardcodedStrings, checkUntranslatedCopies } from "../scripts/lint-i18n";

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

describe("lintI18n – unregistered namespace detection", () => {
  it("detects a namespace used in t() but not in NAMESPACES", () => {
    const srcDir = makeTempSrc({
      "Page.tsx": `export const x = t("unregistered:some.key");`,
    });
    // Config only registers 'common'
    const configFile = makeTempI18nConfig(["common"]);
    const errors = checkUnregisteredNamespaces(srcDir, configFile);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.message.includes('"unregistered"'))).toBe(true);
    expect(errors[0].type).toBe("unregistered_namespace");
  });

  it("does not report a namespace that is registered", () => {
    const srcDir = makeTempSrc({
      "Page.tsx": `export const x = t("common:title");`,
    });
    const configFile = makeTempI18nConfig(["common"]);
    const errors = checkUnregisteredNamespaces(srcDir, configFile);
    expect(errors.filter((e) => e.message.includes('"common"'))).toHaveLength(0);
  });

  it("reads NAMESPACES correctly from i18n.ts", () => {
    const configFile = makeTempI18nConfig(["common", "tasks", "borrow"]);
    const ns = readRegisteredNamespaces(configFile);
    expect(ns.has("common")).toBe(true);
    expect(ns.has("tasks")).toBe(true);
    expect(ns.has("borrow")).toBe(true);
    expect(ns.has("missing")).toBe(false);
  });

  it("real project has no unregistered namespaces", () => {
    // This test will catch the exact bug that caused the production issue:
    // namespaces used in t() calls but not registered in i18n.ts
    const errors = lintI18n();
    const unregistered = errors.filter((e) => e.type === "unregistered_namespace");
    if (unregistered.length > 0) {
      const summary = unregistered.map((e) => `  ${e.message}`).join("\n");
      throw new Error(`Unregistered namespaces found:\n${summary}`);
    }
    expect(unregistered).toHaveLength(0);
  });
});

describe("lintI18n – hardcoded JSX string detection", () => {
  it("detects a hardcoded multi-word string in JSX", () => {
    const srcDir = makeTempSrc({
      "Page.tsx": `export const A = () => <p>Noch keine Projekte vorhanden</p>;`,
    });
    const errors = checkHardcodedStrings(srcDir, []);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].type).toBe("hardcoded_string");
    expect(errors[0].message).toMatch(/Noch keine Projekte/);
  });

  it("does not report a string already wrapped in t()", () => {
    const srcDir = makeTempSrc({
      "Page.tsx": `export const A = () => <p>{t("ns:key", "Noch keine Projekte")}</p>;`,
    });
    const errors = checkHardcodedStrings(srcDir, []);
    expect(errors.filter((e) => e.message.includes("Noch keine Projekte"))).toHaveLength(0);
  });

  it("skips files in the skip-path list", () => {
    const srcDir = makeTempSrc({
      "components/ui/button.tsx": `export const B = () => <button>Toggle Sidebar</button>;`,
    });
    const errors = checkHardcodedStrings(srcDir, ["components/ui/"]);
    expect(errors).toHaveLength(0);
  });

  it("real project has no hardcoded JSX strings outside skip-paths", () => {
    const errors = lintI18n();
    const hardcoded = errors.filter((e) => e.type === "hardcoded_string");
    if (hardcoded.length > 0) {
      const summary = hardcoded.map((e) => `  ${path.basename(e.file)}: ${e.message}`).join("\n");
      throw new Error(`Hardcoded JSX strings found:\n${summary}`);
    }
    expect(hardcoded).toHaveLength(0);
  });
});

describe("lintI18n – untranslated EN copies (Prüfung 6)", () => {
  it("detects EN value identical to DE with German domain word", () => {
    const dir = makeTempLocales({
      de: { calendar: { skip: "Auslassen", title: "Kalender" } },
      en: { calendar: { skip: "Auslassen", title: "Calendar" } },
    });
    const errors = checkUntranslatedCopies(dir);
    expect(errors.filter((e) => e.message.includes("skip"))).toHaveLength(1);
    expect(errors.filter((e) => e.message.includes("title"))).toHaveLength(0);
  });

  it("does not flag EN values that differ from DE", () => {
    const dir = makeTempLocales({
      de: { calendar: { skip: "Auslassen" } },
      en: { calendar: { skip: "Skip" } },
    });
    const errors = checkUntranslatedCopies(dir);
    expect(errors).toHaveLength(0);
  });

  it("real project has no untranslated EN copies with German domain words", () => {
    const errors = lintI18n();
    const copies = errors.filter((e) => e.type === "untranslated_copy");
    if (copies.length > 0) {
      const summary = copies.map((e) => `  ${path.basename(e.file)}: ${e.message}`).join("\n");
      throw new Error(`Untranslated EN copies found:\n${summary}`);
    }
    expect(copies).toHaveLength(0);
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
    const fullPath = path.join(tmpDir, filename);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return tmpDir;
}

function makeTempAllowlist(keys: string[]): string {
  const tmpFile = path.join(os.tmpdir(), `lint-i18n-allowlist-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(keys, null, 2) + "\n");
  return tmpFile;
}

function makeTempI18nConfig(namespaces: string[]): string {
  const nsItems = namespaces.map((n) => `  "${n}"`).join(",\n");
  const content = `export const NAMESPACES = [\n${nsItems},\n] as const;\n`;
  const tmpFile = path.join(os.tmpdir(), `lint-i18n-config-${Date.now()}.ts`);
  fs.writeFileSync(tmpFile, content);
  return tmpFile;
}
