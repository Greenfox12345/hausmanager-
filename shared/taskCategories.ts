/**
 * Bereinigt Kategorie-IDs aus Auswahlfeldern und verhindert doppelte
 * Zuordnungen beim Speichern einer Aufgabe.
 */
export function normalizeTaskCategoryIds(categoryIds: readonly number[]): number[] {
  return Array.from(new Set(categoryIds.filter((id) => Number.isInteger(id) && id > 0)));
}

/** Liest die IDs aus dem Ergebnis der Kategorien-Abfrage einer Aufgabe. */
export function getTaskCategoryIds(categories: readonly { id: number }[]): number[] {
  return normalizeTaskCategoryIds(categories.map((category) => category.id));
}

/** Vermeidet unnötige State-Updates bei erneut eintreffenden Kategorien-Abfragen. */
export function haveSameTaskCategoryIds(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
