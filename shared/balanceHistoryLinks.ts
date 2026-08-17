export type BalanceLinkableEntry = { id: number };
export type BalanceLinkableActivity = { id: number; relatedItemId: number | null };

/** Verknüpft einen Bilanzposten mit dem neuesten zugehörigen Verlaufseintrag. */
export function attachBalanceHistoryLinks<T extends BalanceLinkableEntry>(entries: T[], activities: BalanceLinkableActivity[]) {
  const latestActivityByEntry = new Map<number, number>();
  for (const activity of activities) {
    if (activity.relatedItemId !== null && !latestActivityByEntry.has(activity.relatedItemId)) {
      latestActivityByEntry.set(activity.relatedItemId, activity.id);
    }
  }
  return entries.map((entry) => ({ ...entry, historyActivityId: latestActivityByEntry.get(entry.id) ?? null }));
}
