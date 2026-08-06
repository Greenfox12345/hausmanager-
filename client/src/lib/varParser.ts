/**
 * varParser.ts – Utility für das Variablen-System in der Plankiste
 *
 * Variablen werden durch das Präfix "VAR" gefolgt von einem Namen erkannt.
 * Erlaubte Zeichen im Namen: Buchstaben (inkl. Umlaute), Ziffern, keine Leerzeichen.
 * Beispiele: VARHochbeetLänge, VARMengeBretter, VARBreite2
 */

/** Regex für einen Variablennamen (nach VAR-Präfix) */
const VAR_NAME_PATTERN = /[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*/;
/** Vollständiges VAR-Token inkl. Präfix */
export const VAR_REGEX = /VAR([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*)/g;

/**
 * Extrahiert alle Variablennamen aus einem Text.
 * Gibt deduplizierte Liste zurück.
 */
export function extractVarNames(text: string): string[] {
  const names = new Set<string>();
  const regex = new RegExp(VAR_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    names.add(m[1]);
  }
  return Array.from(names);
}

/**
 * Generiert eine deterministische Farbe aus einem Variablennamen.
 * Gleicher Name → immer gleiche Farbe.
 */
export function generateVarColor(name: string): string {
  // Einfacher Hash aus dem Namen
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  // Aus einer kuratierten Palette wählen (lesbar auf hellem und dunklem Hintergrund)
  const palette = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
    "#84cc16", // lime-500
    "#ec4899", // pink-500
    "#14b8a6", // teal-500
    "#6366f1", // indigo-500
    "#a855f7", // purple-500
  ];
  return palette[hash % palette.length];
}

/**
 * Erkennt ob ein Text eine Variablen-Zuweisung enthält.
 * Format: VARName = ... (Wert oder Formel)
 * Gibt {varName, formula} zurück oder null.
 */
export function parseVarAssignment(text: string): { varName: string; formula: string } | null {
  // Muster: VARName = Formel (am Anfang der Zeile oder nach Leerzeichen)
  const match = text.match(/^VAR([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*)\s*=\s*(.+)$/);
  if (!match) return null;
  return { varName: match[1], formula: match[2].trim() };
}

/**
 * Ersetzt VAR-Token in einem Text durch farbige Spans (für HTML-Rendering).
 * Gibt ein Array von Text-Segmenten zurück: {text, varName?, color?}
 */
export type TextSegment =
  | { type: "text"; text: string }
  | { type: "var"; varName: string; color: string; fullToken: string };

export function tokenizeWithVars(
  text: string,
  varColors: Record<string, string>
): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(VAR_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text vor dem Match
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const varName = match[1];
    const color = varColors[varName] ?? generateVarColor(varName);
    segments.push({ type: "var", varName, color, fullToken: match[0] });
    lastIndex = match.index + match[0].length;
  }

  // Restlicher Text
  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Mergt neue Variablen aus einem Text in eine bestehende Variablen-Liste.
 * Neue Variablen bekommen eine automatische Farbe.
 * Bestehende Variablen werden nicht überschrieben.
 */
export interface PlanVariable {
  name: string;
  color: string;
  value?: string;
  unit?: string;
  description?: string;
}

export function mergeVarsFromText(
  text: string,
  existing: PlanVariable[]
): PlanVariable[] {
  const newNames = extractVarNames(text);
  const existingNames = new Set(existing.map(v => v.name));
  const result = [...existing];

  for (const name of newNames) {
    if (!existingNames.has(name)) {
      result.push({ name, color: generateVarColor(name) });
      existingNames.add(name);
    }
  }

  return result;
}

/**
 * Baut eine Map von Variablenname → Farbe aus einer Variablen-Liste.
 */
export function buildVarColorMap(variables: PlanVariable[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of variables) {
    map[v.name] = v.color;
  }
  return map;
}

/**
 * Erstellt eine Regex die exakt VARName matcht, aber NICHT VARNameLänger.
 * Nutzt negativen Lookahead um sicherzustellen, dass nach dem Namen kein
 * weiterer Buchstabe/Ziffer folgt.
 *
 * Beispiel: exactVarRegex("Brett") matcht "VARBrett " aber nicht "VARBrettBreite"
 */
export function exactVarRegex(varName: string): RegExp {
  // Escape für Sonderzeichen im Namen (Umlaute sind sicher, aber zur Sicherheit)
  const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Negativer Lookahead: nach dem Namen darf kein Buchstabe/Ziffer/Umlaut folgen
  return new RegExp(`VAR${escaped}(?![A-Za-zÄÖÜäöüß0-9])`, "g");
}

/**
 * Zählt wie oft eine Variable exakt in einem Text vorkommt.
 * VARBrett zählt nicht in VARBrettBreite.
 */
export function countVarMentions(text: string, varName: string): number {
  const regex = exactVarRegex(varName);
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Entfernt alle exakten Vorkommen von VARName aus einem Text.
 * VARBrettBreite bleibt unberührt wenn varName="Brett".
 */
export function removeVarFromText(text: string, varName: string): string {
  const regex = exactVarRegex(varName);
  return text.replace(regex, "");
}
