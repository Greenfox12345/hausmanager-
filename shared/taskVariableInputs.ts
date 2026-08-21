/**
 * Liefert jede konfigurierte Aufgabenvariable genau einmal zurück, für die noch
 * keine dokumentierte Eingabe vorliegt. Die Reihenfolge der Konfiguration bleibt
 * für eine nachvollziehbare Anzeige im Abschlussdialog erhalten.
 */
export function getMissingTaskVariableInputNames(
  configuredNames: readonly string[] | null | undefined,
  documentedInputs: readonly { variableName: string }[] | null | undefined,
): string[] {
  const documentedNames = new Set((documentedInputs ?? []).map((input) => input.variableName));
  const seen = new Set<string>();
  return (configuredNames ?? []).filter((name) => {
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return !documentedNames.has(name);
  });
}
