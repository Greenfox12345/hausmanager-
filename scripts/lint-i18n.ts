/**
 * lint-i18n.ts
 *
 * CI lint script for i18n JSON files.
 * Checks:
 *   1. Duplicate top-level keys within a single file
 *   2. Missing keys: every key present in DE must also exist in EN (and vice versa)
 *   3. Missing translations: t("ns:key") calls in source files where the key
 *      does not exist in any locale JSON. Known gaps are tracked in
 *      scripts/i18n-allowlist.json and excluded from CI failures.
 *
 * Usage:
 *   pnpm lint:i18n          → exits 0 on success, 1 on any NEW violation
 *   pnpm lint:i18n --fix    → not supported (use merge_json_final.py for that)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../client/public/locales");
const SRC_DIR = path.resolve(__dirname, "../client/src");
const ALLOWLIST_FILE = path.resolve(__dirname, "i18n-allowlist.json");
const LANGUAGES = ["de", "en"];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LintError {
  file: string;
  type: "duplicate" | "missing" | "missing_translation";
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a JSON file and return all root-level key occurrences in order,
 * including duplicates. Standard JSON.parse silently drops duplicates,
 * so we use a regex-based approach on the raw text.
 */
function getRootKeyOccurrences(raw: string): string[] {
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

/**
 * Resolve a dot-notation key in a nested object. Returns undefined if missing.
 */
function getNestedValue(obj: Record<string, unknown>, dotKey: string): unknown {
  const parts = dotKey.split(".");
  let node: unknown = obj;
  for (const p of parts) {
    if (typeof node !== "object" || node === null || !(p in (node as object))) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[p];
  }
  return node;
}

/**
 * Scan a source file for all t("namespace:key") calls and return unique keys.
 */
function extractTKeys(filePath: string): string[] {
  let text: string;
  try {
    text = fs.readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }
  const T_CALL_RE = /\bt\(\s*["']([^"']+:[^"']+)["']/g;
  const keys = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = T_CALL_RE.exec(text)) !== null) {
    const key = m[1];
    if (key.includes(":")) keys.add(key);
  }
  return [...keys];
}

/**
 * Recursively collect all .tsx and .ts files under a directory.
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (entry.isFile() && /\.(tsx?|ts)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
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

/**
 * Scan all source files for t() calls and report keys that are missing
 * from ALL language locale files and are NOT in the allowlist.
 */
function checkMissingTranslations(
  localesDir: string,
  srcDir: string,
  allowlist: Set<string>
): LintError[] {
  // Load all locale data: { lang: { namespace: parsedJSON } }
  const localeData: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const lang of LANGUAGES) {
    localeData[lang] = {};
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) continue;
    for (const file of fs.readdirSync(langDir).filter((f) => f.endsWith(".json"))) {
      const ns = file.replace(/\.json$/, "");
      try {
        localeData[lang][ns] = JSON.parse(
          fs.readFileSync(path.join(langDir, file), "utf-8")
        ) as Record<string, unknown>;
      } catch {
        // ignore parse errors (caught by duplicate check)
      }
    }
  }

  // Collect all unique t() keys from source
  const allKeys = new Set<string>();
  for (const file of collectSourceFiles(srcDir)) {
    for (const key of extractTKeys(file)) {
      allKeys.add(key);
    }
  }

  const errors: LintError[] = [];

  for (const fullKey of allKeys) {
    // Skip known gaps
    if (allowlist.has(fullKey)) continue;

    const colonIdx = fullKey.indexOf(":");
    if (colonIdx === -1) continue;
    const ns = fullKey.slice(0, colonIdx);
    const subkey = fullKey.slice(colonIdx + 1);

    // Check if missing in ANY language
    for (const lang of LANGUAGES) {
      const nsData = localeData[lang]?.[ns];
      if (nsData === undefined || getNestedValue(nsData, subkey) === undefined) {
        errors.push({
          file: path.join(localesDir, lang, `${ns}.json`),
          type: "missing_translation",
          message: `Key "${fullKey}" used in source but missing in [${lang}]`,
        });
        break; // report once per key (not per language)
      }
    }
  }

  return errors;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function lintI18n(
  localesDir: string = LOCALES_DIR,
  srcDir: string = SRC_DIR,
  allowlistFile: string = ALLOWLIST_FILE
): LintError[] {
  const allErrors: LintError[] = [];

  // Load allowlist
  let allowlist = new Set<string>();
  if (fs.existsSync(allowlistFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(allowlistFile, "utf-8")) as string[];
      allowlist = new Set(raw);
    } catch {
      // ignore
    }
  }

  // Collect all namespace files (intersection of all languages)
  const filesByLang: Record<string, string[]> = {};
  for (const lang of LANGUAGES) {
    const dir = path.join(localesDir, lang);
    filesByLang[lang] = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
      : [];
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

  // 3. Missing translation keys (only when srcDir is available)
  if (fs.existsSync(srcDir)) {
    allErrors.push(...checkMissingTranslations(localesDir, srcDir, allowlist));
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
      const icon = e.type === "duplicate" ? "🔁" : e.type === "missing_translation" ? "🌐" : "❓";
      console.error(`      ${icon}  ${e.message}`);
    }
    console.error();
  }

  process.exit(1);
}
