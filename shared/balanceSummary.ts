export type BalanceSummaryEntry = {
  memberId: number;
  memberName: string;
  entryType: "payment" | "work";
  amount?: unknown;
  minutes?: unknown;
};

export type BalanceSummaryMember = { id: number; memberName: string; isActive?: boolean };

export function summarizeBalanceEntries(entries: BalanceSummaryEntry[], members: BalanceSummaryMember[]) {
  const totals = new Map<number, { memberId: number; memberName: string; payments: number; workMinutes: number }>();
  members.filter((member) => member.isActive !== false).forEach((member) => {
    totals.set(member.id, { memberId: member.id, memberName: member.memberName, payments: 0, workMinutes: 0 });
  });
  entries.forEach((entry) => {
    const total = totals.get(entry.memberId) ?? { memberId: entry.memberId, memberName: entry.memberName, payments: 0, workMinutes: 0 };
    if (entry.entryType === "payment") total.payments += Number(entry.amount ?? 0);
    if (entry.entryType === "work") total.workMinutes += Number(entry.minutes ?? 0);
    totals.set(entry.memberId, total);
  });
  return Array.from(totals.values()).sort((left, right) => right.payments - left.payments || right.workMinutes - left.workMinutes || left.memberName.localeCompare(right.memberName));
}
