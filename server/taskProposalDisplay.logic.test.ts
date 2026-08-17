import { describe, expect, it } from "vitest";
import { buildProposalDisplayEntries } from "../shared/taskProposalDisplay";

describe("Anzeige von Aufgabenänderungsvorschlägen", () => {
  it("fasst technische Wiederholungsfelder zusammen und stellt den Namen zuerst dar", () => {
    const entries = buildProposalDisplayEntries({
      customFrequencyDays: null,
      frequency: "weekly",
      irregularRecurrence: false,
      dueDate: "2026-04-25",
      name: "Neue Aufgabe",
      assignedTo: [4],
    });
    expect(entries.map(([field]) => field)).toEqual(["name", "assignedTo", "__recurrence", "__dueDate"]);
  });
});
