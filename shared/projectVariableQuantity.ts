export type ProjectQuantityVariable = {
  name: string;
  value?: string;
  description?: string;
  overrideValue?: string;
};

function getFormula(variable: ProjectQuantityVariable): string | undefined {
  if (variable.overrideValue?.trim()) return variable.overrideValue.trim();
  const assignment = variable.description?.match(/^\s*VAR[A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*\s*=\s*(.+)$/i);
  return assignment?.[1]?.trim() || variable.value?.trim();
}

/** Berechnet eine Projektvariablen-Menge für ein numerisches Datenbankfeld. */
export function resolveProjectVariableQuantity(
  expression: string | null | undefined,
  variables: ProjectQuantityVariable[],
): string | null {
  if (!expression?.trim()) return null;
  const byName = new Map(variables.map((variable) => [variable.name, variable]));
  const cache = new Map<string, number>();

  const evaluateVariable = (name: string, visited: Set<string>): number | null => {
    if (cache.has(name)) return cache.get(name)!;
    if (visited.has(name)) return null;
    const variable = byName.get(name);
    const formula = variable ? getFormula(variable) : undefined;
    if (!formula) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(name);
    const value = evaluateExpression(formula, nextVisited);
    if (value !== null) cache.set(name, value);
    return value;
  };

  const evaluateExpression = (source: string, visited: Set<string>): number | null => {
    const shouldRound = /!Runden\s*$/i.test(source);
    const numericExpression = source
      .replace(/!Runden\s*$/i, "")
      .replace(/(\d)\s+[xX]\s+(?=\d|VAR)/g, "$1 * ")
      .replace(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g, (match, name) => {
        const result = evaluateVariable(name, visited);
        return result === null ? match : String(result);
      })
      .replace(/,/g, ".")
      .trim();
    if (/VAR[A-Za-zÄÖÜäöüß]/.test(numericExpression) || !/^[0-9+\-*/().\s]+$/.test(numericExpression)) return null;
    try {
      const result = Function(`"use strict"; return (${numericExpression});`)();
      if (typeof result !== "number" || !Number.isFinite(result)) return null;
      return shouldRound ? Math.round(result) : result;
    } catch {
      return null;
    }
  };

  const result = evaluateExpression(expression, new Set());
  return result === null ? null : String(result);
}
