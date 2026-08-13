import { describe, expect, it } from "vitest";
import { calcOccurrenceNumber } from "./db";
import { advanceByInterval, isTaskRecurring, type TaskForCompletion } from "./routers/taskCompletion";

function makeTask(overrides: Partial<TaskForCompletion> = {}): TaskForCompletion {
  return {
    id: 1,
    dueDate: new Date(2026, 0, 1, 9, 0),
    repeatInterval: null,
    repeatUnit: null,
    monthlyRecurrenceMode: null,
    frequency: "once",
    customFrequencyDays: null,
    enableRotation: false,
    requiredPersons: null,
    assignedTo: [],
    ...overrides,
  };
}

describe("isTaskRecurring", () => {
  it("erkennt die klassischen frequency-Werte ohne Intervallfelder", () => {
    expect(isTaskRecurring(makeTask({ frequency: "daily" }))).toBe(true);
    expect(isTaskRecurring(makeTask({ frequency: "weekly" }))).toBe(true);
    expect(isTaskRecurring(makeTask({ frequency: "monthly" }))).toBe(true);
  });

  it("erkennt benutzerdefinierte Wiederholungen über days, weeks und months", () => {
    expect(isTaskRecurring(makeTask({ repeatInterval: 2, repeatUnit: "days" }))).toBe(true);
    expect(isTaskRecurring(makeTask({ repeatInterval: 3, repeatUnit: "weeks" }))).toBe(true);
    expect(isTaskRecurring(makeTask({ repeatInterval: 1, repeatUnit: "months" }))).toBe(true);
  });

  it("erkennt unregelmäßige und ältere custom-Wiederholungen", () => {
    expect(isTaskRecurring(makeTask({ frequency: "custom", customFrequencyDays: 5 }))).toBe(true);
    expect(isTaskRecurring(makeTask({ frequency: "custom", repeatUnit: "irregular" }))).toBe(true);
  });

  it("behandelt einmalige Aufgaben nicht als wiederkehrend", () => {
    expect(isTaskRecurring(makeTask())).toBe(false);
  });
});

describe("advanceByInterval", () => {
  it("erhält die Ortszeit bei täglichen und wöchentlichen Wiederholungen", async () => {
    const baseDate = new Date(2026, 0, 10, 14, 30);

    const inTwoDays = await advanceByInterval(baseDate, makeTask({ repeatInterval: 2, repeatUnit: "days" }));
    expect(inTwoDays.getFullYear()).toBe(2026);
    expect(inTwoDays.getMonth()).toBe(0);
    expect(inTwoDays.getDate()).toBe(12);
    expect(inTwoDays.getHours()).toBe(14);
    expect(inTwoDays.getMinutes()).toBe(30);

    const inThreeWeeks = await advanceByInterval(baseDate, makeTask({ repeatInterval: 3, repeatUnit: "weeks" }));
    expect(inThreeWeeks.getDate()).toBe(31);
    expect(inThreeWeeks.getHours()).toBe(14);
    expect(inThreeWeeks.getMinutes()).toBe(30);
  });

  it("verwendet den Monatsmodus und die frequency-Fallbacks konsistent", async () => {
    const baseDate = new Date(2026, 0, 15, 9, 45);

    const monthly = await advanceByInterval(baseDate, makeTask({ repeatInterval: 1, repeatUnit: "months", monthlyRecurrenceMode: "same_date" }));
    expect(monthly.getMonth()).toBe(1);
    expect(monthly.getDate()).toBe(15);
    expect(monthly.getHours()).toBe(9);
    expect(monthly.getMinutes()).toBe(45);

    const fallbackWeekly = await advanceByInterval(baseDate, makeTask({ frequency: "weekly" }));
    expect(fallbackWeekly.getDate()).toBe(22);
    expect(fallbackWeekly.getHours()).toBe(9);
    expect(fallbackWeekly.getMinutes()).toBe(45);
  });
});

describe("calcOccurrenceNumber", () => {
  it("berechnet tägliche und frequency-basierte wöchentliche Terminpositionen ohne Schleife", () => {
    expect(calcOccurrenceNumber(
      { dueDate: new Date(2026, 0, 10), repeatInterval: 5, repeatUnit: "days" },
      new Date(2026, 0, 20)
    )).toBe(3);
    expect(calcOccurrenceNumber(
      { dueDate: new Date(2026, 0, 10), repeatInterval: 5, repeatUnit: "days" },
      new Date(2026, 0, 19)
    )).toBeNull();
    expect(calcOccurrenceNumber(
      { dueDate: new Date(2026, 0, 5), frequency: "weekly" },
      new Date(2026, 0, 12)
    )).toBe(2);
  });

  it("behandelt Monatsenden und gleiche Wochentage wie die Terminfortschreibung", () => {
    const sameDate = { dueDate: new Date(2026, 0, 31), repeatInterval: 1, repeatUnit: "months", monthlyRecurrenceMode: "same_date" };
    expect(calcOccurrenceNumber(sameDate, new Date(2026, 1, 28))).toBe(2);
    expect(calcOccurrenceNumber(sameDate, new Date(2026, 2, 31))).toBe(3);

    const sameWeekday = { dueDate: new Date(2026, 0, 29), repeatInterval: 1, repeatUnit: "months", monthlyRecurrenceMode: "same_weekday" };
    expect(calcOccurrenceNumber(sameWeekday, new Date(2026, 1, 26))).toBe(2);
    expect(calcOccurrenceNumber(sameWeekday, new Date(2026, 2, 26))).toBe(3);
  });

  it("liefert für unregelmäßige oder vorgezogene Termine keine künstliche Terminposition", () => {
    expect(calcOccurrenceNumber(
      { dueDate: new Date(2026, 0, 10), repeatUnit: "irregular" },
      new Date(2026, 0, 10)
    )).toBeNull();
    expect(calcOccurrenceNumber(
      { dueDate: new Date(2026, 0, 10), repeatInterval: 1, repeatUnit: "weeks" },
      new Date(2026, 0, 3)
    )).toBeNull();
  });
});
