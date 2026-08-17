import { describe, expect, it } from "vitest";
import {
  formatActivityAction,
  formatTaskHistoryValue,
  getHistoryChangeValue,
} from "../client/src/lib/activityHistoryDisplay";

const translations: Record<string, string> = {
  "history:actions.change_proposal_withdrawn": "Änderungsvorschlag zurückgezogen",
  "tasks:frequency.monthly": "Monatlich",
  "tasks:repeat.months": "Monate",
  "tasks:repeat.sameWeekday": "Am gleichen Wochentag",
  "tasks:weekdays.thursday": "Donnerstag",
  "tasks:repeat.first": "1.",
};

const t = ((key: string, fallback?: string) => translations[key] ?? fallback ?? key) as any;

describe("Formatierung von Aufgaben-Verlaufseinträgen", () => {
  it("löst Vorschlagsaktionen und technische Wiederholungswerte lesbar auf", () => {
    expect(formatActivityAction(t, "change_proposal_withdrawn")).toBe("Änderungsvorschlag zurückgezogen");
    expect(formatTaskHistoryValue(t, "frequency", "monthly")).toBe("Monatlich");
    expect(formatTaskHistoryValue(t, "repeatUnit", "months")).toBe("Monate");
    expect(formatTaskHistoryValue(t, "monthlyRecurrenceMode", "same_weekday")).toBe("Am gleichen Wochentag");
    expect(formatTaskHistoryValue(t, "monthlyWeekday", 4)).toBe("Donnerstag");
    expect(formatTaskHistoryValue(t, "monthlyOccurrence", 1)).toBe("1.");
  });

  it("bevorzugt gespeicherte Namensauflösungen gegenüber technischen IDs", () => {
    expect(getHistoryChangeValue({ old: [7], oldNames: ["Basti"] }, "old")).toEqual(["Basti"]);
    expect(getHistoryChangeValue({ new: [8], newNames: ["Alex"] }, "new")).toEqual(["Alex"]);
  });
});
