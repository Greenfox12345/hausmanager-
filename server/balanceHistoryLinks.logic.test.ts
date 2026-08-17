import { describe, expect, it } from "vitest";
import { attachBalanceHistoryLinks } from "../shared/balanceHistoryLinks";

describe("Bilanz-Verlaufsverknüpfungen", () => {
  it("ordnet jedem Bilanzposten den neuesten zugehörigen Verlaufseintrag zu", () => {
    const entries = [{ id: 11 }, { id: 12 }];
    const activities = [
      { id: 99, relatedItemId: 11 },
      { id: 88, relatedItemId: 11 },
      { id: 77, relatedItemId: 12 },
    ];
    expect(attachBalanceHistoryLinks(entries, activities)).toEqual([
      { id: 11, historyActivityId: 99 },
      { id: 12, historyActivityId: 77 },
    ]);
  });
});
