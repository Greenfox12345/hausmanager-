import { describe, expect, it } from "vitest";
import { getChangedProposalValues, getStableProposalChanges } from "../shared/taskProposalFields";

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

  it("ignoriert unberührte asynchron geladene Kategorien und berechnete Rotationsdaten", () => {
    const changes = getStableProposalChanges(
      {
        name: "Unverändert",
        frequency: "once",
        monthlyRecurrenceMode: null,
        categoryIds: [33],
        rotationSchedule: [{ occurrenceNumber: 1, members: [], date: "2026-12-01", isSpecial: false }],
      },
      {
        name: "Unverändert",
        frequency: "once",
        monthlyRecurrenceMode: "same_date",
        categoryIds: [],
        rotationSchedule: [{ occurrenceNumber: 1, members: [], occurrenceDate: null, isSpecial: false }],
      },
      {},
    );

    expect(changes).toEqual({});
  });

  it("behält bewusst geänderte Kategorien und fachliche Rotationszuordnungen", () => {
    const changes = getStableProposalChanges(
      {
        categoryIds: [33],
        rotationSchedule: [{ occurrenceNumber: 1, members: [{ position: 1, memberId: 4 }], isSpecial: false }],
      },
      {
        categoryIds: [],
        rotationSchedule: [{ occurrenceNumber: 1, members: [{ position: 1, memberId: 2 }], isSpecial: false }],
      },
      { categoryIds: true, rotationSchedule: true },
    );

    expect(changes).toEqual({
      categoryIds: [33],
      rotationSchedule: [{ occurrenceNumber: 1, members: [{ position: 1, memberId: 4 }], notes: "", isSkipped: false, isSpecial: false, specialName: null, occurrenceDate: null, specialDate: null }],
    });
  });
});
