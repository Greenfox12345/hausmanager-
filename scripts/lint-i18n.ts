/**
 * lint-i18n.ts
 *
 * CI lint script for i18n JSON files.
 * Checks:
 *   1. Duplicate top-level keys within a single file
 *   2. Missing keys: every key present in DE must also exist in EN (and vice versa)
 *
 * Usage:
 *   pnpm lint:i18n          → exits 0 on success, 1 on any violation
 *   pnpm lint:i18n --fix    → not supported (use merge_json_final.py for that)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../client/public/locales");
const LANGUAGES = ["de", "en"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface LintError {
  file: string;
  type: "duplicate" | "missing";
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a JSON file and return all root-level key occurrences in order,
 * including duplicates. Standard JSON.parse silently drops duplicates,
 * so we use a regex-based approach on the raw text.
 */
function getRootKeyOccurrences(raw: string): string[] {
  // Match keys at exactly 2-space indentation (root level of pretty-printed JSON)
  const matches = raw.match(/^  "([^"]+)":/gm) ?? [];
  return matches.map((m) => m.trim().replace(/^"|":$/g, "").replace(/"$/, ""));
}

/**
 * Recursively collect all dot-notation paths from a parsed JSON object.
 * e.g. { a: { b: 1 }, c: 2 } → ["a.b", "c"]
 */
function collectPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return [prefix];
  }
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      paths.push(...collectPaths(value, fullKey));
    } else {
      paths.push(fullKey);
    }
  }
  return paths;
}

// ─── Core checks ──────────────────────────────────────────────────────────────

function checkDuplicateKeys(filePath: string, raw: string): LintError[] {
  const errors: LintError[] = [];
  const keys = getRootKeyOccurrences(raw);
  const seen = new Map<string, number>();

  for (const key of keys) {
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  for (const [key, count] of seen.entries()) {
    if (count > 1) {
      errors.push({
        file: filePath,
        type: "duplicate",
        message: `Duplicate top-level key "${key}" appears ${count} times`,
      });
    }
  }

  return errors;
}

function checkMissingKeys(
  fileA: string,
  parsedA: Record<string, unknown>,
  fileB: string,
  parsedB: Record<string, unknown>
): LintError[] {
  const errors: LintError[] = [];
  const pathsA = new Set(collectPaths(parsedA));
  const pathsB = new Set(collectPaths(parsedB));

  for (const p of pathsA) {
    if (!pathsB.has(p)) {
      errors.push({
        file: fileB,
        type: "missing",
        message: `Key "${p}" exists in ${path.basename(fileA)} but is missing here`,
      });
    }
  }

  return errors;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function lintI18n(localesDir: string = LOCALES_DIR): LintError[] {
  const allErrors: LintError[] = [];

  // Collect all namespace files (intersection of all languages)
  const filesByLang: Record<string, string[]> = {};
  for (const lang of LANGUAGES) {
    const dir = path.join(localesDir, lang);
    filesByLang[lang] = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort();
  }

  const namespaces = filesByLang[LANGUAGES[0]] ?? [];

  for (const filename of namespaces) {
    const rawByLang: Record<string, string> = {};
    const parsedByLang: Record<string, Record<string, unknown>> = {};

    // 1. Load and check for duplicate keys in each language
    for (const lang of LANGUAGES) {
      const filePath = path.join(localesDir, lang, filename);
      if (!fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, "utf-8");
      rawByLang[lang] = raw;

      try {
        parsedByLang[lang] = JSON.parse(raw) as Record<string, unknown>;
      } catch (e) {
        allErrors.push({
          file: filePath,
          type: "duplicate",
          message: `Invalid JSON: ${(e as Error).message}`,
        });
        continue;
      }

      const dupeErrors = checkDuplicateKeys(filePath, raw);
      allErrors.push(...dupeErrors);
    }

    // 2. Cross-language key parity check (DE ↔ EN)
    if (parsedByLang["de"] && parsedByLang["en"]) {
      const deFile = path.join(localesDir, "de", filename);
      const enFile = path.join(localesDir, "en", filename);

      allErrors.push(
        ...checkMissingKeys(deFile, parsedByLang["de"], enFile, parsedByLang["en"])
      );
      allErrors.push(
        ...checkMissingKeys(enFile, parsedByLang["en"], deFile, parsedByLang["de"])
      );
    }
  }

  return allErrors;
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const errors = lintI18n();

  if (errors.length === 0) {
    console.log("✅  i18n lint passed – no issues found.");
    process.exit(0);
  }

  console.error(`\n❌  i18n lint found ${errors.length} issue(s):\n`);

  const byFile = new Map<string, LintError[]>();
  for (const err of errors) {
    if (!byFile.has(err.file)) byFile.set(err.file, []);
    byFile.get(err.file)!.push(err);
  }

  for (const [file, fileErrors] of byFile.entries()) {
    const relPath = path.relative(process.cwd(), file);
    console.error(`  📄  ${relPath}`);
    for (const e of fileErrors) {
      const icon = e.type === "duplicate" ? "🔁" : "❓";
      console.error(`      ${icon}  ${e.message}`);
    }
    console.error();
  }

  process.exit(1);
}
