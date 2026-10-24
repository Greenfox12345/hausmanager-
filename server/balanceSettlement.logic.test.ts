import { describe, expect, it } from "vitest";
import { calculateBalanceSettlementSuggestions } from "../shared/balanceSettlement";

describe("Ausgleichsvorschläge der Bilanz", () => {
  it("teilt Zahlungen gleichmäßig auf und schlägt nur die notwendigen Zahlungen vor", () => {
    const result = calculateBalanceSettlementSuggestions([
      { memberId: 1, entryType: "payment", amount: "60.00" },
      { memberId: 1, entryType: "work", minutes: 90 },
    ], [
      { id: 1, memberName: "Alex", isActive: true },
      { id: 2, memberName: "Bea", isActive: true },
      { id: 3, memberName: "Chris", isActive: true },
    ]);

    expect(result).toEqual({
      totalPaymentCents: 6000,
      participantCount: 3,
      suggestions: [
        { payerMemberId: 2, payerMemberName: "Bea", recipientMemberId: 1, recipientMemberName: "Alex", amountCents: 2000 },
        { payerMemberId: 3, payerMemberName: "Chris", recipientMemberId: 1, recipientMemberName: "Alex", amountCents: 2000 },
      ],
    });
  });

  it("verteilt Restcent nachvollziehbar und centgenau", () => {
    const result = calculateBalanceSettlementSuggestions([
      { memberId: 1, entryType: "payment", amount: 10 },
    ], [
      { id: 1, memberName: "Alex", isActive: true },
      { id: 2, memberName: "Bea", isActive: true },
      { id: 3, memberName: "Chris", isActive: true },
    ]);

    expect(result.suggestions).toEqual([
      { payerMemberId: 2, payerMemberName: "Bea", recipientMemberId: 1, recipientMemberName: "Alex", amountCents: 333 },
      { payerMemberId: 3, payerMemberName: "Chris", recipientMemberId: 1, recipientMemberName: "Alex", amountCents: 333 },
    ]);
    expect(result.suggestions.reduce((sum, suggestion) => sum + suggestion.amountCents, 0)).toBe(666);
  });

  it("rechnet Arbeitszeit nicht stillschweigend in Geld um", () => {
    const result = calculateBalanceSettlementSuggestions([
      { memberId: 1, entryType: "work", minutes: 180 },
      { memberId: 2, entryType: "work", minutes: 30 },
    ], [
      { id: 1, memberName: "Alex", isActive: true },
      { id: 2, memberName: "Bea", isActive: true },
    ]);

    expect(result).toEqual({ totalPaymentCents: 0, participantCount: 2, suggestions: [] });
  });

  it("berücksichtigt nur aktive Haushaltsmitglieder", () => {
    const result = calculateBalanceSettlementSuggestions([
      { memberId: 1, entryType: "payment", amount: 12.5 },
      { memberId: 3, entryType: "payment", amount: 99.99 },
    ], [
      { id: 1, memberName: "Alex", isActive: true },
      { id: 2, memberName: "Bea", isActive: true },
      { id: 3, memberName: "Chris", isActive: false },
    ]);

    expect(result).toEqual({
      totalPaymentCents: 1250,
      participantCount: 2,
      suggestions: [
        { payerMemberId: 2, payerMemberName: "Bea", recipientMemberId: 1, recipientMemberName: "Alex", amountCents: 625 },
      ],
    });
  });
});
