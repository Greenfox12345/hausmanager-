import { describe, expect, it } from "vitest";
import { getChangedProposalValues } from "../shared/taskProposalFields";

describe("Aufgabenänderungsvorschläge", () => {
  it("enthält nur tatsächlich veränderte Felder", () => {
    expect(getChangedProposalValues(
      { name: "Neue Aufgabe", assignedTo: [2, 3], dueDate: "2026-08-17" },
      { name: "Alte Aufgabe", assignedTo: [2], dueDate: "2026-08-17" },
    )).toEqual({ name: "Neue Aufgabe", assignedTo: [2, 3] });
  });

  it("erkennt gleiche Array- und Nullwerte als unverändert", () => {
    expect(getChangedProposalValues(
      { categoryIds: [4, 7], description: null },
      { categoryIds: [4, 7], description: null },
    )).toEqual({});
  });

  it("erkennt Änderungen innerhalb eines Rotationsplans", () => {
    expect(getChangedProposalValues(
      { rotationSchedule: [{ occurrenceNumber: 1, members: [{ position: 1, memberId: 4 }], isSkipped: false }] },
      { rotationSchedule: [{ occurrenceNumber: 1, members: [{ position: 1, memberId: 2 }], isSkipped: false }] },
    )).toEqual({ rotationSchedule: [{ occurrenceNumber: 1, members: [{ position: 1, memberId: 4 }], isSkipped: false }] });
  });
});
