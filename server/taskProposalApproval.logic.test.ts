import { describe, expect, it } from "vitest";
import { getTaskDueDateParts } from "../shared/taskProposalApproval";

describe("Terminwerte bei der Annahme von Änderungsvorschlägen", () => {
  it("liest einen aus der Datenbank kommenden DATETIME-Text ohne getFullYear-Fehler", () => {
    expect(getTaskDueDateParts("2026-12-24 14:30:00")).toEqual({ date: "2026-12-24", time: "14:30" });
  });

  it("akzeptiert auch Date-Objekte und lehnt ungültige Werte ab", () => {
    expect(getTaskDueDateParts(new Date("2026-12-24T14:30:00"))).toEqual({ date: "2026-12-24", time: "14:30" });
    expect(getTaskDueDateParts("kein Datum")).toBeNull();
  });
});
