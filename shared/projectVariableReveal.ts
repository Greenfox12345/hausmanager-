export type RevealableProjectVariable = {
  name: string;
  value?: string | null;
  description?: string | null;
  overrideValue?: string | null;
};

/**
 * Bereitet Projektvariablen für die bestehende VarText/VarToken-Anzeige vor.
 * Formeldefinitionen und bewusste Überschreibungen bleiben im Original erhalten;
 * für die reine Anzeige steht ihr berechenbarer Ausdruck im Feld `value`.
 */
export function toRevealVariables<T extends RevealableProjectVariable>(variables: T[] | null | undefined): T[] {
  return (variables ?? []).map((variable) => {
    const assignment = variable.description?.match(/^\s*VAR[A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*\s*=\s*(.+)$/i);
    const displayValue = variable.overrideValue?.trim() || assignment?.[1]?.trim() || variable.value;
    return { ...variable, value: displayValue };
  });
}
