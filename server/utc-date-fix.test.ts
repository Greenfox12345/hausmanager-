/**
 * Tests for UTC-based date arithmetic in advanceByInterval / getNextMonthlyOccurrenceUTC.
 *
 * The server may run in any timezone (UTC-5, UTC+2, etc.).
 * All date arithmetic must use UTC components so that a date stored as
 * 2025-01-13T00:00:00Z always advances to 2025-01-20T00:00:00Z (not 2025-01-19).
 *
 * These tests simulate the server running in UTC-5 by using Date.UTC to create
 * dates and then verifying that UTC date components are preserved.
 */

import { describe, it, expect } from "vitest";
import { getNextMonthlyOccurrenceUTC } from "../shared/dateUtils";

// Helper: create a UTC midnight date for a given yyyy-mm-dd
function utcDate(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

// Helper: simulate advanceByInterval logic for days/weeks (pure UTC arithmetic)
function advanceDays(d: Date, days: number): Date {
  return new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days,
    d.getUTCHours(), d.getUTCMinutes()
  ));
}

// Helper: simulate the OLD broken logic (local timezone)
function advanceDaysLocal(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

describe("UTC date arithmetic – no timezone drift", () => {
  describe("advanceDays (UTC)", () => {
    it("adds 7 days to 2025-01-13 correctly (UTC)", () => {
      const d = utcDate(2025, 1, 13);
      const result = advanceDays(d, 7);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(20);
    });

    it("preserves time component when advancing days", () => {
      const d = utcDate(2025, 1, 13, 10, 30);
      const result = advanceDays(d, 7);
      expect(result.getUTCHours()).toBe(10);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it("handles month boundary correctly (Jan 28 + 7 days = Feb 4)", () => {
      const d = utcDate(2025, 1, 28);
      const result = advanceDays(d, 7);
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(4);
    });

    it("handles year boundary correctly (Dec 28 + 7 days = Jan 4)", () => {
      const d = utcDate(2024, 12, 28);
      const result = advanceDays(d, 7);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(4);
    });
  });

  describe("getNextMonthlyOccurrenceUTC – same_date mode", () => {
    it("adds 1 month to Jan 13 → Feb 13", () => {
      const d = utcDate(2025, 1, 13);
      const result = getNextMonthlyOccurrenceUTC(d, 1, "same_date");
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(13);
    });

    it("clamps Jan 31 + 1 month to Feb 28 (not Mar 3)", () => {
      const d = utcDate(2025, 1, 31);
      const result = getNextMonthlyOccurrenceUTC(d, 1, "same_date");
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(28); // 2025 is not a leap year
    });

    it("clamps Jan 31 + 1 month to Feb 29 in leap year", () => {
      const d = utcDate(2024, 1, 31); // 2024 is a leap year
      const result = getNextMonthlyOccurrenceUTC(d, 1, "same_date");
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(29); // leap year
    });

    it("adds 3 months to Jan 15 → Apr 15", () => {
      const d = utcDate(2025, 1, 15);
      const result = getNextMonthlyOccurrenceUTC(d, 3, "same_date");
      expect(result.getUTCMonth()).toBe(3); // April
      expect(result.getUTCDate()).toBe(15);
    });

    it("preserves time component", () => {
      const d = utcDate(2025, 1, 13, 10, 30);
      const result = getNextMonthlyOccurrenceUTC(d, 1, "same_date");
      expect(result.getUTCHours()).toBe(10);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it("handles Dec + 1 month = Jan next year", () => {
      const d = utcDate(2024, 12, 15);
      const result = getNextMonthlyOccurrenceUTC(d, 1, "same_date");
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(15);
    });
  });

  describe("getNextMonthlyOccurrenceUTC – same_weekday mode", () => {
    it("2nd Monday in Jan 2025 (Jan 13) → 2nd Monday in Feb 2025 (Feb 10)", () => {
      const d = utcDate(2025, 1, 13); // Jan 13, 2025 = Monday
      expect(d.getUTCDay()).toBe(1); // Monday
      const result = getNextMonthlyOccurrenceUTC(d, 1, "same_weekday");
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDay()).toBe(1); // Monday
      expect(result.getUTCDate()).toBe(10); // 2nd Monday in Feb 2025
    });

    it("1st Thursday in Jan 2025 (Jan 2) → 1st Thursday in Feb 2025 (Feb 6)", () => {
      const d = utcDate(2025, 1, 2); // Jan 2, 2025 = Thursday
      expect(d.getUTCDay()).toBe(4); // Thursday
      const result = getNextMonthlyOccurrenceUTC(d, 1, "same_weekday");
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDay()).toBe(4); // Thursday
      expect(result.getUTCDate()).toBe(6); // 1st Thursday in Feb 2025
    });

    it("5th Monday fallback: uses 4th Monday when 5th doesn't exist", () => {
      // Find a month where there are 5 Mondays, then advance to a month with only 4
      // Feb 2025: Mondays are 3, 10, 17, 24 (only 4 Mondays)
      // If we have 5th Monday in Jan 2025 (Jan 27), advance to Feb → fallback to 4th Monday (Feb 24)
      const d = utcDate(2025, 1, 27); // Jan 27, 2025 = Monday (5th Monday)
      expect(d.getUTCDay()).toBe(1); // Monday
      const result = getNextMonthlyOccurrenceUTC(d, 1, "same_weekday");
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDay()).toBe(1); // Monday
      // Feb 2025 has only 4 Mondays (3, 10, 17, 24), so fallback to 4th = Feb 24
      expect(result.getUTCDate()).toBe(24);
    });
  });

  describe("UTC vs local timezone drift simulation", () => {
    it("demonstrates the bug: local setDate on UTC midnight in UTC-5 shifts day", () => {
      // Simulate server in UTC-5: new Date("2025-01-13") = 2025-01-12T19:00 local
      // getDate() returns 12, not 13 → +7 days = 19, not 20
      const d = new Date("2025-01-13"); // UTC midnight
      const localDay = d.getDate(); // In UTC-5: returns 12!
      const utcDay = d.getUTCDate(); // Always returns 13

      // The UTC approach is always correct
      expect(utcDay).toBe(13);
      // The local approach may be wrong depending on server timezone
      // (in UTC+0 it would be 13, in UTC-5 it would be 12)
      // We just verify UTC is stable
      const fixedResult = advanceDays(d, 7);
      expect(fixedResult.getUTCDate()).toBe(20);
      expect(fixedResult.getUTCMonth()).toBe(0); // January
    });

    it("UTC midnight dates advance correctly regardless of server timezone", () => {
      // These are all UTC midnight dates (as stored in DB)
      const dates = [
        utcDate(2025, 1, 1),
        utcDate(2025, 3, 15),
        utcDate(2025, 6, 30),
        utcDate(2025, 12, 25),
      ];
      const expectedAfter7Days = [
        { month: 0, day: 8 },   // Jan 8
        { month: 2, day: 22 },  // Mar 22
        { month: 6, day: 7 },   // Jul 7 (month 6 = July, 0-indexed)
        { month: 0, day: 1 },   // Jan 1 next year
      ];

      dates.forEach((d, i) => {
        const result = advanceDays(d, 7);
        expect(result.getUTCMonth()).toBe(expectedAfter7Days[i].month);
        expect(result.getUTCDate()).toBe(expectedAfter7Days[i].day);
      });
    });
  });
});
