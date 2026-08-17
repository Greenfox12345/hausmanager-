/** Ein Bilanzaufwand bleibt fünf volle Tage ab seiner Erfassung korrigierbar. */
export function canModifyBalanceEntry(createdAt: Date | string, now: Date = new Date()): boolean {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return now.getTime() - created.getTime() <= 5 * 24 * 60 * 60 * 1000;
}

export function toBalanceAmountCents(amount: number): number {
  return Math.round(amount * 100);
}
