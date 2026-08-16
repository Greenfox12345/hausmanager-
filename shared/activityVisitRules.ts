/** Erster Besuch beginnt mit dem Beitritt des Mitglieds, spätere mit der letzten Anzeige. */
export function getActivityBaseline(lastActivityViewedAt: Date | null, memberCreatedAt: Date): Date {
  return lastActivityViewedAt ?? memberCreatedAt;
}

/** Ein Client darf den Lesestand nicht versehentlich in die Zukunft verschieben. */
export function normalizeReadThrough(readThrough: Date, serverNow = new Date()): Date {
  return readThrough > serverNow ? serverNow : readThrough;
}
