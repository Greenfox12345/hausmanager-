export type BalanceEffortDraftInput = {
  entryType: "payment" | "work";
  amount?: number;
  minutes?: number;
  memberId?: number;
  description: string;
};

/** Gibt nur vollständig ausgefüllte Aufwandszeilen an die Abschlussroutinen weiter. */
export function getValidBalanceEfforts(efforts: BalanceEffortDraftInput[]): BalanceEffortDraftInput[] {
  return efforts.filter((effort) => {
    if (!effort.memberId || !effort.description.trim()) return false;
    return effort.entryType === "payment"
      ? Number.isFinite(effort.amount) && (effort.amount ?? 0) > 0
      : Number.isInteger(effort.minutes) && (effort.minutes ?? 0) > 0;
  });
}
