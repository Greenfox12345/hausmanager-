type ProjectVariableLike = { name: string; value?: string | null; unit?: string | null };

function plainNumber(value: string): number | null {
  const match = value.trim().replace(",", ".").match(/^-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function resolveVariable(name: string, variables: ProjectVariableLike[], visiting = new Set<string>()): { value: number; unit?: string } | null {
  const variable = variables.find((item) => item.name === name);
  if (!variable?.value || visiting.has(name)) return null;
  const direct = plainNumber(variable.value);
  if (direct !== null && !/VAR/.test(variable.value)) return { value: direct, unit: variable.unit ?? undefined };
  visiting.add(name);
  const resolved = resolveVariableExpression(variable.value, variables, visiting);
  visiting.delete(name);
  return resolved === null ? null : { value: resolved, unit: variable.unit ?? undefined };
}

export function resolveVariableExpression(expression: string, variables: ProjectVariableLike[], visiting = new Set<string>()): number | null {
  const replaced = expression
    .replace(/\bx\b/g, "*")
    .replace(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g, (_token, variableName) => {
      const resolved = resolveVariable(variableName, variables, new Set(visiting));
      return resolved ? String(resolved.value) : "NaN";
    })
    .replace(/!\w+/g, "")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");
  if (!/^[0-9+\-*/().NaN]+$/.test(replaced) || replaced.includes("NaN")) return null;
  try {
    const result = Function(`"use strict"; return (${replaced});`)();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export function resolveProjectText(text: string | null | undefined, variables: ProjectVariableLike[]): string | null {
  if (!text) return null;
  return text.replace(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g, (token, variableName) => {
    const resolved = resolveVariable(variableName, variables);
    return resolved ? `${formatNumber(resolved.value)}${resolved.unit ? ` ${resolved.unit}` : ""}` : token;
  });
}

export function resolveProjectQuantity(quantity: string | null | undefined, variables: ProjectVariableLike[]): string | null {
  if (!quantity) return null;
  const result = resolveVariableExpression(quantity, variables);
  return result === null ? null : formatNumber(result);
}
