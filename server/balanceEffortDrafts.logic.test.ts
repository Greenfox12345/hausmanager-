import { describe, expect, it } from "vitest";
import { getValidBalanceEfforts } from "../shared/balanceEffortDrafts";

describe("Mehrfacherfassung von Bilanzaufwänden", () => {
  it("behält mehrere vollständige Aufwandszeilen für unterschiedliche Mitglieder", () => {
    expect(getValidBalanceEfforts([
      { entryType: "payment", amount: 18.5, memberId: 4, description: "Holz" },
      { entryType: "work", minutes: 90, memberId: 7, description: "Aufbau" },
    ])).toHaveLength(2);
  });

  it("ignoriert nur unvollständige Zeilen und nicht die übrigen Aufwände", () => {
    const efforts = getValidBalanceEfforts([
      { entryType: "payment", amount: 0, memberId: 4, description: "" },
      { entryType: "work", minutes: 45, memberId: 7, description: "Transport" },
    ]);
    expect(efforts).toEqual([{ entryType: "work", minutes: 45, memberId: 7, description: "Transport" }]);
  });
});
