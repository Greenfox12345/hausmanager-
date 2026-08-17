import { describe, expect, it } from "vitest";
import { summarizeBalanceEntries } from "../shared/balanceSummary";

describe("Bilanzsummen", () => {
  it("hält Zahlungen und Arbeitszeit getrennt und führt auch Mitglieder ohne Eintrag", () => {
    expect(summarizeBalanceEntries([
      { memberId: 2, memberName: "Basti", entryType: "payment", amount: "12.50" },
      { memberId: 2, memberName: "Basti", entryType: "work", minutes: 90 },
      { memberId: 3, memberName: "Alex", entryType: "payment", amount: "5.00" },
    ], [
      { id: 2, memberName: "Basti", isActive: true },
      { id: 3, memberName: "Alex", isActive: true },
      { id: 4, memberName: "Kim", isActive: true },
    ])).toEqual([
      { memberId: 2, memberName: "Basti", payments: 12.5, workMinutes: 90 },
      { memberId: 3, memberName: "Alex", payments: 5, workMinutes: 0 },
      { memberId: 4, memberName: "Kim", payments: 0, workMinutes: 0 },
    ]);
  });
});
