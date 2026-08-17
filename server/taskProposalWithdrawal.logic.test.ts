import { describe, expect, it } from "vitest";
import { canWithdrawTaskProposal } from "../shared/taskProposalWithdrawal";

describe("Zurückziehen von Aufgabenänderungsvorschlägen", () => {
  it("erlaubt nur dem Antragsteller das Zurückziehen eines offenen Vorschlags", () => {
    expect(canWithdrawTaskProposal({ proposedByMemberId: 7, status: "pending" }, 7)).toBe(true);
    expect(canWithdrawTaskProposal({ proposedByMemberId: 7, status: "pending" }, 8)).toBe(false);
    expect(canWithdrawTaskProposal({ proposedByMemberId: 7, status: "approved" }, 7)).toBe(false);
  });
});
