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
  const t = text.trim();

  // Präfix-Bereinigung: Text vor dem ersten VAR-Token entfernen wenn kein "=" dazwischen
  // z.B. "Höhe: VARBretterProSeite = ..." → "VARBretterProSeite = ..."
  const cleanText = (() => {
    const firstVarIdx = t.search(/VAR[A-Za-zÄÖÜäöüß]/);
    const firstEqIdx = t.indexOf("=");
    if (firstVarIdx > 0 && (firstEqIdx === -1 || firstVarIdx < firstEqIdx)) {
      const prefix = t.slice(0, firstVarIdx);
      if (!prefix.includes("=")) {
        return t.slice(firstVarIdx);
      }
    }
    return t;
  })();

  // Doppelpunkt mit Leerzeichen beidseitig als Division behandeln
  // z.B. "VARHöhe : VARBreite" → "VARHöhe / VARBreite"
  const normalized = cleanText.replace(/\s+:\s+/g, " / ");

  // Format 1 (Standard): VARName = Formel
  // z.B. "VARBretterProSeite = VARGrobeHöhe / VARBrettBreite !Runden"
  const matchLeft = normalized.match(/^VAR([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*)\s*=\s*(.+)$/);
  if (matchLeft) {
    return { varName: matchLeft[1], formula: matchLeft[2].trim() };
  }

  // Format 2 (umgekehrt): Formel = VARName [!Modifier]
  // z.B. "VARGrobeHöhe / VARBrettBreite = VARBretterProSeite !Runden"
  const matchRight = normalized.match(/^(.+?)\s*=\s*VAR([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*)(\s*![A-Za-z]+)?\s*$/);
  if (matchRight) {
    const formula = matchRight[1].trim();
    const varName = matchRight[2];
    const modifier = matchRight[3]?.trim() ?? "";
    if (!formula.includes("=")) {
      return { varName, formula: modifier ? `${formula} ${modifier}` : formula };
    }
  }

  return null;
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
  /** Bewusster Projektwert, der eine berechnete Definition nur für dieses Projekt überschreibt. */
  overrideValue?: string;
  unit?: string;
  description?: string;
  /** Alias-Kurzname, aufrufbar mit &Name */
  alias?: string;
  /** Untere Grenze (inklusive) für Eingabe-Variablen */
  min?: string;
  /** Obere Grenze (inklusive) für Eingabe-Variablen */
  max?: string;
  /** Wenn true, kann der Wert nicht über UI geändert werden */
  locked?: boolean;
  /** Feste Vorgabe gilt projektweit; durchlaufbezogene Eingaben werden erst durch eine Aufgabe bestätigt. */
  inputScope?: "fixed" | "runtime";
  /** Im aktuellen Projektdurchlauf mit einer Eingabeaufgabe bestätigte Herleitung oder Definition. */
  runtimeDefinition?: string;
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
  | { ok: true; value: number; display: string; unit?: string }
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
 * Interne Formel-Auswertung mit bestehendem visiting-Set (für rekursive Aufrufe aus resolveVars).
 * Wendet Modifier (!Runden etc.) korrekt an.
 */
function evaluateFormulaInternal(
  formula: string,
  varMap: Record<string, string>,
  visiting: Set<string>
): FormulaResult {
  if (!formula.trim()) return { ok: false, error: "parse_error" };
  const { expr, modifier } = extractModifier(formula);
  const directNum = parseFloat(expr);
  if (!isNaN(directNum) && String(directNum) === expr.replace(/\s/g, "")) {
    const val = applyModifier(directNum, modifier);
    return { ok: true, value: val, display: formatNumber(val), unit: undefined };
  }
  const { resolved, missing } = resolveVars(expr, varMap, visiting);
  if (missing.length > 0) {
    return { ok: false, error: missing.some(m => m.includes("Zyklus")) ? "cycle" : "missing_vars", missing };
  }
  let value: number | null;
  try {
    value = evalMathExpr(resolved);
  } catch (e: any) {
    if (e.message?.includes("zero")) return { ok: false, error: "div_zero" };
    return { ok: false, error: "parse_error" };
  }
  if (value === null || isNaN(value)) return { ok: false, error: "parse_error" };
  const final = applyModifier(value, modifier);
  // Einheit propagieren: wenn alle VAR-Referenzen dieselbe Einheit haben, übernehmen
  const unit = inferUnit(expr, varMap);
  return { ok: true, value: final, display: formatNumber(final), unit };
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
    // Wenn der Wert selbst eine direkte Zahl ist, direkt zurückgeben
    const num = parseFloat(rawValue);
    if (!isNaN(num) && String(num) === rawValue.trim()) return String(num);
    // Wert enthält VAR-Referenzen oder Modifier → vollständig auswerten
    // (damit !Runden etc. korrekt angewendet werden)
    visiting.add(varName);
    const subResult = evaluateFormulaInternal(rawValue, varMap, visiting);
    visiting.delete(varName);
    if (!subResult.ok) {
      if (subResult.error === "missing_vars" && subResult.missing) {
        missing.push(...subResult.missing);
      }
      return "NaN";
    }
    return String(subResult.value);
  });
  return { resolved: result, missing };
}

/**
 * Wertet einen mathematischen Ausdruck aus.
 * Unterstützt: +, -, *, ×, /, (, )
 * Gibt null bei Parse-Fehler zurück.
 */
function evalMathExpr(expr: string): number | null {
  // × durch * ersetzen
  // NaN-Literale beibehalten (entstehen wenn eine VAR nicht aufgelöst werden konnte)
  // Alle anderen nicht-numerischen Zeichen entfernen, aber "NaN" als Ganzes erhalten
  const sanitized = expr
    .replace(/×/g, "*")
    .replace(/\s+x\s+/gi, " * ") // ' x ' mit Leerzeichen als Multiplikation
    .replace(/NaN/g, "___NaN___") // NaN schützen
    .replace(/[^0-9+\-*/().\s_]/g, "") // nur erlaubte Zeichen + Underscore für NaN
    .replace(/___NaN___/g, "NaN"); // NaN wiederherstellen
  if (!sanitized.trim()) return null;
  // Wenn NaN im Ausdruck vorkommt, ist das Ergebnis NaN
  if (sanitized.includes("NaN")) return NaN;
  try {
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
  varName?: string,
  unitMap?: Record<string, string>
): FormulaResult {
  if (!formula.trim()) return { ok: false, error: "parse_error" };

  // Modifier extrahieren
  const { expr, modifier } = extractModifier(formula);

  // Direkte Zahl?
  const directNum = parseFloat(expr);
  if (!isNaN(directNum) && String(directNum) === expr.replace(/\s/g, "")) {
    const val = applyModifier(directNum, modifier);
    return { ok: true, value: val, display: formatNumber(val), unit: undefined };
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
  const unit = unitMap ? inferUnit(expr, varMap, unitMap) : inferUnit(expr, varMap);
  return { ok: true, value: final, display: formatNumber(final), unit };
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
 * Leitet die Einheit eines Ausdrucks ab.
 * Regel: Wenn alle VAR-Referenzen im Ausdruck dieselbe Einheit haben
 *        UND der Ausdruck nur Addition/Subtraktion enthält (keine Division/Multiplikation
 *        die Einheiten verändern würde), wird diese Einheit übernommen.
 * Bei Multiplikation/Division wird keine Einheit propagiert (Einheiten würden sich ändern,
 * z.B. cm * cm = cm² – das ist zu komplex für automatische Inferenz).
 */
function inferUnit(
  expr: string,
  varMap: Record<string, string>,
  unitMap?: Record<string, string>
): string | undefined {
  // Alle VAR-Namen im Ausdruck sammeln
  const varNames: string[] = [];
  const regex = new RegExp(VAR_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = regex.exec(expr)) !== null) varNames.push(m[1]);
  if (varNames.length === 0) return undefined;

  // Prüfen ob der Ausdruck Multiplikation oder Division enthält
  // (nach Entfernung der VAR-Namen und Zahlen)
  const stripped = expr.replace(new RegExp(VAR_REGEX.source, "g"), "0").replace(/[0-9.]/g, "0");
  const hasMulDiv = /[*/×]/.test(stripped);
  if (hasMulDiv && unitMap) {
    // Sonderfall: Wenn nur eine Variable eine Einheit hat und alle anderen dimensionslos sind,
    // propagiere die Einheit der einzigen dimensionierten Variable
    const unitedVars = varNames.filter(n => unitMap[n]);
    const unitlessVars = varNames.filter(n => !unitMap[n]);
    if (unitedVars.length === 1 && unitlessVars.length === varNames.length - 1) {
      return unitMap[unitedVars[0]];
    }
    return undefined; // Mehrere Einheiten bei Mul/Div → nicht propagierbar
  }
  if (hasMulDiv) return undefined;

  // Einheiten aller referenzierten Variablen sammeln
  const units = new Set<string>();
  for (const name of varNames) {
    const unit = unitMap?.[name];
    if (unit) units.add(unit);
  }

  // Nur wenn alle Variablen dieselbe Einheit haben
  if (units.size === 1) return Array.from(units)[0];
  // Wenn manche Variablen keine Einheit haben, aber eine hat eine Einheit → propagieren
  if (units.size === 1) return Array.from(units)[0];
  const allUnits = varNames.map(n => unitMap?.[n]).filter(Boolean);
  if (allUnits.length === 1) return allUnits[0] as string;
  return undefined;
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
  const unitMap: Record<string, string> = {};
  for (const v of variables) { if (v.unit) unitMap[v.name] = v.unit; }
  const out: Record<string, { result: FormulaResult; unit?: string }> = {};
  for (const v of variables) {
    if (!v.value) continue;
    const result = evaluateFormula(v.value, rawMap, v.name, unitMap);
    // Einheit: explizit gesetzte Einheit hat Vorrang, sonst propagierte Einheit
    const unit = v.unit ?? (result.ok ? result.unit : undefined);
    out[v.name] = { result, unit };
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

// ─── Topologische Sortierung ──────────────────────────────────────────────────

/**
 * Topologische Sortierung von Aufgaben nach Vor-/Folgeaufgaben-Abhängigkeiten.
 * Verwendet Kahn's Algorithmus (BFS-basiert).
 *
 * Aufgaben ohne Voraussetzungen kommen zuerst.
 * Bei Zyklen werden die betroffenen Aufgaben am Ende angehängt (in Originalreihenfolge).
 *
 * @param tasks  Aufgaben mit id, prerequisiteItemIds, followupItemIds
 * @returns Sortierte Aufgaben-Liste
 */
export function topoSortTasks<T extends {
  id: number;
  prerequisiteItemIds?: unknown;
  followupItemIds?: unknown;
}>(tasks: T[]): T[] {
  if (tasks.length === 0) return tasks;

  // Normalisierung: altes Format (number[]) und neues Format ({id, gapDays}[]) unterstützen
  const getIds = (raw: unknown): number[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((e: unknown) => typeof e === "number" ? e : (e as {id: number}).id);
  };

  const taskMap = new Map<number, T>(tasks.map(t => [t.id, t]));

  // Eingangsgrade berechnen (wie viele Voraussetzungen hat jede Aufgabe?)
  const inDegree = new Map<number, number>(tasks.map(t => [t.id, 0]));
  // Adjazenzliste: von Voraussetzung → abhängige Aufgaben
  const adj = new Map<number, number[]>(tasks.map(t => [t.id, []]));

  for (const task of tasks) {
    const prereqs = getIds(task.prerequisiteItemIds);
    for (const prereqId of prereqs) {
      if (taskMap.has(prereqId)) {
        // prereqId → task.id
        adj.get(prereqId)!.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
      }
    }
  }

  // Kahn's Algorithmus: Starte mit allen Aufgaben ohne Voraussetzungen
  // Reihenfolge innerhalb einer Ebene: Originalreihenfolge beibehalten
  const queue: number[] = tasks
    .filter(t => (inDegree.get(t.id) ?? 0) === 0)
    .map(t => t.id);

  const result: T[] = [];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const task = taskMap.get(id);
    if (task) result.push(task);

    // Nachfolger in Originalreihenfolge hinzufügen
    const successors = (adj.get(id) ?? [])
      .filter(sid => !visited.has(sid))
      .sort((a, b) => {
        const ia = tasks.findIndex(t => t.id === a);
        const ib = tasks.findIndex(t => t.id === b);
        return ia - ib;
      });

    for (const sid of successors) {
      const newDegree = (inDegree.get(sid) ?? 1) - 1;
      inDegree.set(sid, newDegree);
      if (newDegree === 0) queue.push(sid);
    }
  }

  // Aufgaben in Zyklen am Ende anhängen (Originalreihenfolge)
  for (const task of tasks) {
    if (!visited.has(task.id)) result.push(task);
  }

  return result;
}

/**
 * Topologische Sortierung von Variablen nach Abhängigkeiten.
 * Variablen die andere referenzieren kommen nach denen, von denen sie abhängen.
 * Eingabe-Variablen (kein VAR in value) kommen zuerst.
 *
 * Bei Zyklen werden die betroffenen Variablen am Ende angehängt.
 */
export function topoSortVars(variables: PlanVariable[]): PlanVariable[] {
  if (variables.length === 0) return variables;

  const varNames = new Set(variables.map(v => v.name));

  // Abhängigkeiten: welche VAR-Namen referenziert der Wert einer Variable?
  const getDeps = (v: PlanVariable): string[] => {
    if (!v.value) return [];
    const deps: string[] = [];
    const regex = new RegExp(VAR_REGEX.source, "g");
    let m: RegExpExecArray | null;
    while ((m = regex.exec(v.value)) !== null) {
      const dep = m[1];
      if (varNames.has(dep) && dep !== v.name) deps.push(dep);
    }
    return deps;
  };

  const varMap = new Map<string, PlanVariable>(variables.map(v => [v.name, v]));
  const inDegree = new Map<string, number>(variables.map(v => [v.name, 0]));
  const adj = new Map<string, string[]>(variables.map(v => [v.name, []]));

  for (const v of variables) {
    const deps = getDeps(v);
    for (const dep of deps) {
      if (varMap.has(dep)) {
        adj.get(dep)!.push(v.name);
        inDegree.set(v.name, (inDegree.get(v.name) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = variables
    .filter(v => (inDegree.get(v.name) ?? 0) === 0)
    .map(v => v.name);

  const result: PlanVariable[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const name = queue.shift()!;
    if (visited.has(name)) continue;
    visited.add(name);
    const v = varMap.get(name);
    if (v) result.push(v);

    const successors = (adj.get(name) ?? [])
      .filter(s => !visited.has(s))
      .sort((a, b) => {
        const ia = variables.findIndex(v => v.name === a);
        const ib = variables.findIndex(v => v.name === b);
        return ia - ib;
      });

    for (const s of successors) {
      const newDegree = (inDegree.get(s) ?? 1) - 1;
      inDegree.set(s, newDegree);
      if (newDegree === 0) queue.push(s);
    }
  }

  for (const v of variables) {
    if (!visited.has(v.name)) result.push(v);
  }

  return result;
}

// ─── Alias-System ─────────────────────────────────────────────────────────────

/**
 * Baut eine Map von Alias → vollständiger VAR-Name auf.
 * Beispiel: { "Breite": "HochbeetBreite" } wenn VARHochbeetBreite alias="Breite" hat.
 */
export function buildAliasMap(variables: PlanVariable[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of variables) {
    if (v.alias) map[v.alias] = v.name;
  }
  return map;
}

/**
 * Ersetzt &Alias-Token in einem Text durch den vollständigen VARName.
 * Beispiel: "&Breite" → "VARHochbeetBreite" (wenn alias "Breite" → "HochbeetBreite")
 */
export function resolveAliases(text: string, aliasMap: Record<string, string>): string {
  const regex = new RegExp(ALIAS_REGEX.source, "g");
  return text.replace(regex, (_, aliasName) => {
    const varName = aliasMap[aliasName];
    return varName ? `VAR${varName}` : `&${aliasName}`; // unbekannte Aliases unverändert lassen
  });
}

/**
 * Tokenisiert einen Text und ersetzt &-Alias-Token durch VarToken-Segmente.
 * Gibt Segmente zurück: { type: "text" | "var" | "alias", text?, varName?, aliasName? }
 */
export function tokenizeWithAliases(
  text: string,
  colorMap: Record<string, string>,
  aliasMap: Record<string, string>
): Array<{ type: "text"; text: string } | { type: "var"; varName: string; color: string } | { type: "alias"; aliasName: string; varName?: string; color?: string }> {
  // Erst Aliases auflösen, dann normal tokenisieren
  const resolved = resolveAliases(text, aliasMap);
  return tokenizeWithVars(resolved, colorMap);
}

// ─── Bereichs-Erkennung ───────────────────────────────────────────────────────

/**
 * Ergebnis der Bereichs-Erkennung aus einem Text.
 */
export interface RangeHint {
  varName: string;       // Name der Variable (ohne VAR-Präfix)
  min?: string;          // Untere Grenze (Zahl oder VARName)
  max?: string;          // Obere Grenze (Zahl oder VARName)
  sourceText: string;    // Originaltext der Fundstelle
}

/**
 * Extrahiert Bereichs-Hinweise aus einem Text.
 * Erkennt Muster wie:
 *   - "10 ≤ VARBreite ≤ 200"
 *   - "10 <= VARBreite <= 200"
 *   - "10 < VARBreite < 200"
 *   - "VARMin < VARBreite < VARMax"
 *   - "VARBreite1 < VARBreite2 < 100" (Breite1 = min für Breite2)
 */
export function extractRangeHints(text: string): RangeHint[] {
  const hints: RangeHint[] = [];
  // Grenzwert: Zahl (optional mit Einheit wie cm, m, kg, %) oder VAR-Referenz
  const varPat = `(?:VAR[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*|[0-9]+(?:\\.[0-9]+)?(?:[A-Za-z%°]+)?)`;
  const cmpPat = `(?:<=|>=|≤|≥|<|>)`;
  // Muster: WERT CMP VAR CMP WERT
  const pattern = new RegExp(
    `(${varPat})\\s*(${cmpPat})\\s*(VAR[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*)\\s*(${cmpPat})\\s*(${varPat})`,
    "g"
  );
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const [full, left, cmpLeft, varToken, cmpRight, right] = m;
    const varName = varToken.replace(/^VAR/, "");
    // Normalisieren: linker Wert ist min, rechter ist max
    // (bei > / >= ist die Richtung umgekehrt)
    const leftIsMin = cmpLeft === "<" || cmpLeft === "<=" || cmpLeft === "≤";
    const minRaw = leftIsMin ? left : right;
    const maxRaw = leftIsMin ? right : left;
    // Einheit aus Grenzwert entfernen (z.B. "30cm" → "30"), VAR-Referenzen unverändert lassen
    const normalizeVal = (v: string) => {
      if (v.startsWith("VAR")) return v;
      // Zahl + optionale Einheit: nur die Zahl behalten
      const numMatch = v.match(/^([0-9]+(?:\.[0-9]+)?)/);
      return numMatch ? numMatch[1] : v;
    };
    hints.push({
      varName,
      min: normalizeVal(minRaw),
      max: normalizeVal(maxRaw),
      sourceText: full,
    });
  }
  return hints;
}

/**
 * Extrahiert alle Bereichs-Hinweise aus allen Aufgaben-Texten.
 * Gibt Map varName → RangeHint[] zurück.
 */
export function extractRangeHintsFromTasks(
  tasks: Array<{ name?: string; description?: string }>
): Record<string, RangeHint[]> {
  const result: Record<string, RangeHint[]> = {};
  for (const task of tasks) {
    const texts = [task.name ?? "", task.description ?? ""];
    for (const text of texts) {
      const hints = extractRangeHints(text);
      for (const hint of hints) {
        if (!result[hint.varName]) result[hint.varName] = [];
        // Duplikate vermeiden
        const exists = result[hint.varName].some(
          h => h.min === hint.min && h.max === hint.max
        );
        if (!exists) result[hint.varName].push(hint);
      }
    }
  }
  return result;
}
/** Regex für &-Alias-Token */
export const ALIAS_REGEX = /&([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*)/g;

/**
 * Einheits-Hinweis: VAR-Name → erkannte Einheit aus Aufgabentexten
 */
export interface UnitHint {
  varName: string;
  unit: string;
  sourceText: string;
}

/**
 * Erkennt Einheiten neben VAR-Namen in Texten.
 * Muster: "VARName cm", "VARName = 30 cm", "30 cm VARName", "VARName: 30cm"
 * Bekannte Einheiten: cm, m, mm, km, kg, g, mg, l, ml, °C, %, Stück, St., stk
 */
export function extractUnitHints(text: string): UnitHint[] {
  const hints: UnitHint[] = [];
  const UNIT_PAT = `(?:cm|mm|m(?!VAR)|km|kg|g(?!VAR)|mg|l(?!VAR)|ml|°C|°F|%|Stück|St\\.|stk|pcs|ft|in|lbs|oz)`;
  const VAR_PAT = `VAR[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*`;

  // Muster 1: VARName = Zahl Einheit  (z.B. VARBreite = 30 cm)
  const pat1 = new RegExp(`(${VAR_PAT})\\s*=\\s*[0-9]+(?:\\.[0-9]+)?\\s*(${UNIT_PAT})(?![A-Za-z])`, "g");
  let m: RegExpExecArray | null;
  while ((m = pat1.exec(text)) !== null) {
    hints.push({ varName: m[1].replace(/^VAR/, ""), unit: m[2], sourceText: m[0] });
  }

  // Muster 2: Zahl Einheit < VARName < Zahl Einheit  (aus Bereichsangaben)
  const pat2 = new RegExp(`[0-9]+(?:\\.[0-9]+)?\\s*(${UNIT_PAT})\\s*[<>≤≥]=?\\s*(${VAR_PAT})`, "g");
  while ((m = pat2.exec(text)) !== null) {
    hints.push({ varName: m[2].replace(/^VAR/, ""), unit: m[1], sourceText: m[0] });
  }

  // Muster 3: VARName Einheit (direkt dahinter, z.B. "VARBreite cm")
  const pat3 = new RegExp(`(${VAR_PAT})\\s+(${UNIT_PAT})(?![A-Za-z0-9])`, "g");
  while ((m = pat3.exec(text)) !== null) {
    hints.push({ varName: m[1].replace(/^VAR/, ""), unit: m[2], sourceText: m[0] });
  }

  // Duplikate entfernen (gleicher varName + unit)
  const seen = new Set<string>();
  return hints.filter(h => {
    const key = `${h.varName}:${h.unit}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extrahiert alle Einheits-Hinweise aus allen Aufgaben-Texten.
 * Gibt Map varName → UnitHint[] zurück.
 */
export function extractUnitHintsFromTasks(
  tasks: Array<{ name?: string; description?: string }>
): Record<string, UnitHint[]> {
  const result: Record<string, UnitHint[]> = {};
  for (const task of tasks) {
    const texts = [task.name ?? "", task.description ?? ""];
    for (const text of texts) {
      const hints = extractUnitHints(text);
      for (const hint of hints) {
        if (!result[hint.varName]) result[hint.varName] = [];
        const exists = result[hint.varName].some(h => h.unit === hint.unit);
        if (!exists) result[hint.varName].push(hint);
      }
    }
  }
  return result;
}
