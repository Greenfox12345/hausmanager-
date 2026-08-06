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

// ─── Formel-Engine ────────────────────────────────────────────────────────────

/**
 * Ergebnis einer Formel-Auswertung.
 */
export type FormulaResult =
  | { ok: true; value: number; display: string }
  | { ok: false; error: "missing_vars" | "cycle" | "parse_error" | "div_zero"; missing?: string[] };

/**
 * Parst einen Modifier am Ende einer Formel.
 * Unterstützt: !Aufrunden, !Abrunden, !Runden
 * Gibt {formula, modifier} zurück.
 */
function extractModifier(formula: string): { expr: string; modifier: "ceil" | "floor" | "round" | null } {
  const m = formula.match(/^(.*?)\s*!(Aufrunden|Abrunden|Runden)\s*$/i);
  if (!m) return { expr: formula.trim(), modifier: null };
  const mod = m[2].toLowerCase();
  return {
    expr: m[1].trim(),
    modifier: mod === "aufrunden" ? "ceil" : mod === "abrunden" ? "floor" : "round",
  };
}

/**
 * Ersetzt alle VAR-Token in einem Ausdruck durch ihre numerischen Werte.
 * Gibt null zurück wenn eine Variable fehlt oder keinen numerischen Wert hat.
 * Erkennt Zyklen über den `visiting`-Set.
 */
function resolveVars(
  expr: string,
  varMap: Record<string, string>,
  visiting: Set<string>
): { resolved: string; missing: string[] } {
  const missing: string[] = [];
  const regex = new RegExp(VAR_REGEX.source, "g");
  const result = expr.replace(regex, (_, varName) => {
    if (visiting.has(varName)) {
      missing.push(`${varName}(Zyklus)`);
      return "NaN";
    }
    const rawValue = varMap[varName];
    if (rawValue === undefined || rawValue === "") {
      missing.push(varName);
      return "NaN";
    }
    // Wenn der Wert selbst eine Formel ist, rekursiv auswerten
    const num = parseFloat(rawValue);
    if (!isNaN(num)) return String(num);
    // Wert enthält VAR-Referenzen → rekursiv auflösen
    visiting.add(varName);
    const sub = resolveVars(rawValue, varMap, visiting);
    visiting.delete(varName);
    if (sub.missing.length > 0) {
      missing.push(...sub.missing);
      return "NaN";
    }
    return sub.resolved;
  });
  return { resolved: result, missing };
}

/**
 * Wertet einen mathematischen Ausdruck aus.
 * Unterstützt: +, -, *, ×, /, (, )
 * Gibt null bei Parse-Fehler zurück.
 */
function evalMathExpr(expr: string): number | null {
  // × durch * ersetzen, dann sicher auswerten
  const sanitized = expr
    .replace(/×/g, "*")
    .replace(/[^0-9+\-*/().\s]/g, ""); // nur erlaubte Zeichen
  if (!sanitized.trim()) return null;
  try {
    // Sichere Auswertung ohne eval: rekursiver Descent-Parser
    return parseMathExpr(sanitized.trim());
  } catch {
    return null;
  }
}

/** Einfacher rekursiver Descent-Parser für +, -, *, / */
function parseMathExpr(expr: string): number {
  let pos = 0;

  function skipWs() { while (pos < expr.length && expr[pos] === " ") pos++; }

  function parseNumber(): number {
    skipWs();
    let neg = false;
    if (expr[pos] === "-") { neg = true; pos++; }
    if (expr[pos] === "(") {
      pos++; // (
      const val = parseAddSub();
      skipWs();
      if (expr[pos] === ")") pos++;
      return neg ? -val : val;
    }
    let start = pos;
    while (pos < expr.length && (expr[pos] >= "0" && expr[pos] <= "9" || expr[pos] === ".")) pos++;
    if (pos === start) throw new Error("Expected number at " + pos);
    return (neg ? -1 : 1) * parseFloat(expr.slice(start, pos));
  }

  function parseMulDiv(): number {
    let left = parseNumber();
    while (true) {
      skipWs();
      if (pos >= expr.length) break;
      const op = expr[pos];
      if (op !== "*" && op !== "/") break;
      pos++;
      const right = parseNumber();
      if (op === "*") left *= right;
      else {
        if (right === 0) throw new Error("Division by zero");
        left /= right;
      }
    }
    return left;
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (true) {
      skipWs();
      if (pos >= expr.length) break;
      const op = expr[pos];
      if (op !== "+" && op !== "-") break;
      pos++;
      const right = parseMulDiv();
      if (op === "+") left += right;
      else left -= right;
    }
    return left;
  }

  const result = parseAddSub();
  skipWs();
  if (pos < expr.length) throw new Error("Unexpected char: " + expr[pos]);
  return result;
}

/**
 * Wertet eine Formel aus, die VAR-Referenzen enthalten kann.
 *
 * @param formula  Die Formel, z.B. "VARHöhe / VARBreite !Aufrunden"
 * @param varMap   Map von Variablenname → Wert (als String, kann selbst Formeln enthalten)
 * @param varName  Name der Variable die gerade ausgewertet wird (für Zyklenerkennung)
 */
export function evaluateFormula(
  formula: string,
  varMap: Record<string, string>,
  varName?: string
): FormulaResult {
  if (!formula.trim()) return { ok: false, error: "parse_error" };

  // Modifier extrahieren
  const { expr, modifier } = extractModifier(formula);

  // Direkte Zahl?
  const directNum = parseFloat(expr);
  if (!isNaN(directNum) && String(directNum) === expr.replace(/\s/g, "")) {
    const val = applyModifier(directNum, modifier);
    return { ok: true, value: val, display: formatNumber(val) };
  }

  // VAR-Referenzen auflösen
  const visiting = new Set<string>(varName ? [varName] : []);
  const { resolved, missing } = resolveVars(expr, varMap, visiting);

  if (missing.length > 0) {
    return { ok: false, error: missing.some(m => m.includes("Zyklus")) ? "cycle" : "missing_vars", missing };
  }

  // Mathematischen Ausdruck auswerten
  let value: number | null;
  try {
    value = evalMathExpr(resolved);
  } catch (e: any) {
    if (e.message?.includes("zero")) return { ok: false, error: "div_zero" };
    return { ok: false, error: "parse_error" };
  }

  if (value === null || isNaN(value)) return { ok: false, error: "parse_error" };

  const final = applyModifier(value, modifier);
  return { ok: true, value: final, display: formatNumber(final) };
}

function applyModifier(value: number, modifier: "ceil" | "floor" | "round" | null): number {
  if (modifier === "ceil") return Math.ceil(value);
  if (modifier === "floor") return Math.floor(value);
  if (modifier === "round") return Math.round(value);
  return value;
}

function formatNumber(n: number): string {
  // Maximal 4 Nachkommastellen, trailing zeros entfernen
  return parseFloat(n.toFixed(4)).toString();
}

/**
 * Baut eine vollständige Wert-Map auf, in der alle Variablen mit ihren
 * (ggf. berechneten) Werten stehen.
 * Variablen ohne Wert werden nicht eingetragen.
 */
export function buildVarValueMap(variables: PlanVariable[]): Record<string, string> {
  const rawMap: Record<string, string> = {};
  for (const v of variables) {
    if (v.value) rawMap[v.name] = v.value;
  }
  return rawMap;
}

/**
 * Wertet alle Variablen einer Vorlage aus und gibt eine Map
 * varName → { result, unit } zurück.
 */
export function evaluateAllVars(
  variables: PlanVariable[]
): Record<string, { result: FormulaResult; unit?: string }> {
  const rawMap = buildVarValueMap(variables);
  const out: Record<string, { result: FormulaResult; unit?: string }> = {};
  for (const v of variables) {
    if (!v.value) continue;
    out[v.name] = {
      result: evaluateFormula(v.value, rawMap, v.name),
      unit: v.unit,
    };
  }
  return out;
}

/**
 * Extrahiert alle Variablen-Zuweisungen aus Aufgaben-Texten.
 * Gibt eine Map varName → [{taskName, formula, result?}] zurück.
 *
 * Eine Zuweisung liegt vor wenn eine Zeile das Muster "VARName = ..." enthält.
 */
export interface VarAssignment {
  taskId: number;
  taskName: string;
  formula: string;
  result?: FormulaResult;
}

export function extractVarAssignmentsFromTasks(
  tasks: Array<{ id: number; name: string; description?: string | null }>,
  varMap: Record<string, string>
): Record<string, VarAssignment[]> {
  const out: Record<string, VarAssignment[]> = {};

  for (const task of tasks) {
    // Suche in Name und Beschreibung nach Zuweisungen
    const texts = [task.name, task.description ?? ""];
    for (const text of texts) {
      // Jede Zeile prüfen
      const lines = text.split(/[;\n]/);
      for (const line of lines) {
        const assignment = parseVarAssignment(line.trim());
        if (!assignment) continue;
        const { varName, formula } = assignment;
        if (!out[varName]) out[varName] = [];
        // Duplikate vermeiden (gleiche Aufgabe + gleiche Formel)
        const exists = out[varName].some(a => a.taskId === task.id && a.formula === formula);
        if (!exists) {
          out[varName].push({
            taskId: task.id,
            taskName: task.name,
            formula,
            result: evaluateFormula(formula, varMap, varName),
          });
        }
      }
    }
  }

  return out;
}
