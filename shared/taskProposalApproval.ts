/**
 * Liest einen gespeicherten DATETIME-Wert unabhängig davon, ob der Datenbanktreiber
 * ihn als Date oder als Zeichenfolge liefert. Die Rückgabe hält die lokale
 * Wandzeit fest und vermeidet UTC-Verschiebungen beim späteren Speichern.
 */
export function getTaskDueDateParts(value: unknown): { date: string; time: string } | null {
  if (!value) return null;
  const parsed = value instanceof Date
    ? value
    : new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return null;

  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}
