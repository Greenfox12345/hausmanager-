export type ProjectVariableDisplay = {
  name: string;
  value?: string | null;
  unit?: string | null;
  description?: string | null;
  overrideValue?: string | null;
};

function getVariableFormula(variable: ProjectVariableDisplay): string | null {
  if (variable.overrideValue?.trim()) return variable.overrideValue.trim();
  const assignment = variable.description?.match(/^\s*VAR[A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*\s*=\s*(.+)$/i);
  return assignment?.[1]?.trim() || variable.value?.trim() || null;
}

function resolveNumericVariable(name: string, variables: ProjectVariableDisplay[], visited = new Set<string>()): number | null {
  const variable = variables.find((item) => item.name === name);
  const formula = variable ? getVariableFormula(variable) : null;
  if (!formula || visited.has(name)) return null;
  const nextVisited = new Set(visited);
  nextVisited.add(name);
  const shouldRound = /!Runden\s*$/i.test(formula);
  const expression = formula.replace(/!Runden\s*$/i, "").replace(/\bx\b/gi, "*").replace(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g, (_token, dependency) => {
    const value = resolveNumericVariable(dependency, variables, nextVisited);
    return value === null ? "NaN" : String(value);
  }).replace(/,/g, ".").replace(/\s+/g, "");
  if (!/^[0-9+\-*/().NaN]+$/.test(expression) || expression.includes("NaN")) return null;
  try {
    const result = Function(`"use strict"; return (${expression});`)();
    return typeof result === "number" && Number.isFinite(result) ? (shouldRound ? Math.round(result) : result) : null;
  } catch { return null; }
}

/** Ersetzt direkte Projektvariablen nur für die Anzeige; gespeicherte Texte bleiben unverändert. */
export function resolveProjectVariableDisplay(text: string | null | undefined, variables: ProjectVariableDisplay[] | null | undefined): string {
  if (!text || !variables?.length) return text ?? "";
  return text.replace(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g, (token, name) => {
    const variable = variables.find((item) => item.name === name);
    if (!variable || !getVariableFormula(variable)) return token;
    const numeric = resolveNumericVariable(name, variables);
    const value = numeric !== null ? String(Number(numeric.toFixed(6))) : token;
    return `${value}${variable.unit ? ` ${variable.unit}` : ""}`;
  });
}
