export interface OccurrenceNavigationState {
  dueDate?: Date | string | null;
  isFutureOccurrence?: boolean;
  isCompleted?: boolean;
  isCompletedOccurrence?: boolean;
  isSkippedOccurrence?: boolean;
}

/**
 * Der Sprung zum aktuellen Termin ist nötig, wenn gerade ein Folgetermin
 * betrachtet wird oder wenn ein noch offener Termin in der Vergangenheit
 * liegt. Bereits erledigte bzw. ausgelassene Termine benötigen keinen Sprung.
 */
export function shouldShowJumpToCurrent(
  occurrence: OccurrenceNavigationState,
  now: Date = new Date(),
): boolean {
  if (occurrence.isFutureOccurrence) return true;
  if (occurrence.isCompleted || occurrence.isCompletedOccurrence || occurrence.isSkippedOccurrence || !occurrence.dueDate) {
    return false;
  }

  const dueDate = new Date(occurrence.dueDate);
  return Number.isFinite(dueDate.getTime()) && dueDate.getTime() < now.getTime();
}
