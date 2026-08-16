import { describe, expect, it } from "vitest";
import { canDirectlyManageTask, canReviewTaskProposal } from "../shared/taskPermissions";

describe("Aufgabenberechtigungen", () => {
  it("erlaubt allen Mitgliedern direkte Änderungen bei nicht zugewiesenen Aufgaben", () => {
    expect(canDirectlyManageTask([], 12)).toBe(true);
    expect(canDirectlyManageTask(null, 12)).toBe(true);
  });

  it("erlaubt allen verantwortlichen Mitgliedern direkte Änderungen", () => {
    expect(canDirectlyManageTask([4, 9], 4)).toBe(true);
    expect(canDirectlyManageTask([4, 9], 9)).toBe(true);
    expect(canDirectlyManageTask([4, 9], 7)).toBe(false);
  });

  it("lässt Vorschläge nur von verantwortlichen Mitgliedern entscheiden", () => {
    expect(canReviewTaskProposal([4, 9], 9)).toBe(true);
    expect(canReviewTaskProposal([4, 9], 7)).toBe(false);
    expect(canReviewTaskProposal([], 7)).toBe(false);
  });
});
