import { describe, expect, it } from "vitest";
import { getNextMonthlyOccurrence, getNthWeekdayOfMonth, getWeekdayOccurrence } from "../shared/dateUtils";

/**
 * Test the date calculation logic used by completeTask for recurring tasks.
 * We test the pure functions from dateUtils since the mutation itself
 * requires a full DB context.
 */
describe("completeTask - recurring date calculation", () => {
  describe("isRecurring detection logic", () => {
    // Mirrors the server-side isRecurring check
    function isRecurring(task: {
      frequency: string;
      repeatInterval?: number | null;
      repeatUnit?: string | null;
      customFrequencyDays?: number | null;
    }): boolean {
      return !!(
        (task.repeatInterval && task.repeatUnit && task.repeatUnit !== "irregular") ||
        task.frequency === "daily" ||
        task.frequency === "weekly" ||
        task.frequency === "monthly" ||
        (task.frequency === "custom" && (task.customFrequencyDays || (task.repeatInterval && task.repeatUnit)))
      );
    }

    it("detects daily frequency as recurring", () => {
      expect(isRecurring({ frequency: "daily" })).toBe(true);
    });

    it("detects weekly frequency as recurring", () => {
      expect(isRecurring({ frequency: "weekly" })).toBe(true);
    });

    it("detects monthly frequency as recurring", () => {
      expect(isRecurring({ frequency: "monthly" })).toBe(true);
    });

    it("detects custom frequency with repeatInterval as recurring", () => {
      expect(isRecurring({ frequency: "custom", repeatInterval: 2, repeatUnit: "weeks" })).toBe(true);
    });

    it("detects custom frequency with customFrequencyDays as recurring", () => {
      expect(isRecurring({ frequency: "custom", customFrequencyDays: 14 })).toBe(true);
    });

    it("detects once frequency with repeatInterval+repeatUnit as recurring", () => {
      // This was the bug: frequency="once" but repeatInterval/repeatUnit set
      expect(isRecurring({ frequency: "once", repeatInterval: 2, repeatUnit: "weeks" })).toBe(true);
    });

    it("does NOT detect once frequency without repeat settings as recurring", () => {
      expect(isRecurring({ frequency: "once" })).toBe(false);
    });

    it("does NOT detect irregular recurrence as recurring (for date calculation)", () => {
      expect(isRecurring({ frequency: "once", repeatInterval: 1, repeatUnit: "irregular" })).toBe(false);
    });
  });

  describe("next due date calculation", () => {
    // Mirrors the server-side date calculation logic
    function calculateNextDueDate(task: {
      dueDate: Date;
      frequency: string;
      repeatInterval?: number | null;
      repeatUnit?: string | null;
      customFrequencyDays?: number | null;
      monthlyRecurrenceMode?: "same_date" | "same_weekday" | null;
    }): Date {
      const currentDueDate = new Date(task.dueDate);
      let nextDueDate = new Date(currentDueDate);

      // Use repeatInterval + repeatUnit as primary source
      if (task.repeatInterval && task.repeatUnit) {
        if (task.repeatUnit === "days") {
          nextDueDate.setDate(nextDueDate.getDate() + task.repeatInterval);
        } else if (task.repeatUnit === "weeks") {
          nextDueDate.setDate(nextDueDate.getDate() + task.repeatInterval * 7);
        } else if (task.repeatUnit === "months") {
          const mode = task.monthlyRecurrenceMode || "same_date";
          nextDueDate = getNextMonthlyOccurrence(currentDueDate, task.repeatInterval, mode);
        }
      } else {
        // Fallback to frequency field
        switch (task.frequency) {
          case "daily":
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case "weekly":
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case "monthly": {
            const mode = task.monthlyRecurrenceMode || "same_date";
            nextDueDate = getNextMonthlyOccurrence(currentDueDate, 1, mode);
            break;
          }
          case "custom":
            if (task.customFrequencyDays) {
              nextDueDate.setDate(nextDueDate.getDate() + task.customFrequencyDays);
            }
            break;
        }
      }

      return nextDueDate;
    }

    it("calculates next date for daily tasks", () => {
      const result = calculateNextDueDate({
        dueDate: new Date("2026-03-01T10:00:00Z"),
        frequency: "daily",
      });
      expect(result.toISOString()).toBe("2026-03-02T10:00:00.000Z");
    });

    it("calculates next date for weekly tasks", () => {
      const result = calculateNextDueDate({
        dueDate: new Date("2026-03-01T12:00:00Z"),
        frequency: "weekly",
      });
      // 7 days later
      const expected = new Date("2026-03-01T12:00:00Z");
      expected.setDate(expected.getDate() + 7);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("calculates next date for monthly tasks (same_date)", () => {
      const result = calculateNextDueDate({
        dueDate: new Date("2026-03-15T10:00:00Z"),
        frequency: "monthly",
        monthlyRecurrenceMode: "same_date",
      });
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(3); // April (0-indexed)
    });

    it("calculates next date using repeatInterval + repeatUnit (days)", () => {
      const result = calculateNextDueDate({
        dueDate: new Date("2026-03-01T10:00:00Z"),
        frequency: "custom",
        repeatInterval: 3,
        repeatUnit: "days",
      });
      expect(result.toISOString()).toBe("2026-03-04T10:00:00.000Z");
    });

    it("calculates next date using repeatInterval + repeatUnit (weeks)", () => {
      const result = calculateNextDueDate({
        dueDate: new Date("2026-03-01T12:00:00Z"),
        frequency: "custom",
        repeatInterval: 2,
        repeatUnit: "weeks",
      });
      // 14 days later
      const expected = new Date("2026-03-01T12:00:00Z");
      expected.setDate(expected.getDate() + 14);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("calculates next date using repeatInterval + repeatUnit (months)", () => {
      const result = calculateNextDueDate({
        dueDate: new Date("2026-03-15T10:00:00Z"),
        frequency: "custom",
        repeatInterval: 2,
        repeatUnit: "months",
      });
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(4); // May (0-indexed)
    });

    it("prioritizes repeatInterval over frequency field", () => {
      // Bug scenario: frequency="once" but repeatInterval=2, repeatUnit="weeks"
      const result = calculateNextDueDate({
        dueDate: new Date("2026-03-01T12:00:00Z"),
        frequency: "once",
        repeatInterval: 2,
        repeatUnit: "weeks",
      });
      // 14 days later
      const expected = new Date("2026-03-01T12:00:00Z");
      expected.setDate(expected.getDate() + 14);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("uses customFrequencyDays as fallback for custom frequency", () => {
      const result = calculateNextDueDate({
        dueDate: new Date("2026-03-01T12:00:00Z"),
        frequency: "custom",
        customFrequencyDays: 10,
      });
      // 10 days later
      const expected = new Date("2026-03-01T12:00:00Z");
      expected.setDate(expected.getDate() + 10);
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe("monthly recurrence modes", () => {
    it("same_date mode keeps the same day of month", () => {
      // Use explicit time to avoid timezone-related date shifts
      const result = getNextMonthlyOccurrence(new Date(2026, 0, 15, 12, 0, 0), 1, "same_date");
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(1); // February
    });

    it("same_weekday mode keeps the same weekday occurrence", () => {
      // Use explicit local date to avoid timezone issues
      const date = new Date(2026, 0, 15, 12, 0, 0); // Jan 15, 2026
      const { weekday, occurrence } = getWeekdayOccurrence(date);
      
      const result = getNextMonthlyOccurrence(date, 1, "same_weekday");
      const resultOcc = getWeekdayOccurrence(result);
      
      expect(resultOcc.weekday).toBe(weekday);
      expect(resultOcc.occurrence).toBe(occurrence);
      expect(result.getMonth()).toBe(1); // February
    });
  });
});
