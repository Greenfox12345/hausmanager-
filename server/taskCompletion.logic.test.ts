import { describe, expect, it } from "vitest";
import { isTaskRecurring, type TaskForCompletion } from "./routers/taskCompletion";

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
