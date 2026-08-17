/** Formatiert Mengen lokal, ohne unbedeutende Dezimalstellen auszugeben. */
export function formatQuantityDisplay(value: number | string | null | undefined, locale: string, unit?: string | null): string {
  if (value === null || value === undefined || value === "") return "";
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
  const numberText = Number.isFinite(parsed)
    ? new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(parsed)
    : String(value);
  return `${numberText}${unit ? ` ${unit}` : ""}`;
}
