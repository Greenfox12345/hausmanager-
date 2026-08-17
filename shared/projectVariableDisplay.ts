export type ProjectVariableDisplay = { name: string; value?: string | null; unit?: string | null };

function resolveNumericVariable(name: string, variables: ProjectVariableDisplay[], visited = new Set<string>()): number | null {
  const variable = variables.find((item) => item.name === name);
  if (!variable?.value || visited.has(name)) return null;
  visited.add(name);
  const expression = variable.value.replace(/\bx\b/g, "*").replace(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g, (_token, dependency) => {
    const value = resolveNumericVariable(dependency, variables, new Set(visited));
    return value === null ? "NaN" : String(value);
  }).replace(/!\w+/g, "").replace(/,/g, ".").replace(/\s+/g, "");
  if (!/^[0-9+\-*/().NaN]+$/.test(expression) || expression.includes("NaN")) return null;
  try {
    const result = Function(`"use strict"; return (${expression});`)();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch { return null; }
}

/** Ersetzt direkte Projektvariablen nur für die Anzeige; gespeicherte Texte bleiben unverändert. */
export function resolveProjectVariableDisplay(text: string | null | undefined, variables: ProjectVariableDisplay[] | null | undefined): string {
  if (!text || !variables?.length) return text ?? "";
  return text.replace(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g, (token, name) => {
    const variable = variables.find((item) => item.name === name);
    if (!variable?.value) return token;
    const numeric = resolveNumericVariable(name, variables);
    const value = numeric !== null ? String(Number(numeric.toFixed(6))) : variable.value;
    return `${value}${variable.unit ? ` ${variable.unit}` : ""}`;
  });
}
