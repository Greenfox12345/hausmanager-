/**
 * Berechnet unverbindliche Ausgleichszahlungen ausschließlich aus Geldzahlungen.
 * Arbeitszeiten werden bewusst nicht in Euro umgerechnet. Damit werden keine
 * stillen Annahmen über einen Stundenlohn getroffen.
 */
export type BalanceSettlementEntry = {
  memberId: number;
  entryType: "payment" | "work";
  amount?: unknown;
};

export type BalanceSettlementMember = {
  id: number;
  memberName: string;
  isActive?: boolean;
};

export type BalanceSettlementSuggestion = {
  payerMemberId: number;
  payerMemberName: string;
  recipientMemberId: number;
  recipientMemberName: string;
  amountCents: number;
};

export type BalanceSettlementResult = {
  /** Gesamte erfasste Geldzahlungen, centgenau. */
  totalPaymentCents: number;
  /** Aktive Mitglieder, auf die die Zahlungen gleichmäßig verteilt werden. */
  participantCount: number;
  suggestions: BalanceSettlementSuggestion[];
};

function toPositiveCents(amount: unknown): number {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
  return Math.round(numericAmount * 100);
}

/**
 * Verteilt den Gesamtbetrag centgenau auf aktive Mitglieder und führt dann die
 * offenen Soll- und Habenbeträge mit möglichst wenigen Zahlungen zusammen.
 * Verbleibende einzelne Cent werden nachvollziehbar nach Mitglieds-ID verteilt.
 */
export function calculateBalanceSettlementSuggestions(
  entries: BalanceSettlementEntry[],
  members: BalanceSettlementMember[],
): BalanceSettlementResult {
  const participants = members
    .filter((member) => member.isActive !== false)
    .sort((left, right) => left.id - right.id);

  const paymentsByMember = participants.map((member) => ({
    member,
    paymentCents: entries.reduce((sum, entry) => {
      if (entry.memberId !== member.id || entry.entryType !== "payment") return sum;
      return sum + toPositiveCents(entry.amount);
    }, 0),
  }));
  const totalPaymentCents = paymentsByMember.reduce((sum, item) => sum + item.paymentCents, 0);

  if (participants.length < 2 || totalPaymentCents === 0) {
    return { totalPaymentCents, participantCount: participants.length, suggestions: [] };
  }

  const baseShareCents = Math.floor(totalPaymentCents / participants.length);
  const remainingCents = totalPaymentCents % participants.length;
  const balances = paymentsByMember.map((item, index) => ({
    ...item,
    // Die ersten Mitglieder nach ID tragen bei nicht exakt teilbaren Centbeträgen
    // jeweils einen Cent mehr. So stimmt die Summe immer genau.
    netCents: item.paymentCents - baseShareCents - (index < remainingCents ? 1 : 0),
  }));
  const creditors = balances.filter((item) => item.netCents > 0).map((item) => ({ ...item }));
  const debtors = balances.filter((item) => item.netCents < 0).map((item) => ({ ...item, debtCents: -item.netCents }));
  const suggestions: BalanceSettlementSuggestion[] = [];

  let creditorIndex = 0;
  let debtorIndex = 0;
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountCents = Math.min(creditor.netCents, debtor.debtCents);
    if (amountCents > 0) {
      suggestions.push({
        payerMemberId: debtor.member.id,
        payerMemberName: debtor.member.memberName,
        recipientMemberId: creditor.member.id,
        recipientMemberName: creditor.member.memberName,
        amountCents,
      });
      creditor.netCents -= amountCents;
      debtor.debtCents -= amountCents;
    }
    if (creditor.netCents === 0) creditorIndex += 1;
    if (debtor.debtCents === 0) debtorIndex += 1;
  }

  return { totalPaymentCents, participantCount: participants.length, suggestions };
}
