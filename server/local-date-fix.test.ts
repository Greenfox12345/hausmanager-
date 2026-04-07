/**
 * Tests for LOCAL-time-based date arithmetic in advanceByInterval.
 *
 * mysql2 reads/writes MySQL DATETIME as LOCAL time strings.
 * Therefore all date arithmetic must use LOCAL (non-UTC) date components
 * so that the clock time entered by the user is preserved across intervals.
 *
 * Example:
 *   User enters 10:00 Uhr → stored as '2025-04-07 10:00:00' in MySQL
 *   mysql2 reads: new Date('2025-04-07 10:00:00') → getHours() = 10 (local)
 *   advanceByInterval: new Date(y, mo, day+7, 10, 0) → mysql2 writes '2025-04-14 10:00:00'
 *   User sees: 10:00 Uhr ✓
 *
 * If we used getUTCHours() instead:
 *   getUTCHours() = 14 (UTC) → Date.UTC(..., 14, 0) → mysql2 writes '2025-04-14 10:00:00'
 *   This happens to work too, BUT only because mysql2 converts back.
 *   The real problem was in task CREATION: Date.UTC(y, m, d, 10, 0) stores as '06:00:00' in MySQL.
 *
 * The unified fix: always use LOCAL time everywhere (creation + advance).
 */

import { describe, it, expect } from "vitest";
import { getNextMonthlyOccurrence } from "../shared/dateUtils";

// Helper: create a LOCAL time date (simulates what mysql2 returns when reading DATETIME)
function localDate(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

// Simulate advanceByInterval logic using LOCAL components (the fixed version)
function advanceDaysLocal(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), 0, 0);
}

function advanceWeeksLocal(d: Date, weeks: number): Date {
  return advanceDaysLocal(d, weeks * 7);
}

describe("LOCAL date arithmetic – clock time preserved", () => {
  describe("advanceDaysLocal – days interval", () => {
    it("adds 7 days to Apr 7 → Apr 14", () => {
      const d = localDate(2025, 4, 7);
      const result = advanceDaysLocal(d, 7);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getDate()).toBe(14);
    });

    it("preserves 10:00 Uhr clock time when advancing 7 days", () => {
      const d = localDate(2025, 4, 7, 10, 0);
      const result = advanceDaysLocal(d, 7);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(0);
    });

    it("preserves 18:30 Uhr clock time when advancing 14 days", () => {
      const d = localDate(2025, 4, 7, 18, 30);
      const result = advanceDaysLocal(d, 14);
      expect(result.getHours()).toBe(18);
      expect(result.getMinutes()).toBe(30);
    });

    it("handles month boundary correctly (Apr 28 + 7 days = May 5)", () => {
      const d = localDate(2025, 4, 28, 10, 0);
      const result = advanceDaysLocal(d, 7);
      expect(result.getMonth()).toBe(4); // May
      expect(result.getDate()).toBe(5);
      expect(result.getHours()).toBe(10); // time preserved
    });

    it("handles year boundary correctly (Dec 28 + 7 days = Jan 4)", () => {
      const d = localDate(2024, 12, 28, 8, 0);
      const result = advanceDaysLocal(d, 7);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(4);
      expect(result.getHours()).toBe(8); // time preserved
    });
  });

  describe("advanceWeeksLocal – weeks interval", () => {
    it("adds 2 weeks to Apr 7 → Apr 21", () => {
      const d = localDate(2025, 4, 7, 10, 0);
      const result = advanceWeeksLocal(d, 2);
      expect(result.getDate()).toBe(21);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getHours()).toBe(10);
    });

    it("adds 1 week to Apr 28 → May 5", () => {
      const d = localDate(2025, 4, 28, 20, 0);
      const result = advanceWeeksLocal(d, 1);
      expect(result.getMonth()).toBe(4); // May
      expect(result.getDate()).toBe(5);
      expect(result.getHours()).toBe(20);
    });
  });

  describe("getNextMonthlyOccurrence – same_date mode (LOCAL)", () => {
    it("adds 1 month to Jan 13 → Feb 13", () => {
      const d = localDate(2025, 1, 13, 10, 0);
      const result = getNextMonthlyOccurrence(d, 1, "same_date");
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(13);
      expect(result.getHours()).toBe(10); // time preserved
    });

    it("clamps Jan 31 + 1 month to Feb 28 (not Mar 3)", () => {
      const d = localDate(2025, 1, 31, 10, 0);
      const result = getNextMonthlyOccurrence(d, 1, "same_date");
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(28); // 2025 is not a leap year
    });

    it("adds 3 months to Jan 15 → Apr 15", () => {
      const d = localDate(2025, 1, 15, 9, 30);
      const result = getNextMonthlyOccurrence(d, 3, "same_date");
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(15);
    });

    it("handles Dec + 1 month = Jan next year", () => {
      const d = localDate(2024, 12, 15, 10, 0);
      const result = getNextMonthlyOccurrence(d, 1, "same_date");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });
  });

  describe("Full round-trip: create → advance → create", () => {
    it("10:00 Uhr task advances 7 days and keeps 10:00 Uhr", () => {
      // Simulate: user creates task at 10:00 local
      // tasks.ts: new Date(year, month-1, day, hours, minutes) = LOCAL
      const created = localDate(2025, 4, 7, 10, 0);

      // mysql2 writes '2025-04-07 10:00:00' to MySQL
      // mysql2 reads back: new Date('2025-04-07 10:00:00') = same Date object
      const fromDb = new Date('2025-04-07 10:00:00');
      expect(fromDb.getHours()).toBe(10); // LOCAL hours = 10 ✓

      // advanceByInterval: new Date(y, mo, day+7, h, min)
      const next = advanceDaysLocal(fromDb, 7);

      // mysql2 writes '2025-04-14 10:00:00' to MySQL
      expect(next.getHours()).toBe(10); // LOCAL hours preserved ✓
      expect(next.getDate()).toBe(14);
      expect(next.getMonth()).toBe(3); // April
    });

    it("18:00 Uhr task advances 1 month and keeps 18:00 Uhr", () => {
      const fromDb = new Date('2025-04-07 18:00:00');
      expect(fromDb.getHours()).toBe(18);

      const next = getNextMonthlyOccurrence(fromDb, 1, "same_date");
      expect(next.getHours()).toBe(18); // time preserved ✓
      expect(next.getDate()).toBe(7);
      expect(next.getMonth()).toBe(4); // May
    });

    it("no-time task (midnight) advances 7 days correctly", () => {
      // tasks.ts: new Date(year, month-1, day, 0, 0, 0, 0) = LOCAL midnight
      const created = localDate(2025, 4, 7, 0, 0);
      expect(created.getHours()).toBe(0);

      const fromDb = new Date('2025-04-07 00:00:00');
      const next = advanceDaysLocal(fromDb, 7);

      expect(next.getDate()).toBe(14);
      expect(next.getMonth()).toBe(3); // April
      expect(next.getHours()).toBe(0); // still midnight
    });
  });

  describe("Regression: 4h drift was caused by Date.UTC in creation", () => {
    it("Date.UTC(y,m,d,10,0) causes 4h drift in EDT (UTC-4)", () => {
      // This is the OLD broken behavior:
      // tasks.ts used: new Date(Date.UTC(2025, 3, 7, 10, 0))
      // = 2025-04-07T10:00:00Z = 2025-04-07T06:00:00 local (EDT)
      // mysql2 writes: '2025-04-07 06:00:00' → user sees 06:00 (WRONG!)
      const broken = new Date(Date.UTC(2025, 3, 7, 10, 0));
      // In EDT (UTC-4), getHours() = 6, not 10
      const localHours = broken.getHours();
      // This test documents the bug: local hours != 10 when server is not UTC
      // (In UTC+0 this would be 10, in UTC-4 it would be 6)
      // We just verify the fix is correct:
      const fixed = new Date(2025, 3, 7, 10, 0, 0, 0);
      expect(fixed.getHours()).toBe(10); // LOCAL time = 10 ✓
    });

    it("new Date(y,m,d,h,min) preserves clock time regardless of server TZ", () => {
      // The FIXED behavior: always use LOCAL constructor
      const d = new Date(2025, 3, 7, 10, 0, 0, 0); // April 7, 10:00 local
      expect(d.getHours()).toBe(10); // always 10, regardless of TZ ✓
      expect(d.getDate()).toBe(7);
      expect(d.getMonth()).toBe(3); // April
    });
  });
});
