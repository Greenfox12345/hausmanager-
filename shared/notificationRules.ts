/** Prüft eine Ruhezeit im Format HH:MM, einschließlich Zeitfenstern über Mitternacht. */
export function isWithinDndWindow(start: string | null, end: string | null, now = new Date()): boolean {
  if (!start || !end || start === end) return false;
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

/** Liefert die Anzahl voller Kalendertage bis zum Termin, ohne Uhrzeitdrift. */
export function getDaysUntilDue(dueDate: Date, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}
