export type ProjectVariableDisplay = { name: string; value?: string | null; unit?: string | null };

/** Ersetzt direkte Projektvariablen nur für die Anzeige; gespeicherte Texte bleiben unverändert. */
export function resolveProjectVariableDisplay(text: string | null | undefined, variables: ProjectVariableDisplay[] | null | undefined): string {
  if (!text || !variables?.length) return text ?? "";
  return text.replace(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g, (token, name) => {
    const variable = variables.find((item) => item.name === name);
    if (!variable?.value) return token;
    const numeric = Number(variable.value.replace(",", "."));
    const value = Number.isFinite(numeric) ? String(Number(numeric.toFixed(6))) : variable.value;
    return `${value}${variable.unit ? ` ${variable.unit}` : ""}`;
  });
}
